/**
 * Prints one part of the current screen on the web.
 *
 * The node is cloned into a standalone document that carries a copy of the page's stylesheets,
 * opened in a new window and printed there. Printing the live page instead would drag the drawer,
 * the header and every fixed element onto the paper.
 *
 * Web only - `Platform.OS === 'web'` is the caller's check, since a caller usually also hides its
 * print button on native.
 */

export type PrintDomNodeOptions = {
	/** Extra `@media print` rules appended after the base ones. */
	extraPrintCss?: string;
	/** Last chance to change the clone before it is printed, e.g. to add a heading or a class. */
	transformClone?: (clone: HTMLElement) => void;
};

const BASE_PRINT_CSS = `
@media print {
	* {
		-webkit-print-color-adjust: exact !important;
		print-color-adjust: exact !important;
		background-clip: padding-box !important;
	}

	body {
		background-color: white !important;
	}

	.no-break,
	tr {
		page-break-inside: avoid !important;
		break-inside: avoid !important;
	}

	thead {
		display: table-header-group !important;
	}
}
`;

/** Copies every stylesheet rule of the current document; cross-origin sheets simply contribute nothing. */
function collectStylesheets(): string {
	return Array.from(document.styleSheets)
		.map((styleSheet) => {
			try {
				return Array.from(styleSheet.cssRules || [])
					.map((rule) => rule.cssText)
					.join('\n');
			} catch {
				return '';
			}
		})
		.join('\n');
}

export function printDomNode(node: HTMLElement, options: PrintDomNodeOptions = {}): void {
	const clone = node.cloneNode(true) as HTMLElement;
	options.transformClone?.(clone);

	const html = `
	<html>
		<head>
			<meta charset="utf-8">
			<base href="${document.baseURI}">
			<style>
				${collectStylesheets()}
				${BASE_PRINT_CSS}
				${options.extraPrintCss ?? ''}
			</style>
		</head>
		<body>
			${clone.outerHTML}
			<script>
				window.onload = function () {
					var print = function () { window.print(); };
					if (document.fonts && document.fonts.ready) {
						document.fonts.ready.then(print, print);
					} else {
						print();
					}
				};
			</script>
		</body>
	</html>
	`;

	// Loaded through a Blob URL rather than `document.write` (deprecated): opening the window
	// directly at the Blob URL still runs the inline `window.print()` once the document is loaded,
	// because the window navigates to a full HTML document instead of having markup injected.
	// The <base href> above is required for this - a blob: document does not inherit the opener's
	// base URL, so without it the relative font URLs in the copied stylesheets (Poppins @font-face,
	// @expo/vector-icons icon fonts) fail to resolve and the print falls back to default fonts
	// without bold weights.
	const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
	const printWindow = window.open(blobUrl, '_blank');
	printWindow?.addEventListener('load', () => URL.revokeObjectURL(blobUrl));
}

/** Prepends a heading to the clone so the printed page says what it shows. */
export function prependPrintHeading(clone: HTMLElement, title: string): void {
	const heading = clone.ownerDocument.createElement('h1');
	heading.textContent = title;
	heading.setAttribute('style', 'font-family: Poppins_700Bold, sans-serif; font-size: 20px; margin: 0 0 16px 0;');
	clone.insertBefore(heading, clone.firstChild);
}
