/**
 * Hands the browser a generated text file to save.
 *
 * Web only: on native there is no download folder to put a file into, so callers hide the
 * option there rather than getting a silent no-op.
 */
export function downloadTextFileOnWeb(fileName: string, content: string, mimeType: string): void {
	const blobUrl = URL.createObjectURL(new Blob([content], { type: `${mimeType};charset=utf-8` }));
	const link = document.createElement('a');
	link.href = blobUrl;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	// Safari needs the URL to outlive the click; a tick is enough and keeps the blob from leaking.
	setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
}
