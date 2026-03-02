import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useLanguage } from '@/hooks/useLanguage';
import { isWeb } from '@/constants/Constants';
import { FormAnswersHelper } from '@/redux/actions/Forms/FormAnswers';
import { DatabaseTypes } from 'repo-depkit-common';
import { deleteDirectusFile } from '@/constants/HelperFunctions';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import { myContrastColor } from '@/helper/ColorHelper';

const ImageUpload = ({ id, value, onChange, error, isDisabled, custom_type }: { id: string; value: any; onChange: (id: string, value: any, custom_type: string) => void; error: string; isDisabled: boolean; custom_type: string }) => {
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const formAnswersHelper = new FormAnswersHelper();
	const { primaryColor, appSettings, selectedTheme: mode } = useSelector((state: RootState) => state.settings);
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
			{value && (
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
					<Image source={{ uri: value?.image ? value?.image : value }} style={styles.filePreview} />
				</View>
			)}
		</View>
	);
};

export default ImageUpload;
