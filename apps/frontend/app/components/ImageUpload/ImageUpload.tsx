import React, { useEffect, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAppSelector } from '@/redux/hooks';
import { useLanguage } from '@/hooks/useLanguage';
import { isWeb } from '@/constants/Constants';
import { FormAnswersHelper } from '@/redux/actions/Forms/FormAnswers';
import { DatabaseTypes } from 'repo-depkit-common';
import { deleteDirectusFile } from '@/constants/HelperFunctions';
import { TranslationKeys } from '@/locales/keys';
import { myContrastColor } from '@/helper/ColorHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';

const ImageUpload = ({ id, value, onChange, error, isDisabled, custom_type, offlineMode, folderHint }: { id: string; value: any; onChange: (id: string, value: any, custom_type: string) => void; error: string; isDisabled: boolean; custom_type: string; offlineMode?: boolean; folderHint?: string | null }) => {
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const formAnswersHelper = new FormAnswersHelper();
	const { primaryColor, appSettings, selectedTheme: mode } = useAppSelector((state) => state.settings);
	const [authToken, setAuthToken] = useState<string | null | undefined>(undefined);

	useEffect(() => {
		let cancelled = false;
		ServerAPI.getClient()
			.getToken()
			.then(token => { if (!cancelled) setAuthToken(token); })
			.catch(() => { if (!cancelled) setAuthToken(null); });
		return () => { cancelled = true; };
	}, []);

	const getImageSource = (val: any) => {
		if (!val) return undefined;
		const uri = val?.image ? val.image : val;
		if (typeof uri !== 'string') return undefined;
		const isNonRemoteUri = uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://') || uri.startsWith('blob:') || uri.startsWith('data:');
		if (authToken && !isNonRemoteUri) {
			if (isWeb) {
				// On web, <img> tags cannot send custom headers in cross-origin requests,
				// so we include the token as a query parameter. This is the standard Directus approach.
				const separator = uri.includes('?') ? '&' : '?';
				return { uri: `${uri}${separator}access_token=${encodeURIComponent(authToken)}` };
			}
			return { uri, headers: { Authorization: `Bearer ${authToken}` } };
		}
		return { uri };
	};
	const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');

	const pickImage = async (fromCamera: boolean) => {
		let result;

		const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
		const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

		// If permission is not granted for Camera
		if (fromCamera && cameraPermission.status !== 'granted') {
			// toast('Camera permission is required to take a photo.','warning');
			return;
		}

		// If permission is not granted for Gallery
		if (!fromCamera && mediaPermission.status !== 'granted') {
			// toast('Media Library permission is required to select an image.','warning');
			return;
		}

		try {
			if (fromCamera) {
				result = await ImagePicker.launchCameraAsync({
					allowsEditing: true,
					aspect: [4, 3],
					quality: 1,
				});
			} else {
				result = await ImagePicker.launchImageLibraryAsync({
					mediaTypes: ['images'],
					allowsEditing: true,
					aspect: [4, 3],
					quality: 1,
				});
			}

			if (!result.canceled && result.assets) {
				const image = result.assets[0];
				const fileData = {
					name: image.fileName || `image_${Date.now()}.jpg`,
					type: image.mimeType || 'image/jpeg',
					image: image.uri,
				};

				onChange(id, fileData, custom_type);
			}
		} catch (error) {
			console.error('Error picking image:', error);
		}
	};

	const deleteImage = async () => {
		try {
			if (!value?.name) {
				// In offline mode, skip API calls — just clear the local value
				if (offlineMode) {
					onChange(id, null, custom_type);
					return;
				}
				const formAnswer = (await formAnswersHelper.fetchFormsById(id, {
					fields: ['id', 'value_image'],
				})) as DatabaseTypes.FormAnswers;

				if (formAnswer && formAnswer?.value_image) {
					const isFileDeleted = await deleteDirectusFile(String(formAnswer.value_image));
					if (isFileDeleted) {
						const deleteResponse = (await formAnswersHelper.updateFormAnswers(id, {
							value_image: null,
						})) as DatabaseTypes.FormAnswers;

						if (deleteResponse) {
							onChange(id, null, custom_type);
						} else {
							console.error('Error unlinking file from FormAnswer');
						}
					} else {
						console.error('Error deleting file from Directus');
					}
				} else {
					console.error('No file found to delete');
				}
			} else {
				onChange(id, null, custom_type);
			}
		} catch (error) {
			console.error('Error deleting file:', error);
		}
	};
	return (
		<View style={styles.container}>
			<View style={{ ...styles.uploadContainer }}>
				<TouchableOpacity
					style={{
						...styles.uploadButton,
						paddingVertical: isWeb ? 10 : 6,
						backgroundColor: primaryColor,
					}}
					onPress={() => pickImage(false)}
					disabled={isDisabled}
				>
					<MaterialIcons name="image" size={24} color={contrastColor} />
					<Text style={{ ...styles.uploadText, color: contrastColor }}>{translate(TranslationKeys.upload_image)}</Text>
				</TouchableOpacity>
				{!isWeb && (
					<TouchableOpacity style={{ ...styles.uploadButton, backgroundColor: primaryColor }} onPress={() => pickImage(true)} disabled={isDisabled}>
						<Ionicons name="camera" size={24} color={contrastColor} />
						<Text style={{ ...styles.uploadText, color: contrastColor }}>{translate(TranslationKeys.camera)}</Text>
					</TouchableOpacity>
				)}
			</View>
			{value && authToken !== undefined && (
				<View
					style={{
						...styles.fileContainer,
					}}
				>
					<TouchableOpacity
						style={{
							...styles.crossContainer,
							backgroundColor: theme.screen.iconBg,
						}}
						onPress={deleteImage}
					>
						<Ionicons name="close" size={18} color={'red'} />
					</TouchableOpacity>
					<Image key={authToken || 'no-auth'} source={getImageSource(value)} style={styles.filePreview} />
				</View>
			)}
		{folderHint != null && (
				<Text style={{ ...styles.folderHint, color: theme.screen.text }}>
					{`${translate(TranslationKeys.upload_folder_id)}: ${folderHint}`}
				</Text>
			)}
		</View>
	);
};

export default ImageUpload;
