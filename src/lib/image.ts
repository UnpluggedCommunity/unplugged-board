/** Resize + re-encode an image in the browser before upload. */
export async function compressImage(
	file: File,
	{ maxSide, type, quality }: { maxSide: number; type: 'image/webp' | 'image/jpeg'; quality: number }
): Promise<File> {
	const bitmap = await createImageBitmap(file);
	const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();
	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
	if (!blob) return file;
	// Safari can't encode WebP: it silently returns PNG — fall back to JPEG then.
	if (type === 'image/webp' && blob.type !== 'image/webp') {
		return compressImage(file, { maxSide, type: 'image/jpeg', quality });
	}
	const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
	return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.' + ext, { type: blob.type });
}
