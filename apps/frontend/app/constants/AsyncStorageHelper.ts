import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Save a value to AsyncStorage.
 *
 * @param {string} key - The key under which the value is stored.
 * @param {any} value - The value to store. It will be serialized to JSON.
 * @returns {Promise<void>}
 */
export const setValue = async (key: string, value: any): Promise<void> => {
	try {
		const jsonValue = JSON.stringify(value);
		await AsyncStorage.setItem(key, jsonValue);
	} catch (error) {
		console.error(`Error setting value for key "${key}":`, error);
	}
};

/**
 * Retrieve a value from AsyncStorage.
 *
 * @param {string} key - The key of the value to retrieve.
 * @returns {Promise<any | null>} - The parsed value, or null if not found or an error occurred.
 */
export const getValue = async (key: string): Promise<any | null> => {
	try {
		const jsonValue = await AsyncStorage.getItem(key);
		return jsonValue != null ? JSON.parse(jsonValue) : null;
	} catch (error) {
		console.error(`Error getting value for key "${key}":`, error);
		return null;
	}
};

/**
 * Remove a value from AsyncStorage.
 *
 * @param {string} key - The key of the value to remove.
 * @returns {Promise<void>}
 */
export const removeValue = async (key: string): Promise<void> => {
	try {
		await AsyncStorage.removeItem(key);
	} catch (error) {
		console.error(`Error removing value for key "${key}":`, error);
	}
};

/**
 * Clear all data from AsyncStorage.
 *
 * @returns {Promise<void>}
 */
export const clearStorage = async (): Promise<void> => {
	try {
		await AsyncStorage.clear();
	} catch (error) {
		console.error('Error clearing AsyncStorage:', error);
	}
};
