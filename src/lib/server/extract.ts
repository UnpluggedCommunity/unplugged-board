/**
 * Quick Add: read screenshots / flyers of a listing with the AI and return
 * structured fields. Same rules as extraction-prompt.md (keep them in sync).
 * Screenshots are only sent to the AI, never stored.
 */
import { FIELDS } from '$lib/fields';
import type { ListingType } from '$lib/constants';
import { generateJsonWithParts, type AiResult } from './ai';

export interface Extraction {
	type: ListingType;
	listing: Record<string, unknown>;
	uncertain: string[];
	warnings: string[];
	/** 1-based image numbers used to read this listing. */
	screenshots: number[];
	/** 1-based image numbers that are real photos of this room/item (to publish). */
	photos: number[];
}

export interface BatchExtraction {
	listings: Extraction[];
	/** Images not used for any listing (blurry, unrelated, photos not matched). */
	unused: number[];
}

export const MAX_IMAGES = 24;

const SYSTEM = `You extract job and room listings for Unplugged Board, a noticeboard for backpackers in Perth, Western Australia.

You receive several numbered images ("Image 1", "Image 2", …), uploaded in order by the staff. They can be:
- screenshots of Facebook posts — a long post can be split across several consecutive screenshots;
- flyers/posters made by an employer;
- real photos of a room or an item for sale (no text overlay, no Facebook interface).

Step 1 — Group. Work out how many DIFFERENT listings there are. Screenshots belong to the same listing when they continue the same post (same author and time, text continues, same job/room). Never merge two different jobs or rooms into one listing, and never split one post into two.
Step 2 — Photos. Attach each real photo to the listing it belongs to: usually the room post whose screenshots come right before it, or the one whose screenshot shows the same room. Only jobs never get photos. If you can't tell which room a photo belongs to, don't attach it (put it in "unused") and add a warning to the most likely listing.
Step 3 — Extract each listing with the rules below. List the image numbers you used in "screenshots" and the attached photos in "photos".

Rules for every listing
1. Never invent data. If something is not clearly written in the images, use null. A guess is worse than null.
2. Write everything in clear, simple English, even if the post is in another language.
3. Money is always AUD, numbers only.
4. Rooms: rent is always per week. If a monthly price is given, convert it (monthly × 12 ÷ 52, rounded) and set rent_from_month true.
5. title: short and specific (max ~6 words). Jobs: the role ("Labourer", "Barista"). Rooms: generate it if missing, e.g. "Single room in Scarborough".
6. summary: 2–3 sentences in your own words with the useful facts. No emojis, no hype, no contact details.
7. Privacy: don't include the name of the person who posted unless they are clearly the contact ("message Sarah"). Never describe people or profile pictures.
8. suburb: the suburb or town only. zone: one of the zone ids below based on the suburb/town; null if unsure.
9. posted_at: date of the post (YYYY-MM-DD) from the timestamp on the screenshot ("2d", "Yesterday", "3 Nov"), using today's date. null for flyers without a date.
10. whv_417: your proposal only. "likely" only for plant & animal cultivation, fishing & pearling, tree farming & felling, mining, construction, or bushfire/flood recovery work in a regional area (most of WA outside Perth metro). Hospitality/tourism only in remote and very remote areas. Perth metro jobs → "not_eligible". If unsure → "unknown".
11. Contacts: copy phone numbers, emails and links exactly as written. apply_url only for a real link to apply.
12. type: "job" or "room" — decide from the content.
13. uncertain: names of fields you filled but are not sure about (blurry, ambiguous, inferred).
14. warnings: short notes for the staff, especially scam signals: bond or deposit before viewing, price far below market (room under $150/week in Perth metro), payment by gift card or crypto, pressure to move to another app urgently, the poster being overseas, job that asks for money upfront.

Zone ids
Perth Metro: cbd (CBD & inner city), north (Northern Suburbs), south (Southern Suburbs, incl. Rockingham & Mandurah), east (Eastern Suburbs, incl. Midland & the hills), freo (Fremantle & Coast, incl. Cottesloe, Scarborough, Trigg up to Hillarys).
Regional WA: south-west (incl. Margaret River, Bunbury), wheatbelt, great-southern, pilbara-kimberley, goldfields, rest-wa.
Other states: nsw, vic, qld, sa, tas, nt, act.`;

