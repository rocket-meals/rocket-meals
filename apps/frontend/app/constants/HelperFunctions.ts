import { UPDATE_LOGIN } from '@/redux/Types/types';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import Server from './ServerUrl';
import { DatabaseTypes, FoodofferPriceHelper, NumberHelper, StringHelper } from 'repo-depkit-common';
import { ServerAPI } from '@/redux/actions';
import { buildDirectusUploadFormData } from '@/helper/fileUploadHelper';
import { configureStore } from '@/redux/store';
import { PriceGroupKey } from '@/app/(app)/settings/types';

export const generateCodeVerifier = async () => {
	const bytesMinAmount = 32;
	const bytesAmount = bytesMinAmount;
	const printableAsciiStart = 33; // ASCII value of '!'
	const printableAsciiEnd = 126; // ASCII value of '~'
	const printableAsciiRange = printableAsciiEnd - printableAsciiStart + 1; // Calculate the range

	const array = await Crypto.getRandomBytesAsync(bytesAmount); // Generates 32 random bytes
	return Array.from(array, byte => String.fromCodePoint(printableAsciiStart + (byte % printableAsciiRange))).join('');
};

// Generate a code challenge using the S256 method
export const generateCodeChallenge = async (codeVerifier: string) => {
	const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, codeVerifier, { encoding: Crypto.CryptoEncoding.BASE64 });
	// Adjust the base64url encoding
	const withoutEquals = StringHelper.replaceAllLiteralWithOptions({ str: digest, find: '=', replace: '' });
	const withDashes = StringHelper.replaceAllLiteralWithOptions({ str: withoutEquals, find: '+', replace: '-' });
	return StringHelper.replaceAllLiteralWithOptions({ str: withDashes, find: '/', replace: '_' });
};

// Update the login status
export const updateLoginStatus = async (dispatch: any, payload: DatabaseTypes.DirectusUsers) => {
	dispatch({ type: UPDATE_LOGIN, payload });
};

// Check if the app is running on GitHub Pages
export function isOnGithubPages() {
	if (Platform.OS === 'web') {
		if (window.location.origin.includes('github.io')) {
			return true;
		}
	}
	return false;
}

export function reloadAndRemoveParamsForGithubPages() {
	window.location.replace(window.location.origin + window.location.pathname);
}

export const excerpt = (text: string, length: number) => {
	if (!text) {
		return '';
	}
	return text.length > length ? text.substring(0, length) + '...' : text;
};

export const numToOneDecimal = (num: number) => {
	return Math.round(num * 10) / 10;
};

export const getImageUrl = (imageId: string, size: number = 512) => {
	if (!imageId) {
		return null;
	}
	const { useWebpForAssets } = configureStore.getState().settings;
	const format = useWebpForAssets ? '&format=webp' : '';
	return `${Server.ServerUrl}/assets/${imageId}?fit=cover&width=${size}&height=${size}&quality=100${format}`;
};

export const getHighResImageUrl = (imageId: string, size: number = 2048) => {
	return getImageUrl(imageId, size);
};

export const getFormValueImageUrl = (imageId: string) => {
	if (!imageId) {
		return null;
	}
	const { useWebpForAssets } = configureStore.getState().settings;
	const format = useWebpForAssets ? '?format=webp' : '';
	return `${Server.ServerUrl}/assets/${imageId}${format}`;
};

const patchFileFolder = async (token: string | null, fileId: string, folderId: string): Promise<void> => {
	await fetch(`${Server.ServerUrl}/files/${fileId}`, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ folder: folderId }),
	});
};

export const uploadToDirectus = async (image: any, folderId?: string | null) => {
	try {
		const token = await ServerAPI.getClient().getToken();

		const blob = new Blob([image.buffer], { type: image.type || '' });

		// Directus only applies the payload fields it has already read when it reaches the
		// file part, so the file has to be appended last.
		const formData = new FormData();
		formData.append('filename_download', image.name);
		if (folderId) formData.append('folder', folderId);
		formData.append('type', image.type);
		formData.append('file', blob, image.name);

		const uploadResponse = await fetch(`${Server.ServerUrl}/files`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
			},
			body: formData,
		});

		const data = await uploadResponse.json();
		const fileId = data.data?.id || null;
		if (fileId && folderId) {
			try {
				await patchFileFolder(token, fileId, folderId);
			} catch (patchError) {
				console.warn('Could not update folder for uploaded file:', patchError);
			}
		}
		return fileId; // Return the Directus file ID
	} catch (error) {
		console.error('Directus Image Upload Error:', error);
		return null;
	}
};

