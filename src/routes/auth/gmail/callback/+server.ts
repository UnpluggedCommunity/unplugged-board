import { redirect } from '@sveltejs/kit';
import { handleCallback } from '$lib/server/gmail';
import { safeNext } from '$lib/server/safe-next';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const { ok, next } = await handleCallback(url, cookies);
	const back = new URL(safeNext(next, '/me'), url.origin);
	back.searchParams.set('gmail', ok ? 'connected' : 'denied');
	redirect(303, back.pathname + back.search);
};
