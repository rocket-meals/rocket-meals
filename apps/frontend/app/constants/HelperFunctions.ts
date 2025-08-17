import { UPDATE_LOGIN } from '@/redux/Types/types';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import Server from './ServerUrl';
import { NumberHelper } from 'repo-depkit-common';
import { ServerAPI } from '@/redux/actions';
import {StringHelper} from 'repo-depkit-common';
import {DatabaseTypes} from 'repo-depkit-common';
import { configureStore } from '@/redux/store';

export const generateCodeVerifier = async () => {
  const bytesMinAmount = 32;
  const bytesMaxAmount = 96;
  const bytesAmount = bytesMinAmount;
  const printableAsciiStart = 33; // ASCII value of '!'
  const printableAsciiEnd = 126; // ASCII value of '~'
  const printableAsciiRange = printableAsciiEnd - printableAsciiStart + 1; // Calculate the range

  const array = await Crypto.getRandomBytesAsync(bytesAmount); // Generates 32 random bytes
  return Array.from(array, (byte) =>
    String.fromCharCode(printableAsciiStart + (byte % printableAsciiRange))
  ).join('');
};

// Generate a code challenge using the S256 method
export const generateCodeChallenge = async (codeVerifier: string) => {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  // Adjust the base64url encoding
  return digest.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

// Update the login status
export const updateLoginStatus = async (
  dispatch: any,
  payload: DatabaseTypes.DirectusUsers
) => {
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

// TODO: Workaround Expo Issue: https://github.com/expo/expo/issues/29274
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

export const uploadToDirectus = async (image: any) => {
  try {
    const token = await ServerAPI.getClient().getToken();

    const blob = new Blob([image.buffer], { type: image.type || '' });

    const formData = new FormData();
    formData.append('file', blob, image.name);
    formData.append('filename_download', image.name);
    // formData.append('storage', folderId);
    formData.append('type', image.type);

    const uploadResponse = await fetch(`${Server.ServerUrl}/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await uploadResponse.json();
    return data.data?.id || null; // Return the Directus file ID
  } catch (error) {
    console.error('Directus Image Upload Error:', error);
    return null;
  }
};

export const uploadToDirectusFromMobile = async (image: any) => {
  try {
    const token = await ServerAPI.getClient().getToken();

    const formData = new FormData();
    formData.append('file', {
      uri: image.buffer,
      name: image.name || 'signature.png',
      type: image.type || 'image/png',
    } as any);
    formData.append('filename_download', image.name);
    formData.append('type', image.type);

    const uploadResponse = await fetch(`${Server.ServerUrl}/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await uploadResponse.json();
    return data.data?.id || null;
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

export function formatFoodInformationValue(
  value: string | number | null | undefined, 
  unit: string | null | undefined
): string | null {
  // If the value is not found, return null early
  if (!value) return null;

  // If value is a number, format it; otherwise, treat it as a string
  let valueWithUnit: string = "";

  if (typeof value === "number") {
    // Assuming NumberHelper.formatNumber handles null/undefined unit gracefully
    valueWithUnit = NumberHelper.formatNumber(value, unit, false, ",", ".", 1);
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
  const feedback = feedbacks.filter(
    (feedback: any) => feedback.food === foodId
  );
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
}

export const showPrice = (item: any, profile: any) => {
  if (profile?.price_group === 'guest') {
    return item?.price_guest?.toFixed(2);
  } else if (profile?.price_group === 'employee') {
    return item?.price_employee?.toFixed(2);
  } else {
    return item?.price_student?.toFixed(2);
  }
};

export const showDayPlanPrice = (item: any, profile: any) => {
  if (profile === 'guest') {
    return item?.price_guest?.toFixed(2);
  } else if (profile === 'employee') {
    return item?.price_employee?.toFixed(2);
  } else {
    return item?.price_student?.toFixed(2);
  }
};

export const formatPrice = (item: any) => {
  if (item) {
    return Number(Number(item)?.toFixed(2));
  }
};

export function showFormatedPrice(price: number | undefined | null): string {
  if (price == null) return '0,00 €'; // Handle undefined or null gracefully

  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(Number(price))
    .replace('€', '€') // Ensuring no space before €
    .trim();
}


