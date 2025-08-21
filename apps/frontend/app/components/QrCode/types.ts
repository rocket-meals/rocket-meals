import { ImageSourcePropType } from 'react-native';

/**
 * Error correction levels supported by the QR code component.
 */
export enum QrCodeEcl {
	/** Low error correction */
	L = 'L',
	/** Medium error correction */
	M = 'M',
	/** Quartile error correction */
	Q = 'Q',
	/** High error correction */
	H = 'H',
}

export interface QrCodeProps {
	value: string;
	size?: number;
	image?: ImageSourcePropType;
	imageUrl?: string;
	/**
	 * Percentage size of the inner logo (0-30).
	 * Values outside this range will be clamped.
	 */
	innerSize?: number;
	/**
	 * Error correction level for the QR code.
	 * Defaults to a level calculated from `innerSize`.
	 */
	ecl?: QrCodeEcl;
	backgroundColor?: string;
	margin?: number;
	/**
	 * Additional white space around the QR code in pixels.
	 * Defaults to 10px.
	 */
	quietZone?: number;
}
