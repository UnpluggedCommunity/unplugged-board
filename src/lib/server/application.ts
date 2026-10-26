/** AI-written job applications, built only from the member's own profile. */
import { BILLS, EMPLOYMENT_TYPES, jobCategory, zoneLabel } from '$lib/constants';
import { formatPay, labelOf, startText, type Listing } from '$lib/format';
import { ENGLISH_LEVELS, GOALS, LICENCES, VISA_TYPES, type JobProfile } from '$lib/profile';
import { generateJson, type AiResult } from './ai';

export interface ApplicationDraft {
	subject: string;
	email: string;
	message: string;
	notes: string[];
}

const SYSTEM = `You write job applications for backpackers and working holiday makers in Australia, on behalf of the applicant. You receive the applicant's profile and a job ad.

Content rules
- Use ONLY facts from the applicant profile. Never invent experience, dates, companies, tickets, numbers or skills. If something is not in the profile, leave it out.
- Put the most relevant experience and skills first and connect them to what the ad asks for.
- Show that the applicant is motivated, reliable and hard-working, with concrete facts, not adjectives alone.
- If the applicant lacks a requirement, don't hide it or inflate it: say it honestly, then stress that they have worked in different industries and learn fast.
- Mention current tickets. Planned tickets only as plans ("I'm planning to get my First Aid").
- Mention the visa type and expiry date when given. If the goal is long-term work or sponsorship, say it naturally and link it to the job location.
- Mention driver licence and own car when given. If the job is outside the applicant's current area and they are willing to relocate, say they are ready to move.
- Describe the English level honestly, without apologising (e.g. "My English isn't perfect, but I communicate clearly on the job").
- No clichés ("I am writing to express my interest", "dynamic team", "passionate"), no emojis.

Form
- Australian English. Direct, warm and professional. Short sentences.
- Greeting: "Hi <first name>," when a contact name is given, otherwise "Hi,".
- Email structure: (1) which role and that they saw the ad; (2) 2–4 short bullet points with the most relevant experience and skills; (3) reliability and availability; (4) one short paragraph with visa, licence/car, tickets, English; (5) close: CV attached, available for a call or a trial.
- 170–260 words. Plain text, bullets with "- ".
- Sign-off: "Thanks," or "Kind regards," and the full name on the next line. Do NOT add phone or email: they are appended automatically.
- Subject: "<Role> – <Full name>", add the suburb/town when useful.
- "message": a shorter version (70–110 words) for WhatsApp or SMS: no subject, no bullets, mention the CV can be sent right away.
- "notes": up to 3 short tips for the applicant (in English): requirements from the ad they don't seem to meet, or warnings (casual/agency/FIFO job, far from their area, 6-month limit with one employer on a 417/462 visa). Empty array if nothing to say.`;

const SCHEMA = {
	type: 'object',
	properties: {
		subject: { type: 'string' },
		email: { type: 'string' },
		message: { type: 'string' },
		notes: { type: 'array', items: { type: 'string' } }
	},
	required: ['subject', 'email', 'message', 'notes']
};

/** "2027-08-30" → "August 2027" (used for visa and availability dates). */
const monthYear = (d: string | null) =>
	d ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : null;
const dayMonth = (d: string | null) =>
	d ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', timeZone: 'UTC' }) : null;

const LICENCE_PHRASE: Record<string, string> = {
	overseas: 'an overseas driver licence',
	C: 'an Australian driver licence (C class)',
	LR: 'a Light Rigid (LR) licence',
	MR: 'a Medium Rigid (MR) licence',
	HR: 'a Heavy Rigid (HR) licence',
	HC: 'a Heavy Combination (HC) licence'
};

function describeProfile(p: JobProfile) {
	const lines = [
		`Full name: ${p.full_name ?? ''}`,
		p.suburb && `Lives in: ${p.suburb}`,
		p.visa_type && `Visa: ${labelOf(VISA_TYPES, p.visa_type)}${p.visa_expiry ? `, valid until ${monthYear(p.visa_expiry)}` : ''}`,
		p.available_from && `Available from: ${dayMonth(p.available_from)}`,
		p.goal && `Looking for: ${labelOf(GOALS, p.goal)}`,
		p.licence && `Driver licence: ${labelOf(LICENCES, p.licence)}`,
		p.own_car != null && `Own car: ${p.own_car ? 'yes' : 'no'}`,
		p.relocate != null && `Willing to relocate: ${p.relocate ? 'yes' : 'no'}`,
		p.tickets.length && `Tickets: ${p.tickets.join(', ')}`,
		p.planned_tickets.length && `Planned tickets/courses: ${p.planned_tickets.join(', ')}`,
		p.education && `Education: ${p.education}`,
		p.english_level && `English: ${labelOf(ENGLISH_LEVELS, p.english_level)}`,
		p.languages && `Other languages: ${p.languages}`,
		p.strengths && `Strengths (own words): ${p.strengths}`,
		p.about && `About (own words): ${p.about}`,
		'Experience:',
		...p.experience
			.filter((e) => e.role)
			.map((e) => `- ${e.role}${e.company ? `, ${e.company}` : ''}${e.place ? `, ${e.place}` : ''}${e.dates ? ` (${e.dates})` : ''}${e.details ? `: ${e.details}` : ''}`)
	];
	return lines.filter(Boolean).join('\n');
}

