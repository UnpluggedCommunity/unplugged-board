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

// --- Sending ----------------------------------------------------------------

/**
 * Send a complete RFC 822 message (built in the browser) through the Gmail media-upload
 * endpoint. The Worker only forwards the bytes.
 */
export async function sendRawGmail(
	token: string,
	message: ArrayBuffer
): Promise<{ ok: true } | { ok: false; error: 'reconnect' | 'quota' | 'failed' }> {
	// GMAIL_SEND_URL: only for local tests against a fake server
	const url = env.GMAIL_SEND_URL || 'https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=media';
	const res = await fetch(url, {
		method: 'POST',
		headers: { authorization: `Bearer ${token}`, 'content-type': 'message/rfc822' },
		body: message
	}).catch(() => null);
	if (res?.ok) return { ok: true };
	if (!res) return { ok: false, error: 'failed' };
	console.error('gmail send', res.status, (await res.text().catch(() => '')).slice(0, 300));
	if (res.status === 401 || res.status === 403) return { ok: false, error: 'reconnect' };
	if (res.status === 429) return { ok: false, error: 'quota' };
	return { ok: false, error: 'failed' };
}