const ZONE_IDS = ['cbd', 'north', 'south', 'east', 'freo', 'south-west', 'wheatbelt', 'great-southern', 'pilbara-kimberley', 'goldfields', 'rest-wa', 'nsw', 'vic', 'qld', 'sa', 'tas', 'nt', 'act'];

/** Gemini response schema generated from the form fields (jobs + rooms). */
function listingSchema() {
	const properties: Record<string, unknown> = {};
	for (const f of FIELDS) {
		if (!f.types.includes('job') && !f.types.includes('room')) continue;
		if (properties[f.name]) continue;
		let schema: Record<string, unknown>;
		switch (f.kind) {
			case 'number':
				schema = { type: 'NUMBER' };
				break;
			case 'bool':
				schema = { type: 'BOOLEAN' };
				break;
			case 'tags':
				schema = { type: 'ARRAY', items: { type: 'STRING' } };
				break;
			case 'select':
				schema = { type: 'STRING', enum: f.name === 'zone' ? ZONE_IDS : f.options!.map((o) => o.id) };
				break;
			default:
				schema = { type: 'STRING' };
		}
		properties[f.name] = { ...schema, nullable: true, description: f.hint ? `${f.label}. ${f.hint}` : f.label };
	}
	return { type: 'OBJECT', properties };
}

const INTS = { type: 'ARRAY', items: { type: 'INTEGER' } };
const STRINGS = { type: 'ARRAY', items: { type: 'STRING' } };

const SCHEMA = {
	type: 'OBJECT',
	properties: {
		listings: {
			type: 'ARRAY',
			items: {
				type: 'OBJECT',
				properties: {
					type: { type: 'STRING', enum: ['job', 'room'] },
					screenshots: INTS,
					photos: INTS,
					listing: listingSchema(),
					uncertain: STRINGS,
					warnings: STRINGS
				},
				required: ['type', 'screenshots', 'photos', 'listing', 'uncertain', 'warnings']
			}
		},
		unused: INTS
	},
	required: ['listings', 'unused']
};

/**
 * `parts` is the browser-built JSON fragment with the numbered images
 * (see src/lib/extract-client.ts); it is passed to the AI untouched.
 */
export async function extractListings(
	parts: ArrayBuffer,
	imageCount: number,
	hint: ListingType | null
): Promise<AiResult<BatchExtraction>> {
	const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Perth' });
	const result = await generateJsonWithParts<BatchExtraction>(
		{
			system: SYSTEM,
			prompt:
				`Today's date in Perth is ${today}. There are ${imageCount} images. ` +
				(hint ? `The staff says these are ${hint} listings. ` : 'Each listing can be a job or a room. ') +
				'Group them and extract every listing.',
			schema: SCHEMA,
			temperature: 0.1
		},
		parts
	);
	if (!result.ok) return result;

	// Sanitise: valid types, image numbers in range, each photo used once, no photos on jobs.
	const inRange = (n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= imageCount;
	const taken = new Set<number>();
	const listings = (Array.isArray(result.data.listings) ? result.data.listings : []).slice(0, 20).map((l) => {
		const type: ListingType = l.type === 'room' || l.type === 'job' ? l.type : (hint ?? 'job');
		const photos = type === 'job' ? [] : (Array.isArray(l.photos) ? l.photos : []).filter((n) => inRange(n) && !taken.has(n));
		photos.forEach((n) => taken.add(n));
		return {
			type,
			listing: l.listing ?? {},
			uncertain: Array.isArray(l.uncertain) ? l.uncertain : [],
			warnings: Array.isArray(l.warnings) ? l.warnings : [],
			screenshots: (Array.isArray(l.screenshots) ? l.screenshots : []).filter(inRange),
			photos
		};
	});
	const used = new Set(listings.flatMap((l) => [...l.screenshots, ...l.photos]));
	const unused = Array.from({ length: imageCount }, (_, i) => i + 1).filter((n) => !used.has(n));
	return { ok: true, data: { listings, unused } };
}
