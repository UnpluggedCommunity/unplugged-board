/**
 * Email sending adapter (Brevo free plan: 300 emails/day, no card).
 * Only this file knows about the provider.
 */
import { env } from '$env/dynamic/private';

export interface OutgoingEmail {
	to: string;
	replyTo: { email: string; name: string };
	fromName: string;
	subject: string;
	text: string;
	bccSelf?: string;
	attachment?: { name: string; base64: string };
}

export const emailConfigured = () => Boolean(env.BREVO_API_KEY && env.EMAIL_FROM);

export async function sendEmail(mail: OutgoingEmail): Promise<{ ok: true } | { ok: false; error: string }> {
	if (!emailConfigured()) return { ok: false, error: 'not_configured' };
	const res = await fetch('https://api.brevo.com/v3/smtp/email', {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'api-key': env.BREVO_API_KEY!, accept: 'application/json' },
		body: JSON.stringify({
			sender: { name: mail.fromName, email: env.EMAIL_FROM },
			to: [{ email: mail.to }],
			replyTo: mail.replyTo,
			...(mail.bccSelf ? { bcc: [{ email: mail.bccSelf }] } : {}),
			subject: mail.subject,
			textContent: mail.text,
			...(mail.attachment ? { attachment: [{ name: mail.attachment.name, content: mail.attachment.base64 }] } : {})
		})
	}).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }) as Response);
	if (res.ok) return { ok: true };
	const detail = await res.text().catch(() => '');
	console.error('brevo', res.status, detail.slice(0, 500));
	return { ok: false, error: res.status === 429 ? 'quota' : 'send_failed' };
}
