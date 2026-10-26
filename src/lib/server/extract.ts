/**
 * Quick Add: read screenshots / flyers of a listing with the AI and return
 * structured fields. Same rules as extraction-prompt.md (keep them in sync).
 * Screenshots are only sent to the AI, never stored.
 */
import { FIELDS } from '$lib/fields';
import type { ListingType } from '$lib/constants';
import { generateJson, type AiResult } from './ai';

export interface Extraction {
	type: ListingType;
	listing: Record<string, unknown>;
	uncertain: string[];
	warnings: string[];
}

const SYSTEM = `You extract job and room listings for Unplugged Board, a noticeboard for backpackers in Perth, Western Australia. You receive one or more images of ONE listing: screenshots of a Facebook post (a long post can be split across several screenshots — read them in order as one post) or a flyer/poster made by the employer.

Rules
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

const SCHEMA = {
	type: 'OBJECT',
	properties: {
		type: { type: 'STRING', enum: ['job', 'room'] },
		listing: listingSchema(),
		uncertain: { type: 'ARRAY', items: { type: 'STRING' } },
		warnings: { type: 'ARRAY', items: { type: 'STRING' } }
	},
	required: ['type', 'listing', 'uncertain', 'warnings']
};

export async function extractListing(
	images: { mimeType: string; base64: string }[],
	hint: ListingType | null
): Promise<AiResult<Extraction>> {
	const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Perth' });
	const result = await generateJson<Extraction>({
		system: SYSTEM,
		prompt:
			`Today's date in Perth is ${today}. ` +
			(hint ? `The staff says this is a ${hint} listing. ` : 'Detect whether this is a job or a room. ') +
			`Extract the listing from the ${images.length} image(s).`,
		schema: SCHEMA,
		images,
		temperature: 0.1
	});
	if (result.ok) {
		const d = result.data;
		if (d.type !== 'job' && d.type !== 'room') d.type = hint ?? 'job';
		d.listing ??= {};
		d.uncertain = Array.isArray(d.uncertain) ? d.uncertain : [];
		d.warnings = Array.isArray(d.warnings) ? d.warnings : [];
	}
	return result;
}
