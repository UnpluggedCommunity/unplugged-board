/** Browser side of Quick Add: encode images as Gemini JSON parts (heavy work stays off the Worker). */
import { compressImage } from './image';

async function toBase64(file: Blob): Promise<string> {
	const dataUrl = await new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
	return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

/** Images resized for reading (text stays sharp at 1600 px). */
export const prepareForAi = (file: File) =>
	compressImage(file, { maxSide: 1600, type: 'image/jpeg', quality: 0.82 });

/** `{"text":"Image 1"},{"inline_data":{…}},{"text":"Image 2"},…` */
export async function buildParts(images: Blob[]): Promise<Blob> {
	const chunks: string[] = [];
	for (const [i, img] of images.entries()) {
		if (i) chunks.push(',');
		chunks.push(`{"text":"Image ${i + 1}"},{"inline_data":{"mime_type":"image/jpeg","data":"${await toBase64(img)}"}}`);
	}
	return new Blob(chunks, { type: 'application/json' });
}