export const uploadToDirectusFromMobile = async (image: any, folderId?: string | null) => {
	try {
		const token = await ServerAPI.getClient().getToken();

		// image.buffer is the local uri of the picked file (or a data uri for a signature).
		const formData = await buildDirectusUploadFormData({
			uri: image.buffer,
			fileName: image.name || 'signature.png',
			folderId,
			mimeType: image.type || 'image/png',
		});

		const uploadResponse = await fetch(`${Server.ServerUrl}/files`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
			},
			body: formData,
		});

		const data = await uploadResponse.json();
		const fileId = data.data?.id || null;
		if (fileId && folderId) {
			try {
				await patchFileFolder(token, fileId, folderId);
			} catch (patchError) {
				console.warn('Could not update folder for uploaded file:', patchError);
			}
		}
		return fileId;
	} catch (error) {
		console.error('Directus Image Upload Error:', error);
		return null;
	}
};

export const getFileFromDirectus = async (fileId: any) => {
	try {
		const token = await ServerAPI.getClient().getToken();

		const response = await fetch(`${Server.ServerUrl}/files/${fileId}`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch file. Status: ${response.status}`);
		}

		const data = await response.json();
		return data?.data || null; // Return file metadata or null if not found
	} catch (error) {
		console.error('Directus File Fetch Error:', error);
		return null;
	}
};

export const deleteDirectusFile = async (fileId: string) => {
	try {
		const token = await ServerAPI.getClient().getToken();

		const deleteResponse = await fetch(`${Server.ServerUrl}/files/${fileId}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (deleteResponse.ok) {
			return true; // File deleted successfully
		} else {
			console.error('Failed to delete file:', deleteResponse.statusText);
			return false;
		}
	} catch (error) {
		console.error('Error deleting file:', error);
		return false;
	}
};

// Helper function to filter out null or undefined values
export const filterNullishProperties = (obj: Record<string, any>) => {
	return Object.fromEntries(
		Object.entries(obj).filter(([_, value]) => value != null) // value != null filters out both null and undefined
	);
};

export function formatFoodInformationValue(value: string | number | null | undefined, unit: string | null | undefined): string | null {
	// If the value is not found, return null early
	if (!value) return null;

	// If value is a number, format it; otherwise, treat it as a string
	let valueWithUnit: string = '';

	if (typeof value === 'number') {
		// Assuming NumberHelper.formatNumber handles null/undefined unit gracefully
		valueWithUnit = NumberHelper.formatNumber(value, unit, false, ',', '.', 1);
	} else {
		// If value is not a number, convert it to string
		valueWithUnit = String(value);

		// Append the unit if it's provided
		if (unit) {
			valueWithUnit += StringHelper.NONBREAKING_HALF_SPACE + unit;
		}
	}

	return valueWithUnit;
}

export const getpreviousFeedback = (feedbacks: any, foodId: string) => {
	const feedback = feedbacks.filter((feedback: any) => feedback.food === foodId);
	if (feedback.length > 0) {
		return feedback[0];
	} else {
		return {};
	}
};

export const getFoodOffer = (foodOffers: any, offerId: string) => {
	const foodOffer = foodOffers.filter((offer: any) => offer.id === offerId);
	if (foodOffer.length > 0) {
		return foodOffer[0];
	} else {
		return {};
	}
};

/**
 * Price label of a food offer for the price group of the given profile, e.g. "1,20 €".
 *
 * Food offers that are sold by weight instead of per dish carry a price reference
 * (`price_reference_amount` + `price_reference_unit`) and are shown as a base price
 * ("0,40 €/100 g"); see {@link FoodofferPriceHelper}.
 */
export const showPrice = (item: any, profile: Partial<DatabaseTypes.Profiles>) => {
	return FoodofferPriceHelper.getPriceLabelForPriceGroup(item, profile?.price_group);
};

/** Price label of a food offer for one specific price group (monitors show them side by side). */
export const showDayPlanPrice = (item: any, priceGroup: PriceGroupKey) => {
	return FoodofferPriceHelper.getPriceLabelForPriceGroup(item, priceGroup);
};

/** Price labels of all price groups in one string, e.g. "1,00 € / 2,00 € / 3,00 €". */
export const showAllPriceGroupsPrice = (item: any) => {
	return FoodofferPriceHelper.getPriceLabelForPriceGroups(item, [PriceGroupKey.student, PriceGroupKey.employee, PriceGroupKey.guest]);
};

export const formatPrice = (item: any) => {
	if (item) {
		return Number(Number(item)?.toFixed(2));
	}
};

export function showFormatedPrice(price: number | undefined | null): string {
	return FoodofferPriceHelper.formatPrice(price);
}
