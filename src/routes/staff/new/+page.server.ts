import { fail, redirect } from '@sveltejs/kit';
import type { ListingType } from '$lib/constants';
import { toFormValues } from '$lib/fields';
import { aiConfigured } from '$lib/server/ai';
import { extractListing } from '$lib/server/extract';
import { findSimilar } from '$lib/server/listings';
import { saveListing } from '$lib/server/save';
import type { Actions, PageServerLoad } from './$types';

const asType = (v: unknown): ListingType | null => (v === 'room' ? 'room' : v === 'job' ? 'job' : null);
const MAX_SHOTS = 6;

function toBase64(buffer: ArrayBuffer) {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(binary);
}

export const load: PageServerLoad = async ({ url }) => {
	const type = asType(url.searchParams.get('type')) ?? 'job';
	return { type, initial: toFormValues(type, {}), aiReady: aiConfigured() };
};

export const actions: Actions = {
	/** Read screenshots / a flyer with the AI. Nothing is stored. */
	extract: async ({ locals, request }) => {
		const form = await request.formData();
		const hint = asType(form.get('hint'));
		const shots = form
			.getAll('shots')
			.filter((f): f is File => f instanceof File && f.size > 0 && f.type.startsWith('image/'))
			.slice(0, MAX_SHOTS);
		if (!shots.length) return fail(400, { extractError: 'Add at least one screenshot or flyer.' });
		if (shots.some((f) => f.size > 4 * 1024 * 1024)) return fail(400, { extractError: 'One image is too big (max 4 MB).' });

		const images = await Promise.all(
			shots.map(async (f) => ({ mimeType: f.type, base64: toBase64(await f.arrayBuffer()) }))
		);
		const result = await extractListing(images, hint);
		if (!result.ok) {
			return fail(result.reason === 'quota' ? 429 : 502, {
				extractError:
					result.reason === 'not_configured'
						? 'The AI is not switched on (GEMINI_API_KEY missing). Fill the form by hand or use Paste JSON.'
						: result.reason === 'quota'
							? "Today's free AI quota is used up. Fill the form by hand or use Paste JSON (Claude)."
							: "The AI couldn't read these images. Try clearer screenshots, or fill the form by hand."
			});
		}
		const similar = await findSimilar(locals.supabase, { type: result.data.type, ...result.data.listing });
		return { extraction: result.data, similar };
	},

	save: async ({ locals, request }) => {
		const me = (await locals.getMe())!;
		const form = await request.formData();
		const type = asType(form.get('listing_type')) ?? 'job';
		const result = await saveListing(locals.supabase, me.id, type, form, null);
		if (result.error) return result.error;
		redirect(303, `${type === 'job' ? '/j' : '/r'}/${result.id}`);
	}
};
