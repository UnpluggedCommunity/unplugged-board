import { error, fail, redirect } from '@sveltejs/kit';
import { missingForApply } from '$lib/profile';
import { aiConfigured } from '$lib/server/ai';
import { templateApplication, writeApplication } from '$lib/server/application';
import { forgetGmail, gmailConfigured, gmailToken, sendGmail } from '$lib/server/gmail';
import { loadListing } from '$lib/server/listings';
import { loadCvs, loadJobProfile } from '$lib/server/profile';
import type { Actions, PageServerLoad } from './$types';

const AI_DAILY_LIMIT = 15;
const SEND_DAILY_LIMIT = 10;

type Channel = 'email' | 'phone' | 'link' | 'none';

async function context(event: { locals: App.Locals; params: { id: string }; url: URL }) {
	const { locals, params, url } = event;
	const me = await locals.getMe();
	if (!me) redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
	if (!me.isMember) redirect(303, `/join?next=${encodeURIComponent(url.pathname)}`);
	const { listing, contact } = await loadListing(locals.supabase, 'job', params.id, true);
	const channel: Channel = contact?.contact_email
		? 'email'
		: contact?.contact_phone
			? 'phone'
			: contact?.apply_url
				? 'link'
				: 'none';
	return { me, listing, contact, channel };
}

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

	/** Send from the member's own Gmail, with the CV attached. */
	send: async (event) => {
		const { me, listing, contact } = await context(event);
		const supabase = event.locals.supabase;
		const form = await event.request.formData();
		const subject = String(form.get('subject') ?? '').trim().slice(0, 200);
		const body = String(form.get('body') ?? '').trim().slice(0, 5000);
		const cvId = String(form.get('cv_id') ?? '');

		// Only ever to the listing's own contact — the form can't choose the recipient.
		const to = contact?.contact_email;
		if (!to) return fail(400, { message: 'This job has no email address.' });
		if (subject.length < 3 || body.length < 40) return fail(400, { message: 'Write the subject and the message first.' });

		const token = gmailToken(event.cookies);
		if (!token) return fail(401, { reconnect: true, message: 'Connect your Gmail to send.' });

		const [{ count: today }, { count: already }] = await Promise.all([
			supabase
				.from('applications')
				.select('id', { count: 'exact', head: true })
				.eq('user_id', me.id)
				.eq('sent_by_platform', true)
				.gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
			supabase
				.from('applications')
				.select('id', { count: 'exact', head: true })
				.eq('user_id', me.id)
				.eq('listing_id', listing.id)
				.eq('sent_by_platform', true)
		]);
		if ((already ?? 0) > 0) return fail(400, { message: "You've already applied to this job by email." });
		if ((today ?? 0) >= SEND_DAILY_LIMIT) {
			return fail(429, { message: `You can send up to ${SEND_DAILY_LIMIT} applications a day from Unplugged.` });
		}

		const { data: cv } = await supabase
			.from('cvs')
			.select('id, file_path')
			.eq('id', cvId)
			.eq('user_id', me.id)
			.maybeSingle();
		if (!cv) return fail(400, { message: 'Choose a CV to attach.' });
		const { data: file } = await supabase.storage.from('cvs').download(cv.file_path);
		if (!file) return fail(500, { message: 'Could not read your CV. Try uploading it again.' });

		const profile = await loadJobProfile(supabase, me.id);
		const ext = cv.file_path.split('.').pop();
		const sent = await sendGmail(token, {
			to,
			subject,
			text: body,
			attachment: {
				name: `${profile?.full_name ?? 'CV'} - CV.${ext}`,
				mimeType: file.type || 'application/pdf',
				bytes: new Uint8Array(await file.arrayBuffer())
			}
		});
		if (!sent.ok) {
			if (sent.error === 'reconnect') {
				forgetGmail(event.cookies);
				return fail(401, { reconnect: true, message: 'Your Gmail connection expired — connect again and send.' });
			}
			return fail(502, {
				message:
					sent.error === 'quota'
						? 'Gmail says you are sending too fast. Try again in a few minutes.'
						: 'The email could not be sent. Try again, or use "Open email app" below.'
			});
		}

		await supabase.from('applications').insert({
			user_id: me.id,
			listing_id: listing.id,
			listing_title: listing.title,
			cv_id: cv.id,
			channel: 'email',
			recipient: to,
			subject,
			body,
			sent_by_platform: true
		});
		return { sent: true, to };
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