function describeListing(l: Listing, contactName: string | null) {
	const lines = [
		`Role: ${l.title}`,
		jobCategory(l.job_category) && `Category: ${jobCategory(l.job_category)!.label}`,
		(l.suburb || l.zone) && `Location: ${[l.suburb, zoneLabel(l.zone)].filter(Boolean).join(', ')}`,
		formatPay(l) && `Pay: ${formatPay(l)}`,
		l.employment_type && `Employment: ${labelOf(EMPLOYMENT_TYPES, l.employment_type)}`,
		startText(l),
		l.hours_text && `Hours: ${l.hours_text}`,
		l.req_tickets.length && `Tickets required: ${l.req_tickets.join(', ')}`,
		l.req_own_car && 'Own car required',
		l.req_experience && `Experience: ${l.req_experience}`,
		l.req_english && `English: ${l.req_english}`,
		l.accommodation_text && `Accommodation: ${l.accommodation_text}`,
		l.summary && `Ad summary: ${l.summary}`,
		contactName && `Contact name: ${contactName}`
	];
	return lines.filter(Boolean).join('\n');
}

export async function writeApplication(
	profile: JobProfile,
	listing: Listing,
	contactName: string | null
): Promise<AiResult<ApplicationDraft>> {
	const today = new Date().toLocaleDateString('en-AU', { timeZone: 'Australia/Perth', dateStyle: 'long' });
	const result = await generateJson<ApplicationDraft>({
		system: SYSTEM,
		prompt: `Today is ${today}.\n\nAPPLICANT PROFILE\n${describeProfile(profile)}\n\nJOB AD\n${describeListing(listing, contactName)}`,
		schema: SCHEMA,
		temperature: 0.6
	});
	if (result.ok && (!result.data.email || !result.data.subject)) {
		return { ok: false, reason: 'error', detail: 'Empty draft' };
	}
	if (result.ok) {
		// Contact details never go to the AI: we add them here.
		const contact = [profile.phone, profile.email].filter(Boolean).join('\n');
		if (contact) result.data.email = `${result.data.email.trimEnd()}\n${contact}`;
	}
	return result;
}

/** No-AI fallback: a plain but correct application built from the profile. */
export function templateApplication(p: JobProfile, l: Listing, contactName: string | null): ApplicationDraft {
	const name = p.full_name ?? '';
	const first = contactName?.trim().split(/\s+/)[0];
	const where = l.suburb ? ` in ${l.suburb}` : '';
	const jobs = p.experience.filter((e) => e.role).slice(0, 3);
	const facts = [
		p.visa_type && `I'm on a ${labelOf(VISA_TYPES, p.visa_type)} visa${p.visa_expiry ? ` valid until ${monthYear(p.visa_expiry)}` : ''}.`,
		p.licence && LICENCE_PHRASE[p.licence] && `I hold ${LICENCE_PHRASE[p.licence]}${p.own_car ? ' and have my own car' : ''}.`,
		p.tickets.length && `Tickets: ${p.tickets.join(', ')}.`,
		p.available_from && `I'm available from ${dayMonth(p.available_from)}.`
	].filter(Boolean);
	const sign = [name, p.phone, p.email].filter(Boolean).join('\n');
	const email = [
		first ? `Hi ${first},` : 'Hi,',
		'',
		`I saw your ad for the ${l.title} position${where} and I'd like to apply.`,
		...(jobs.length
			? ['', 'Relevant experience:', ...jobs.map((e) => `- ${e.role}${e.company ? `, ${e.company}` : ''}${e.place ? ` (${e.place})` : ''}`)]
			: []),
		...(p.strengths ? ['', p.strengths] : []),
		...(facts.length ? ['', facts.join(' ')] : []),
		'',
		`My CV is attached. I'm happy to come in for a chat or a trial shift${p.phone ? ` — you can reach me on ${p.phone}` : ''}.`,
		'',
		'Thanks,',
		sign
	].join('\n');
	const message = [
		first ? `Hi ${first},` : 'Hi,',
		`I'm ${name} and I saw your ad for the ${l.title} job${where}.`,
		jobs[0] ? `I have experience as ${jobs[0].role}${jobs[0].company ? ` at ${jobs[0].company}` : ''}.` : '',
		facts.slice(0, 2).join(' '),
		'I can send my CV right away. Thanks!'
	]
		.filter(Boolean)
		.join(' ');
	return { subject: `${l.title}${l.suburb ? ` – ${l.suburb}` : ''} – ${name}`, email, message, notes: [] };
}
