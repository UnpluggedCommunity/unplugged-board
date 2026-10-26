import { error, json } from '@sveltejs/kit';
import type { ListingType } from '$lib/constants';
import { extractListings, MAX_IMAGES } from '$lib/server/extract';
import { findSimilar } from '$lib/server/listings';
import type { RequestHandler } from './$types';

const MAX_BYTES = 18 * 1024 * 1024; // Gemini accepts ~20 MB of inline data per request

/**
 * Quick Add: the browser sends the numbered images already encoded as Gemini JSON parts.
 * We only check them lightly and pass the bytes through (no per-byte work in the Worker).
 */
export const POST: RequestHandler = async ({ locals, request, url }) => {
	const me = await locals.getMe();
	if (!me?.isStaff) error(403, 'Staff only');

	const count = Number(url.searchParams.get('count'));
	if (!Number.isInteger(count) || count < 1 || count > MAX_IMAGES) error(400, `Send 1–${MAX_IMAGES} images.`);
	const hintParam = url.searchParams.get('hint');
	const hint: ListingType | null = hintParam === 'job' || hintParam === 'room' ? hintParam : null;

	const parts = await request.arrayBuffer();
	if (parts.byteLength > MAX_BYTES) error(413, 'Too much data — use fewer or smaller images.');
	const start = new TextDecoder().decode(parts.slice(0, 32));
	if (!start.startsWith('{"text":"Image 1"}')) error(400, 'Unexpected upload format.');

	const result = await extractListings(parts, count, hint);
	if (!result.ok) {
		const message =
			result.reason === 'not_configured'
				? 'The AI is not switched on (GEMINI_API_KEY missing). Fill the form by hand or use Paste JSON.'
				: result.reason === 'quota'
					? "Today's free AI quota is used up. Fill the form by hand or use Paste JSON (Claude)."
					: "The AI couldn't read these images. Try clearer screenshots, or fewer at a time.";
		return json({ ok: false, message }, { status: result.reason === 'quota' ? 429 : 502 });
	}

	const listings = await Promise.all(
		result.data.listings.map(async (l) => ({
			...l,
			similar: await findSimilar(locals.supabase, { type: l.type, ...l.listing })
		}))
	);
	return json({ ok: true, listings, unused: result.data.unused });
};
