import { Alert, Dimensions, Text, TouchableOpacity, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import React, { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import styles from './styles';
import { isWeb } from '@/constants/Constants';
import { useTheme } from '@/hooks/useTheme';
import { ImageManagementSheetProps } from './types';
import { ServerAPI } from '@/redux/actions';
import { uploadFiles } from '@directus/sdk';
import { CollectionHelper } from '@/helper/collectionHelper';
import { buildDirectusUploadFormData } from '@/helper/fileUploadHelper';
import { useAppSelector } from '@/redux/hooks';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { ImagePickerMediaTypes } from '@/components/FileUpload/FileUpload';

/**
 * Downscales the given image if it exceeds maxDimension in either dimension,
 * preserving aspect ratio. Returns the original uri unchanged if it already
 * fits within the limit.
 */
async function resizeImageIfTooLarge(uri: string, width: number, height: number, maxDimension: number): Promise<string> {
	if (width <= maxDimension && height <= maxDimension) {
		return uri;
	}

	const aspectRatio = width / height;
	const newDimensions =
		width > height
			? {
					width: maxDimension,
					height: maxDimension / aspectRatio,
				}
			: {
					width: maxDimension * aspectRatio,
					height: maxDimension,
				};

	const resizedImage = await ImageManipulator.manipulateAsync(uri, [{ resize: newDimensions }], { compress: 1, format: ImageManipulator.SaveFormat.JPEG });

	return resizedImage.uri;
}

const ImageManagementSheet: React.FC<ImageManagementSheetProps> = ({ closeSheet, selectedFoodId, handleFetch, fileName }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const [loading, setLoading] = useState({
		camera: false,
		image: false,
		delete: false,
	});
	const [isDelete, setIsDelete] = useState(false);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const MAX_IMAGE_DIMENSION = 6000;
	const { foodCollection } = useAppSelector((state) => state.food);


	const getFolder = () => {
		if (foodCollection) {
			const id = foodCollection?.meta?.options?.folder;
			return id || '';
		}
	};
	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(Dimensions.get('window').width);
		};

		const subscription = Dimensions.addEventListener('change', handleResize);

		return () => subscription?.remove();
	}, []);

	const handleImagePick = async (useCamera: boolean) => {
		try {
			const permissionResponse = useCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();

			if (!permissionResponse.granted) {
				Alert.alert('Permission Denied', 'Please grant permissions to access the camera or gallery.');
				return;
			}

			const pickerResult = useCamera
				? await ImagePicker.launchCameraAsync({
						mediaTypes: [ImagePickerMediaTypes.Images],
						allowsEditing: true,
						aspect: [1, 1],
						allowsMultipleSelection: false,
						selectionLimit: 1,
						quality: 1,
					})
				: await ImagePicker.launchImageLibraryAsync({
						mediaTypes: [ImagePickerMediaTypes.Images],
						allowsEditing: true,
						aspect: [1, 1],
						allowsMultipleSelection: false,
						selectionLimit: 1,
						quality: 1,
					});

			if (pickerResult.canceled) {
				Alert.alert('Canceled the image');
				return;
			}

			const { uri, width, height } = pickerResult.assets[0];
			const finalUri = await resizeImageIfTooLarge(uri, width, height, MAX_IMAGE_DIMENSION);

			if (useCamera) {
				setLoading({ ...loading, camera: true });
			} else {
				setLoading({ ...loading, image: true });
			}
			const file_name = fileName + '_' + selectedFoodId;
			let storage = '';
			if (fileName === 'foods') {
				storage = getFolder();
			}
			const formData = await buildDirectusUploadFormData({
				uri: finalUri,
				fileName: file_name,
				folderId: storage,
				title: file_name,
			});

			const client = ServerAPI.getClient();
			const resultFileUpload = await client.request(uploadFiles(formData));

			const file_id = resultFileUpload.id;

			const collectionHelper = new CollectionHelper(fileName);
                        await collectionHelper.updateItem(selectedFoodId, {
                                image: file_id,
                                image_generated: false,
                        });
			handleFetch();
			setLoading({ ...loading, camera: false, image: false });
			closeSheet();
		} catch (error) {
			console.error('Error selecting image:', error);
			setLoading({ ...loading, camera: false, image: false });
		}
	};

	const handleDeleteImage = async () => {
		try {
			const collectionHelper = new CollectionHelper(fileName);
			setLoading({ ...loading, delete: true });
                        await collectionHelper.updateItem(selectedFoodId, {
                                image: null,
                                image_remote_url: null,
                                image_generated: false,
                        });
			handleFetch();
			closeSheet();
			setLoading({ ...loading, delete: false });
		} catch (error) {
			console.error('Error deleting image:', error);
			setLoading({ ...loading, delete: false });
		}
	};

	return (
		<BottomSheetView style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }}>
			<View
				style={{
					...styles.sheetHeader,
					paddingRight: isWeb ? 10 : 0,
					paddingTop: isWeb ? 10 : 0,
				}}
			>
				<View />
				<Text
					style={{
						...styles.sheetHeading,
						color: theme.sheet.text,
					}}
				>
					Edit: Image
				</Text>
			</View>
			<View
				style={{
					...styles.mainContentContainer,
					width: isWeb ? '90%' : '100%',
					paddingHorizontal: screenWidth > 600 ? 20 : 0,
					marginTop: screenWidth > 600 ? 40 : 20,
				}}
			>
				{isDelete ? (
					<View>
						<TouchableOpacity style={{ ...styles.row, backgroundColor: theme.background }} onPress={handleDeleteImage}>
							<View style={styles.col}>
								<MaterialCommunityIcons name="delete" size={24} color={theme.screen.icon} />
								<Text style={{ ...styles.label, color: theme.screen.text }}>{translate(TranslationKeys.delete)}</Text>
							</View>
							{loading?.delete ? <LoadingIndicator size="small" color={theme.screen.icon} /> : <MaterialCommunityIcons name="checkbox-blank-circle-outline" size={24} color={theme.screen.icon} />}
						</TouchableOpacity>
						<TouchableOpacity
							style={{ ...styles.row, backgroundColor: theme.background }}
							onPress={() => {
								setIsDelete(false);
								closeSheet();
							}}
						>
							<View style={styles.col}>
								<MaterialCommunityIcons name="close" size={24} color={theme.screen.icon} />
								<Text style={{ ...styles.label, color: theme.screen.text }}>{translate(TranslationKeys.cancel)}</Text>
							</View>
							<MaterialCommunityIcons name="checkbox-blank-circle-outline" size={24} color={theme.screen.icon} />
						</TouchableOpacity>
						<TouchableOpacity style={{ ...styles.row, backgroundColor: theme.background }} onPress={() => setIsDelete(false)}>
							<View style={styles.col}>
								<MaterialCommunityIcons name="keyboard-backspace" size={24} color={theme.screen.icon} />
								<Text style={{ ...styles.label, color: theme.screen.text }}>{translate(TranslationKeys.navigate_back)}</Text>
							</View>
						</TouchableOpacity>
					</View>
				) : (
					<>
						{!isWeb && (
							<TouchableOpacity style={{ ...styles.row, backgroundColor: theme.background }} onPress={() => handleImagePick(true)}>
								<View style={styles.col}>
									<Ionicons name="camera" size={24} color={theme.screen.icon} />
									<Text style={{ ...styles.label, color: theme.screen.text }}>{translate(TranslationKeys.camera)}</Text>
								</View>
								{loading?.camera ? <LoadingIndicator size="small" color={theme.screen.icon} /> : <MaterialCommunityIcons name="checkbox-blank-circle-outline" size={24} color={theme.screen.icon} />}
							</TouchableOpacity>
						)}
						<TouchableOpacity style={{ ...styles.row, backgroundColor: theme.background }} onPress={() => handleImagePick(false)}>
							<View style={styles.col}>
								<MaterialCommunityIcons name="folder-image" size={24} color={theme.screen.icon} />
								<Text style={{ ...styles.label, color: theme.screen.text }}>{translate(TranslationKeys.gallery)}</Text>
							</View>
							{loading?.image ? <LoadingIndicator size="small" color={theme.screen.icon} /> : <MaterialCommunityIcons name="checkbox-blank-circle-outline" size={24} color={theme.screen.icon} />}
						</TouchableOpacity>
						<TouchableOpacity style={{ ...styles.row, backgroundColor: theme.background }} onPress={() => setIsDelete(true)}>
							<View style={styles.col}>
								<MaterialCommunityIcons name="delete" size={24} color={theme.screen.icon} />
								<Text style={{ ...styles.label, color: theme.screen.text }}>{translate(TranslationKeys.delete)}</Text>
							</View>
							<MaterialCommunityIcons name="arrow-right" size={24} color={theme.screen.icon} />
						</TouchableOpacity>
						<TouchableOpacity style={{ ...styles.row, backgroundColor: theme.background }} onPress={closeSheet}>
							<View style={styles.col}>
								<MaterialCommunityIcons name="close" size={24} color={theme.screen.icon} />
								<Text style={{ ...styles.label, color: theme.screen.text }}>{translate(TranslationKeys.cancel)}</Text>
							</View>
						</TouchableOpacity>
					</>
				)}
			</View>
		</BottomSheetView>
	);
};

export default ImageManagementSheet;
