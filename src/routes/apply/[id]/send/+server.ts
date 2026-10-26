import { error, json } from '@sveltejs/kit';
import { forgetGmail, gmailToken, sendRawGmail } from '$lib/server/gmail';
import { context } from '$lib/server/apply';
import type { RequestHandler } from './$types';

const SEND_DAILY_LIMIT = 10;
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Send the application from the member's Gmail. The browser builds the whole email
 * (text + CV); here we check who it goes to, enforce the limits and forward it.
 */
export const POST: RequestHandler = async (event) => {
	const { me, listing, contact } = await context(event);
	const supabase = event.locals.supabase;
	const to = contact?.contact_email;
	if (!to) error(400, 'This job has no email address.');

	const token = gmailToken(event.cookies);
	if (!token) return json({ ok: false, reconnect: true, message: 'Connect your Gmail to send.' }, { status: 401 });

	const cvId = event.url.searchParams.get('cv');
	const { data: cv } = await supabase.from('cvs').select('id').eq('id', cvId).eq('user_id', me.id).maybeSingle();
	if (!cv) return json({ ok: false, message: 'Choose a CV to attach.' }, { status: 400 });

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
	if ((already ?? 0) > 0) return json({ ok: false, message: "You've already applied to this job by email." }, { status: 400 });
	if ((today ?? 0) >= SEND_DAILY_LIMIT) {
		return json({ ok: false, message: `You can send up to ${SEND_DAILY_LIMIT} applications a day from Unplugged.` }, { status: 429 });
	}

	const message = await event.request.arrayBuffer();
	if (message.byteLength > MAX_BYTES) return json({ ok: false, message: 'The email is too big (CV over 2 MB?).' }, { status: 413 });
	// Only to the listing's own contact: the first header line must be exactly that.
	const head = new TextDecoder().decode(message.slice(0, 1024));
	if (!head.startsWith(`To: ${to}\r\n`)) error(400, 'Wrong recipient.');

	const sent = await sendRawGmail(token, message);
	if (!sent.ok) {
		if (sent.error === 'reconnect') {
			forgetGmail(event.cookies);
			return json({ ok: false, reconnect: true, message: 'Your Gmail connection expired — connect again and send.' }, { status: 401 });
		}
		return json(
			{
				ok: false,
				message:
					sent.error === 'quota'
						? 'Gmail says you are sending too fast. Try again in a few minutes.'
						: 'The email could not be sent. Try again, or use "Open email app".'
			},
			{ status: 502 }
		);
	}

	// Subject and text for "My applications" (small headers, base64url)
	const fromHeader = (name: string, max: number) => {
		try {
			const b64 = (event.request.headers.get(name) ?? '').replace(/-/g, '+').replace(/_/g, '/');
			return b64 ? new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))).slice(0, max) : null;
		} catch {
			return null;
		}
	};
	await supabase.from('applications').insert({
		user_id: me.id,
		listing_id: listing.id,
		listing_title: listing.title,
		cv_id: cv.id,
		channel: 'email',
		recipient: to,
		subject: fromHeader('x-subject', 200),
		body: fromHeader('x-body', 5000),
		sent_by_platform: true
	});
	return json({ ok: true, to });
};
