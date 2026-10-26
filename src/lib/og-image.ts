/**
 * Share-card image (1200×630) for one listing, drawn in the browser at publish time
 * and stored once — so WhatsApp shows a branded card instead of a bare link.
 */
import { jobCategory, zoneLabel } from './constants';
import { formatPrice, startText, type Listing } from './format';

const W = 1200;
const H = 630;

function loadImage(src: string) {
	return new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});
}

/** Break text into lines that fit `maxWidth`, at most `maxLines` (last one gets an ellipsis). */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
	const words = text.split(/\s+/);
	const lines: string[] = [];
	let line = '';
	for (const word of words) {
		const test = line ? `${line} ${word}` : word;
		if (ctx.measureText(test).width <= maxWidth || !line) line = test;
		else {
			lines.push(line);
			line = word;
		}
	}
	if (line) lines.push(line);
	if (lines.length > maxLines) {
		lines.length = maxLines;
		let last = lines[maxLines - 1];
		while (ctx.measureText(last + '…').width > maxWidth && last.length) last = last.slice(0, -1);
		lines[maxLines - 1] = last + '…';
	}
	return lines;
}

function chip(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, gold: boolean) {
	ctx.font = '600 30px "IBM Plex Mono", monospace';
	const w = ctx.measureText(text).width + 44;
	ctx.fillStyle = gold ? 'rgba(245,194,122,0.14)' : '#1d1b19';
	ctx.strokeStyle = gold ? '#7a5d36' : '#3a3530';
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.roundRect(x, y, w, 60, 30);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = gold ? '#F5C27A' : '#F4EFE6';
	ctx.fillText(text, x + 22, y + 40);
	return w;
}

export async function drawShareCard(l: Listing): Promise<Blob> {
	await Promise.all([
		document.fonts.load('80px Anton'),
		document.fonts.load('600 30px "IBM Plex Mono"')
	]).catch(() => {});

	const canvas = document.createElement('canvas');
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext('2d')!;

	// Background: near-black with a red glow top-left and gold glow bottom-right
	ctx.fillStyle = '#0A0A0A';
	ctx.fillRect(0, 0, W, H);
	let g = ctx.createRadialGradient(0, 0, 0, 0, 0, 700);
	g.addColorStop(0, 'rgba(228,0,43,0.22)');
	g.addColorStop(1, 'rgba(228,0,43,0)');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, W, H);
	g = ctx.createRadialGradient(W, H, 0, W, H, 600);
	g.addColorStop(0, 'rgba(245,194,122,0.12)');
	g.addColorStop(1, 'rgba(245,194,122,0)');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, W, H);

	const pad = 72;
	try {
		const logo = await loadImage('/logo-720.webp');
		const lw = 300;
		ctx.drawImage(logo, pad - 6, 56, lw, (logo.height / logo.width) * lw);
	} catch {
		/* no logo: still a valid card */
	}

	// Kicker
	const kicker = (l.type === 'room' ? 'ROOM' : (jobCategory(l.job_category)?.label ?? 'JOB')).toUpperCase();
	ctx.font = '600 28px "IBM Plex Mono", monospace';
	ctx.fillStyle = '#F5C27A';
	ctx.fillText(kicker, pad, 190);

	// Title
	ctx.font = '84px Anton, Impact, sans-serif';
	ctx.fillStyle = '#F4EFE6';
	const lines = wrap(ctx, l.title.toUpperCase(), W - pad * 2, 2);
	lines.forEach((t, i) => ctx.fillText(t, pad, 290 + i * 92));

	// Chips: price · place · start
	let x = pad;
	const y = 290 + lines.length * 92 + 10;
	const price = formatPrice(l);
	const where = l.suburb || zoneLabel(l.zone);
	const when = startText(l);
	if (price) x += chip(ctx, x, y, price, true) + 14;
	if (where) x += chip(ctx, x, y, where, false) + 14;
	if (when && x < W - 300) chip(ctx, x, y, when, false);

	// Footer
	ctx.fillStyle = '#F5C27A';
	ctx.fillRect(0, H - 10, W, 10);
	ctx.font = '600 26px "IBM Plex Mono", monospace';
	ctx.fillStyle = '#a59d90';
	ctx.fillText(`${location.host} · Arrive alone. Leave with a crew.`, pad, H - 40);

	return new Promise((resolve, reject) =>
		canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas'))), 'image/jpeg', 0.86)
	);
}
