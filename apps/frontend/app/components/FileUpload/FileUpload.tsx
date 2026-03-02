import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useLanguage } from '@/hooks/useLanguage';
import { isWeb } from '@/constants/Constants';
import * as ImagePicker from 'expo-image-picker';
import { FormAnswersHelper } from '@/redux/actions/Forms/FormAnswers';
import { FileRelation, FormAnswer } from './types';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

/**
 *  "images" | "videos" | "livePhotos"
 *
 * Media types that can be picked by the image picker.
 * 'images' - for images.
 * 'videos' - for videos.
 * 'livePhotos' - for live photos (iOS only).
 */
export enum ImagePickerMediaTypes {
	Images = 'images',
	Videos = 'videos',
	LivePhotos = 'livePhotos',
}

const FileUpload = ({ id, value, onChange, error, isDisabled, custom_type }: { id: string; value: any; onChange: (id: string, value: any, custom_type: string) => void; error: string; isDisabled: boolean; custom_type: string }) => {
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const { primaryColor } = useSelector((state: RootState) => state.settings);
	const formAnswersHelper = new FormAnswersHelper();

	const pickFiles = async () => {
		try {
			const result = await DocumentPicker.getDocumentAsync({
				type: '*/*',
				multiple: true,
			});
			if (!result.canceled && result.assets.length > 0) {
				const buffers = await Promise.all(
					result.assets.map(async file => {
						return {
							name: file.name || `file_${Date.now()}`,
							type: file.mimeType || 'application/octet-stream',
							image: file.uri,
							edit: false,
						};
					})
				);

				onChange(id, [...value, ...buffers], custom_type);
			}
		} catch (error) {
			console.error('File selection error:', error);
		}
	};

	const pickImage = async (source: 'camera' | 'gallery') => {
		try {
			let result;
			const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
			const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

			// If permission is not granted for Camera
			if (source === 'camera' && cameraPermission.status !== 'granted') {
				// toast('Camera permission is required to take a photo.','warning');
				return;
			}

			// If permission is not granted for Gallery
			if (source === 'gallery' && mediaPermission.status !== 'granted') {
				// toast('Media Library permission is required to select an image.','warning');
				return;
			}
			if (source === 'camera') {
				result = await ImagePicker.launchCameraAsync({
					allowsEditing: true,
					aspect: [4, 3],
					quality: 1,
				});
			} else {
				result = await ImagePicker.launchImageLibraryAsync({
					mediaTypes: [ImagePickerMediaTypes.Images],
					allowsEditing: true,
					aspect: [4, 3],
					quality: 1,
				});
			}

			if (!result.canceled && result.assets.length > 0) {
				onChange(
					id,
					[
						...value,
						...result.assets.map(image => ({
							name: image.fileName || `image_${Date.now()}.jpg`,
							type: image.mimeType || 'image/jpeg',
							image: image.uri,
							edit: false,
						})),
					],
					custom_type
				);
			}
		} catch (error) {
			console.error('Image selection error:', error);
		}
	};

	const deleteFile = async (item: any) => {
		try {
			if (item?.edit) {
				const formAnswer = (await formAnswersHelper.fetchFormsById(id, {
					fields: ['id', 'value_files.id', 'value_files.directus_files_id'],
				})) as FormAnswer;

				if (!formAnswer || !formAnswer.value_files || formAnswer.value_files.length === 0) {
					console.error('No form answer found or no files associated');
					return;
				}

				const relation = formAnswer.value_files.find((file: FileRelation) => file.directus_files_id === item?.directus_files_id);

				if (!relation) {
					console.error('Relation ID not found for file:', item?.directus_files_id);
					return;
				}

				const response = (await formAnswersHelper.updateFormAnswers(id, {
					id: id,
					value_files: { delete: [relation.id] },
				})) as FormAnswer;

				if (response) {
					onChange(id, value ? value?.filter((file: any) => file.directus_files_id !== item?.directus_files_id) : [], custom_type);
				}
			} else {
				onChange(id, value ? value?.filter((file: any) => file.directus_files_id !== item?.directus_files_id) : [], custom_type);
			}
		} catch (error) {
			console.error('Error deleting file:', error);
		}
	};

	return (
		<View style={styles.container}>
			<View style={{ ...styles.uploadContainer }}>
				{!isWeb && (
					<TouchableOpacity
						style={{
							...styles.uploadButton,
							backgroundColor: primaryColor,
						}}
						onPress={() => pickImage('gallery')}
						disabled={isDisabled}
					>
						<MaterialIcons name="image" size={24} color={theme.screen.text} />
						<Text style={{ ...styles.uploadText, color: theme.screen.text }}>{translate(TranslationKeys.upload_image)}</Text>
					</TouchableOpacity>
				)}
				{!isWeb && (
					<TouchableOpacity style={{ ...styles.uploadButton, backgroundColor: primaryColor }} onPress={() => pickImage('camera')} disabled={isDisabled}>
						<Ionicons name="camera" size={24} color={theme.screen.text} />
						<Text style={{ ...styles.uploadText, color: theme.screen.text }}>{translate(TranslationKeys.camera)}</Text>
					</TouchableOpacity>
				)}
				<TouchableOpacity
					style={{
						...styles.uploadButton,
						paddingVertical: isWeb ? 10 : 6,
						backgroundColor: primaryColor,
					}}
					onPress={pickFiles}
					disabled={isDisabled}
				>
					<MaterialIcons name="cloud-upload" size={24} color={theme.screen.text} />
					<Text style={{ ...styles.uploadText, color: theme.screen.text }}>{translate(TranslationKeys.upload_file)}</Text>
				</TouchableOpacity>
			</View>
			<ScrollView style={{ width: '100%', maxHeight: 300 }} nestedScrollEnabled>
				{value &&
					value?.length > 0 &&
					value.map((item: any, index: number) => {
						if (!item?.image && item?.name) {
							return (
								<View
									style={{
										...styles.fileNameContainer,
										backgroundColor: theme.screen.iconBg,
									}}
									key={index}
								>
									<Text style={{ ...styles.fileName, color: theme.screen.text }}>{item?.name}</Text>
									<TouchableOpacity style={{ padding: 5 }} onPress={() => deleteFile(item)}>
										<Ionicons name="close" size={18} color={'red'} />
									</TouchableOpacity>
								</View>
							);
						}
						if (item?.image) {
							return (
								<View
									style={{
										...styles.fileContainer,
									}}
									key={index}
								>
									<TouchableOpacity
										style={{
											...styles.crossContainer,
											backgroundColor: theme.screen.iconBg,
										}}
										onPress={() => deleteFile(item)}
									>
										<Ionicons name="close" size={18} color={'red'} />
									</TouchableOpacity>
									<Image source={{ uri: item?.image }} style={styles.filePreview} />
								</View>
							);
						}
					})}
			</ScrollView>
		</View>
	);
};

export default FileUpload;
