import { error, fail, redirect } from '@sveltejs/kit';
import { missingForApply } from '$lib/profile';
import { aiConfigured } from '$lib/server/ai';
import { templateApplication, writeApplication } from '$lib/server/application';
import { gmailConfigured, gmailToken } from '$lib/server/gmail';
import { loadCvs, loadJobProfile } from '$lib/server/profile';
import { context } from '$lib/server/apply';
import type { Actions, PageServerLoad } from './$types';

const AI_DAILY_LIMIT = 15;

export const load: PageServerLoad = async (event) => {
	const { me, listing, contact, channel } = await context(event);
	const supabase = event.locals.supabase;
	const [profile, cvs, { data: previous }] = await Promise.all([
		loadJobProfile(supabase, me.id),
		loadCvs(supabase, me.id),
		supabase
			.from('applications')
			.select('created_at, channel, sent_by_platform')
			.eq('user_id', me.id)
			.eq('listing_id', listing.id)
			.order('created_at', { ascending: false })
			.limit(1)
	]);
	const suggested = cvs.find((c) => listing.job_category && c.categories.includes(listing.job_category)) ?? cvs[0] ?? null;
	return {
		listing,
		channel,
		contactName: contact?.contact_name ?? null,
		phone: contact?.contact_phone ?? null,
		applyUrl: contact?.apply_url ?? null,
		recipient: contact?.contact_email ?? null,
		profile,
		missing: missingForApply(profile),
		cvs: cvs.map(({ id, label, categories, file_name }) => ({ id, label, categories, file_name })),
		suggestedCv: suggested?.id ?? null,
		previous: previous?.[0] ?? null,
		gmailReady: gmailConfigured(),
		gmailConnected: Boolean(gmailToken(event.cookies)),
		aiReady: aiConfigured()
	};
};

export const actions: Actions = {
	/** Write the application (AI, or the plain template as fallback). */
	draft: async (event) => {
		const { me, listing, contact } = await context(event);
		const supabase = event.locals.supabase;
		const profile = await loadJobProfile(supabase, me.id);
		if (!profile || missingForApply(profile).length) {
			return fail(400, { message: 'Finish your job profile first.' });
		}
		const contactName = contact?.contact_name ?? null;

		if (aiConfigured()) {
			const { data: allowed } = await supabase.rpc('use_ai_quota', { daily_limit: AI_DAILY_LIMIT });
			if (allowed) {
				const ai = await writeApplication(profile, listing, contactName);
				if (ai.ok) return { draft: ai.data, source: 'ai' as const };
				return {
					draft: templateApplication(profile, listing, contactName),
					source: 'template' as const,
					notice:
						ai.reason === 'quota'
							? "The AI is busy today (free quota used up), so here's a simple version — edit it before sending."
							: "The AI didn't answer, so here's a simple version — edit it before sending."
				};
			}
			return {
				draft: templateApplication(profile, listing, contactName),
				source: 'template' as const,
				notice: `You've used your ${AI_DAILY_LIMIT} AI drafts for today, so here's a simple version to edit.`
			};
		}
		return { draft: templateApplication(profile, listing, contactName), source: 'template' as const };
	},

	/** Record an application sent by the member themselves (WhatsApp, SMS, link, own email). */
	log: async (event) => {
		const { me, listing } = await context(event);
		const form = await event.request.formData();
		const channel = String(form.get('channel'));
		if (!['email', 'whatsapp', 'sms', 'link', 'manual'].includes(channel)) error(400, 'Bad channel');
		const cvId = String(form.get('cv_id') ?? '') || null;
		await event.locals.supabase.from('applications').insert({
			user_id: me.id,
			listing_id: listing.id,
			listing_title: listing.title,
			cv_id: cvId,
			channel,
			subject: String(form.get('subject') ?? '').slice(0, 200) || null,
			body: String(form.get('body') ?? '').slice(0, 5000) || null,
			sent_by_platform: false
		});
		return { logged: channel };
	}
};
