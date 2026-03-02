import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSelector } from 'react-redux';
import { uploadFiles } from '@directus/sdk';

import SettingsList from '@/components/SettingsList';
import { ImagePickerMediaTypes } from '@/components/FileUpload/FileUpload';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { isWeb, settingsListSectionGap } from '@/constants/Constants';
import { ServerAPI } from '@/redux/actions';
import { CollectionHelper } from '@/helper/collectionHelper';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import { fetchSpecificField } from '@/redux/actions/Fields/Fields';
import { CollectionNames } from 'repo-depkit-common';

type DirectusImageEditModalOptions = {
	itemId: string | number;
	field: string;
	collection: CollectionNames;
	onUpdated?: () => void;
	title?: string;
};

type DirectusImageEditModalContentProps = {
	itemId: string;
	field: string;
	collection: CollectionNames;
	onUpdated?: () => void;
	onClose: () => void;
};

const MAX_IMAGE_DIMENSION = 6000;

const useCollectionFolder = (collection: CollectionNames) => {
	const { foodCollection } = useSelector((state: RootState) => state.food);
	const [collectionFolder, setCollectionFolder] = useState('');

	useEffect(() => {
		let isMounted = true;
		const loadFolder = async () => {
			if (collection === CollectionNames.FOODS) {
				const id = foodCollection?.meta?.options?.folder;
				if (isMounted) {
					setCollectionFolder(id || '');
				}
				return;
			}

			try {
				const fieldResponse: any = await fetchSpecificField(collection);
				const imageField = fieldResponse?.image;
				const id = imageField?.meta?.options?.folder;
				if (isMounted) {
					setCollectionFolder(id || '');
				}
			} catch (error) {
				console.error('Error fetching collection image field:', error);
				if (isMounted) {
					setCollectionFolder('');
				}
			}
		};

		loadFolder();

		return () => {
			isMounted = false;
		};
	}, [collection, foodCollection]);

	return collectionFolder;
};

const useCollectionFields = (collection: CollectionNames) => {
	const [collectionFields, setCollectionFields] = useState<Record<string, any>>({});

	useEffect(() => {
		let isMounted = true;
		const loadFields = async () => {
			try {
				const fieldResponse: any = await fetchSpecificField(collection);
				if (isMounted) {
					setCollectionFields(fieldResponse || {});
				}
			} catch (error) {
				console.error('Error fetching collection fields:', error);
				if (isMounted) {
					setCollectionFields({});
				}
			}
		};

		loadFields();

		return () => {
			isMounted = false;
		};
	}, [collection]);

	return collectionFields;
};

