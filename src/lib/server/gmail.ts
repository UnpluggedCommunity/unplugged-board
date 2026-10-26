/**
 * Send applications from the member's own Gmail (scope gmail.send only:
 * Unplugged can send on their behalf but never read their mailbox).
 * The access token lives ~1 hour in an httpOnly cookie; no refresh token is kept.
 */
import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const TOKEN_COOKIE = 'gmail_at';
const STATE_COOKIE = 'gmail_state';

export const gmailConfigured = () => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

const redirectUri = (origin: string) => `${origin}/auth/gmail/callback`;

const cookieOptions = (url: URL, maxAge: number) => ({
	path: '/',
	httpOnly: true,
	secure: url.protocol === 'https:',
	sameSite: 'lax' as const,
	maxAge
});

/** Google consent URL; `next` is where to come back after granting access. */
export function authUrl(url: URL, cookies: Cookies, next: string, loginHint: string | null) {
	const state = crypto.randomUUID();
	cookies.set(STATE_COOKIE, JSON.stringify({ state, next }), cookieOptions(url, 600));
	const params = new URLSearchParams({
		client_id: env.GOOGLE_CLIENT_ID!,
		redirect_uri: redirectUri(url.origin),
		response_type: 'code',
		scope: GMAIL_SCOPE,
		access_type: 'online',
		include_granted_scopes: 'true',
		state
	});
	if (loginHint) params.set('login_hint', loginHint);
	return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/** Validate the callback, exchange the code and keep the token in a cookie. Returns `next`. */
export async function handleCallback(url: URL, cookies: Cookies): Promise<{ ok: boolean; next: string }> {
	const saved = cookies.get(STATE_COOKIE);
	cookies.delete(STATE_COOKIE, { path: '/' });
	let next = '/me';
	let expected = '';
	try {
		({ state: expected, next } = JSON.parse(saved ?? '{}'));
	} catch {
		/* ignore */
	}
	const code = url.searchParams.get('code');
	if (!code || !expected || url.searchParams.get('state') !== expected) return { ok: false, next };

	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			code,
			client_id: env.GOOGLE_CLIENT_ID!,
			client_secret: env.GOOGLE_CLIENT_SECRET!,
			redirect_uri: redirectUri(url.origin),
			grant_type: 'authorization_code'
		})
	});
	if (!res.ok) {
		console.error('gmail token', res.status, (await res.text()).slice(0, 300));
		return { ok: false, next };
	}
	const token = (await res.json()) as { access_token: string; expires_in: number; scope: string };
	if (!token.scope?.split(' ').includes(GMAIL_SCOPE)) return { ok: false, next };
	cookies.set(TOKEN_COOKIE, token.access_token, cookieOptions(url, Math.max(60, token.expires_in - 120)));
	return { ok: true, next };
}

export const gmailToken = (cookies: Cookies) => cookies.get(TOKEN_COOKIE) ?? null;
export const forgetGmail = (cookies: Cookies) => cookies.delete(TOKEN_COOKIE, { path: '/' });

// --- MIME -------------------------------------------------------------------

const utf8 = (s: string) => new TextEncoder().encode(s);

function base64(bytes: Uint8Array) {
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary);
}

const wrap = (b64: string) => b64.replace(/.{1,76}/g, '$&\r\n').trimEnd();
const header = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${base64(utf8(s))}?=`);
const asciiName = (s: string) => s.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/["\\]/g, '') || 'CV';

export interface GmailMessage {
	to: string;
	subject: string;
	text: string;
	attachment?: { name: string; mimeType: string; bytes: Uint8Array };
}

export async function sendGmail(
	token: string,
	msg: GmailMessage
): Promise<{ ok: true } | { ok: false; error: 'reconnect' | 'quota' | 'failed' }> {
	const boundary = `unplugged_${crypto.randomUUID()}`;
	const parts = [
		`To: ${msg.to}`,
		`Subject: ${header(msg.subject)}`,
		'MIME-Version: 1.0',
		`Content-Type: multipart/mixed; boundary="${boundary}"`,
		'',
		`--${boundary}`,
		'Content-Type: text/plain; charset="UTF-8"',
		'Content-Transfer-Encoding: base64',
		'',
		wrap(base64(utf8(msg.text)))
	];
	if (msg.attachment) {
		const name = asciiName(msg.attachment.name);
		parts.push(
			`--${boundary}`,
			`Content-Type: ${msg.attachment.mimeType}; name="${name}"`,
			`Content-Disposition: attachment; filename="${name}"`,
			'Content-Transfer-Encoding: base64',
			'',
			wrap(base64(msg.attachment.bytes))
		);
	}
	parts.push(`--${boundary}--`, '');
	const raw = base64(utf8(parts.join('\r\n'))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

	const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
		method: 'POST',
		headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
		body: JSON.stringify({ raw })
	}).catch(() => null);
	if (res?.ok) return { ok: true };
	if (!res) return { ok: false, error: 'failed' };
	console.error('gmail send', res.status, (await res.text().catch(() => '')).slice(0, 300));
	if (res.status === 401 || res.status === 403) return { ok: false, error: 'reconnect' };
	if (res.status === 429) return { ok: false, error: 'quota' };
	return { ok: false, error: 'failed' };
}
