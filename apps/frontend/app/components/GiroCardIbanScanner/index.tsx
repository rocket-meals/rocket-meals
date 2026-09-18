import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { IbanCandidate, IbanRecognitionHelper } from 'repo-depkit-common';

import { useLanguage } from '@/hooks/useLanguage';
import { useOcr } from '@/hooks/useOcr';
import { TranslationKeys } from '@/locales/keys';

/**
 * Buzzes once, the way a phone confirms something went right.
 *
 * Nothing about this may reach the caller: a device with no vibration motor and
 * a browser that refuses to buzz outside a gesture both fail here, and the IBAN
 * arrives either way. `notificationAsync` can throw straight away on a platform
 * that has no haptics at all, so the call is wrapped rather than only chained.
 */
const playSuccessFeedback = () => {
	try {
		void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
	} catch {
		// See above: feedback is a courtesy, never a step of the scan.
	}
};

export interface OpenGiroCardIbanScannerOptions {
	/** Receives the IBAN grouped in blocks of four, ready for the input field. */
	onIbanDetected: (formattedIban: string, candidate: IbanCandidate) => void;
	/**
	 * Accept an IBAN whose mod-97 checksum does not add up. Only for testing
	 * against specimen cards such as the fixtures in
	 * `packages/common/src/__tests__/fixtures` — a real card always carries a
	 * checksum-valid IBAN, and demanding it filters out misreads. Country,
	 * length and character pattern are still required either way.
	 */
	allowInvalidChecksum?: boolean;
	/** Every batch of recognized lines, for the experimental screen's debug output. */
	onRecognizedLinesChange?: (lines: string[]) => void;
}

/**
 * Reads the IBAN off a giro card and hands it back ready for an input field.
 *
 * Everything about cameras, photo rolls and engines belongs to `useOcr`; what
 * is left here is the one thing that is about IBANs: what counts as having
 * found one. That answer is also what lets the automatic camera close itself —
 * a scan that cannot recognize its own success would never end.
 */
export const useGiroCardIbanScannerModal = () => {
	const { openOcr, closeOcr } = useOcr();
	const { translate } = useLanguage();

	const openGiroCardIbanScanner = useCallback(
		(options: OpenGiroCardIbanScannerOptions) => {
			openOcr<IbanCandidate>({
				title: translate(TranslationKeys.giro_card_scan_title),
				hint: translate(TranslationKeys.giro_card_scan_hint),
				// The number sits in one place on the card, so saying where to hold
				// it is worth the rectangle over the preview.
				showFrame: true,
				onLinesRecognized: options.onRecognizedLinesChange,
				findMatch: (lines) => IbanRecognitionHelper.findIban(lines, { allowInvalidChecksum: options.allowInvalidChecksum }),
				// The automatic scan gives nothing back to a user who is holding a
				// card in front of a lens and not looking at the screen. A buzz is
				// what says "that was it" before the modal is even gone.
				onMatchFound: playSuccessFeedback,
				onRecognized: ({ match }) => {
					if (match) {
						options.onIbanDetected(match.formatted, match);
					}
				},
			});
		},
		[openOcr, translate],
	);

	return { openGiroCardIbanScanner, closeGiroCardIbanScanner: closeOcr };
};

export default useGiroCardIbanScannerModal;