const DirectusImageEditModalContent: React.FC<DirectusImageEditModalContentProps> = ({ field, collection, itemId, onUpdated, onClose }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { show: showScrollViewModal } = useMyScrollViewModal();
	const [loading, setLoading] = useState({ camera: false, image: false, delete: false });
	const [isDelete, setIsDelete] = useState(false);
	const storage = useCollectionFolder(collection);
	const collectionFields = useCollectionFields(collection);

	const imageRemoteUrlField = 'image_remote_url';
	const imageGeneratedField = 'image_generated';

	const buildUpdatePayload = useCallback(
		(payload: Record<string, any>) => {
			const basePayload = { ...payload };

			if (collectionFields?.[imageGeneratedField]) {
				basePayload[imageGeneratedField] = false;
			}
			return basePayload;
		},
		[collectionFields]
	);

	const handleImagePick = useCallback(
		async (useCamera: boolean) => {
			if (!itemId) return;
			if (loading.camera || loading.image || loading.delete) return;
			try {
				const permissionResponse = useCamera
					? await ImagePicker.requestCameraPermissionsAsync()
					: await ImagePicker.requestMediaLibraryPermissionsAsync();

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
				let finalUri = uri;

				if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
					const aspectRatio = width / height;
					const newDimensions =
						width > height
							? {
									width: MAX_IMAGE_DIMENSION,
									height: MAX_IMAGE_DIMENSION / aspectRatio,
								}
							: {
									width: MAX_IMAGE_DIMENSION * aspectRatio,
									height: MAX_IMAGE_DIMENSION,
								};

					const resizedImage = await ImageManipulator.manipulateAsync(
						uri,
						[{ resize: newDimensions }],
						{ compress: 1, format: ImageManipulator.SaveFormat.JPEG }
					);

					finalUri = resizedImage.uri;
				}

				setLoading(prev => ({ ...prev, camera: useCamera, image: !useCamera }));

				const formData = new FormData();
				const fileName = `${collection}_${itemId}`;

				if (Platform.OS === 'web') {
					const blob: Blob = await new Promise((resolve, reject) => {
						const xhr = new XMLHttpRequest();
						xhr.onload = function () {
							resolve(xhr.response);
						};
						xhr.onerror = function (e) {
							console.log(e);
							reject(new TypeError('Network request failed'));
						};
						xhr.responseType = 'blob';
						xhr.open('GET', finalUri, true);
						xhr.send(null);
					});

					if (storage) {
						formData.append('folder', storage);
					}
					formData.append('image', blob, fileName);
				} else {
					const uriParts = finalUri.split('.');
					const fileType = uriParts[uriParts.length - 1];
					const fileExtension = `.${fileType}`;
					const file: any = {
						uri: finalUri,
						name: fileName + fileExtension,
						type: `image/${fileType}`,
					};

					if (storage) {
						formData.append('folder', storage);
					}
					formData.append('image', file, fileName);
				}

				const client = ServerAPI.getClient();
				formData.append('title', fileName);

				const resultFileUpload = await client.request(uploadFiles(formData));
				const fileId = resultFileUpload.id;

				const collectionHelper = new CollectionHelper(collection);
				await collectionHelper.updateItem(String(itemId), buildUpdatePayload({ [field]: fileId }));

				onUpdated?.();
				onClose();
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				const errorDetails = JSON.stringify(error ?? null, null, 2);

				showScrollViewModal({
					title: translate(TranslationKeys.error),
					children: (
						<View style={{ gap: 12 }}>
							<Text style={{ color: theme.screen.text }}>
								Fehler beim Hochladen: {errorMessage}
							</Text>
							<Text style={{ color: theme.screen.text, fontFamily: 'monospace' }}>{errorDetails}</Text>
						</View>
					),
				});
				console.error('Error selecting image:', error);
			} finally {
				setLoading({ camera: false, image: false, delete: false });
			}
		},
		[
			buildUpdatePayload,
			collection,
			field,
			itemId,
			loading,
			onClose,
			onUpdated,
			showScrollViewModal,
			storage,
			theme.screen.text,
			translate,
		]
	);

	const handleDeleteImage = useCallback(async () => {
		if (!itemId) return;
		if (loading.camera || loading.image || loading.delete) return;
		try {
			setLoading(prev => ({ ...prev, delete: true }));
			const collectionHelper = new CollectionHelper(collection);
			const payload: Record<string, any> = {
				[field]: null,
			};

			if (collectionFields?.[imageRemoteUrlField]) {
				payload[imageRemoteUrlField] = null;
			}

			await collectionHelper.updateItem(String(itemId), buildUpdatePayload(payload));
			onUpdated?.();
			onClose();
		} catch (error) {
			console.error('Error deleting image:', error);
		} finally {
			setLoading(prev => ({ ...prev, delete: false }));
		}
	}, [buildUpdatePayload, collection, collectionFields, field, itemId, loading, onClose, onUpdated]);

	const actionItems = useMemo(() => {
		const withGrouping = (items: Array<Record<string, any>>) =>
			items.map((item, index) => ({
				...item,
				groupPosition:
					items.length === 1
						? 'single'
						: index === 0
							? 'top'
							: index === items.length - 1
								? 'bottom'
								: 'middle',
				showSeparator: index !== items.length - 1,
			}));

		const cancelItem = {
			key: isDelete ? 'delete-cancel' : 'cancel',
			label: translate(TranslationKeys.cancel),
			icon: <MaterialCommunityIcons name="close" size={24} />,
			groupPosition: 'single',
			showSeparator: false,
			isCancel: true,
			onPress: () => {
				if (isDelete) {
					setIsDelete(false);
				}
				onClose();
			},
		};

		if (isDelete) {
			const deleteItems = withGrouping([
				{
					key: 'delete-confirm',
					label: translate(TranslationKeys.delete),
					icon: <MaterialCommunityIcons name="delete" size={24} />,
					rightElement: loading.delete ? <ActivityIndicator size="small" color={theme.screen.icon} /> : null,
					onPress: handleDeleteImage,
				},
				{
					key: 'delete-back',
					label: translate(TranslationKeys.navigate_back),
					icon: <MaterialCommunityIcons name="keyboard-backspace" size={24} />,
					onPress: () => setIsDelete(false),
				},
			]);

			return [...deleteItems, cancelItem];
		}

		const items = [];
		if (!isWeb) {
			items.push({
				key: 'camera',
				label: translate(TranslationKeys.camera),
				icon: <Ionicons name="camera" size={24} />,
				rightElement: loading.camera ? <ActivityIndicator size="small" color={theme.screen.icon} /> : null,
				onPress: () => handleImagePick(true),
			});
		}
		items.push({
			key: 'gallery',
			label: translate(TranslationKeys.gallery),
			icon: <MaterialCommunityIcons name="folder-image" size={24} />,
			rightElement: loading.image ? <ActivityIndicator size="small" color={theme.screen.icon} /> : null,
			onPress: () => handleImagePick(false),
		});
		items.push({
			key: 'delete',
			label: translate(TranslationKeys.delete),
			icon: <MaterialCommunityIcons name="delete" size={24} />,
			rightIcon: <MaterialCommunityIcons name="arrow-right" size={24} color={theme.screen.icon} />,
			onPress: () => setIsDelete(true),
		});

		return [...withGrouping(items), cancelItem];
	}, [handleDeleteImage, handleImagePick, isDelete, loading, onClose, theme.screen.icon, translate]);

	return (
		<View style={{ width: '100%' }}>
			{actionItems.map((item, index) => {
				return (
					<View key={item.key} style={item.isCancel && index > 0 ? { marginTop: settingsListSectionGap } : undefined}>
						<SettingsList
							label={item.label}
							leftIcon={item.icon}
							groupPosition={item.groupPosition}
							showSeparator={item.showSeparator}
							rightElement={item.rightElement}
							rightIcon={item.rightIcon}
							handleFunction={item.onPress}
						/>
					</View>
				);
			})}
		</View>
	);
};

const useMyScrollviewDirectusImageEditModal = () => {
	const { show, close } = useMyScrollViewModal();
	const { translate } = useLanguage();

	const closeModal = useCallback(() => {
		close();
	}, [close]);

	const openDirectusImageEditModal = useCallback(
		({ itemId, field, collection, onUpdated, title }: DirectusImageEditModalOptions) => {
			if (!itemId) return;
			show({
				title: title ?? `${translate(TranslationKeys.edit)}: ${translate(TranslationKeys.image)}`,
				children: (
					<DirectusImageEditModalContent
						itemId={String(itemId)}
						field={field}
						collection={collection}
						onUpdated={onUpdated}
						onClose={closeModal}
					/>
				),
			});
		},
		[closeModal, show, translate]
	);

	return { openDirectusImageEditModal, closeDirectusImageEditModal: closeModal };
};

export default useMyScrollviewDirectusImageEditModal;
