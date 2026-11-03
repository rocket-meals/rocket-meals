import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { uploadFiles } from '@directus/sdk';
import { AppScreens } from 'repo-depkit-common';

import MyImage from '@/components/MyImage';
import { ImagePickerMediaTypes } from '@/components/FileUpload/FileUpload';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import useToast from '@/hooks/useToast';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { MAX_IMAGE_DIMENSION, resizeImageIfTooLarge } from '@/hooks/useMyScrollviewDirectusImageEditModal';
import { useAppSelector } from '@/redux/hooks';
import { TranslationKeys } from '@/locales/keys';
import { myContrastColor } from '@/helper/ColorHelper';
import { buildDirectusUploadFormData } from '@/helper/fileUploadHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';
import { InventoryItemsHelper } from '@/redux/actions/InventoryItems/InventoryItems';

/**
 * Directus folder the `inventory_items.image` field stores its uploads in
 * (`meta.options.folder` of
 * data/directus-sync-data/configuration/directus-config/snapshot/fields/inventory_items/image.json).
 */
const INVENTORY_ITEMS_IMAGE_FOLDER_ID = '8444dd1c-5d7c-4628-96cb-a7b503a42701';

/**
 * `schema.default_value` of
 * data/directus-sync-data/configuration/directus-config/snapshot/fields/inventory_items/status.json.
 */
const INVENTORY_ITEM_DEFAULT_STATUS = 'draft';

const CreateInventoryItemScreen = () => {
	useSetPageTitle(TranslationKeys.inventory_item_create);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const showToast = useToast();
	const { primaryColor, selectedTheme: mode } = useAppSelector((state) => state.settings);

	const [alias, setAlias] = useState('');
	const [note, setNote] = useState('');
	const [imageUri, setImageUri] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');
	const inventoryItemsHelper = useMemo(() => new InventoryItemsHelper(), []);

	const pickImage = useCallback(async () => {
		try {
			const permissionResponse = await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (!permissionResponse.granted) {
				showToast(`${translate(TranslationKeys.no_permission_for)} ${translate(TranslationKeys.gallery)}`, 'error');
				return;
			}

			const pickerResult = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: [ImagePickerMediaTypes.Images],
				allowsEditing: true,
				aspect: [1, 1],
				allowsMultipleSelection: false,
				selectionLimit: 1,
				quality: 1,
			});

			const asset = pickerResult.canceled ? null : pickerResult.assets[0];
			if (!asset) {
				return;
			}

			const finalUri = await resizeImageIfTooLarge(asset.uri, asset.width, asset.height, MAX_IMAGE_DIMENSION);
			setImageUri(finalUri);
		} catch (error) {
			console.error('Error selecting inventory item image:', error);
			showToast(translate(TranslationKeys.error), 'error');
		}
	}, [showToast, translate]);

	const uploadImage = useCallback(async (uri: string, fileName: string): Promise<string> => {
		const formData = await buildDirectusUploadFormData({
			uri,
			fileName,
			folderId: INVENTORY_ITEMS_IMAGE_FOLDER_ID,
			title: fileName,
		});
		const result = await ServerAPI.getClient().request(uploadFiles(formData));
		return result.id;
	}, []);

	const handleSave = useCallback(async () => {
		if (saving) {
			return;
		}
		const trimmedAlias = alias.trim();
		if (!trimmedAlias) {
			showToast(translate(TranslationKeys.inventory_item_name_required), 'error');
			return;
		}

		setSaving(true);
		try {
			let imageId: string | null = null;
			if (imageUri) {
				imageId = await uploadImage(imageUri, trimmedAlias);
			}

			const trimmedNote = note.trim();
			const createdItem = await inventoryItemsHelper.createInventoryItem({
				alias: trimmedAlias,
				note: trimmedNote || null,
				image: imageId,
				status: INVENTORY_ITEM_DEFAULT_STATUS,
			});

			showToast(translate(TranslationKeys.inventory_item_created), 'success');
			router.replace({
				pathname: `/${AppScreens.INVENTORY_ITEMS}/details`,
				params: { id: String(createdItem.id) },
			});
		} catch (error) {
			console.error('Error creating inventory item:', error);
			showToast(translate(TranslationKeys.inventory_item_create_failed), 'error');
		} finally {
			setSaving(false);
		}
	}, [alias, imageUri, inventoryItemsHelper, note, saving, showToast, translate, uploadImage]);

	return (
		<ScrollView style={{ ...styles.container, backgroundColor: theme.screen.background }} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
			<View style={styles.content}>
				<Text style={{ ...styles.label, color: theme.screen.text }}>{translate(TranslationKeys.inventory_item_name)}</Text>
				<TextInput
					style={{ ...styles.input, color: theme.screen.text }}
					value={alias}
					onChangeText={setAlias}
					placeholder={translate(TranslationKeys.type_here)}
					placeholderTextColor={theme.screen.placeholder}
					cursorColor={theme.screen.text}
					editable={!saving}
				/>

				<Text style={{ ...styles.label, color: theme.screen.text }}>{translate(TranslationKeys.inventory_item_note)}</Text>
				<TextInput
					style={{ ...styles.multiLineInput, color: theme.screen.text }}
					value={note}
					onChangeText={setNote}
					placeholder={translate(TranslationKeys.type_here)}
					placeholderTextColor={theme.screen.placeholder}
					cursorColor={theme.screen.text}
					multiline
					numberOfLines={5}
					textAlignVertical="top"
					editable={!saving}
				/>

				<Text style={{ ...styles.label, color: theme.screen.text }}>{translate(TranslationKeys.inventory_item_image)}</Text>
				{imageUri && <MyImage remote_image_url={imageUri} style={styles.imagePreview} contentFit="cover" accessibilityLabel={translate(TranslationKeys.inventory_item_image)} />}
				<View style={styles.imageActions}>
					<TouchableOpacity style={{ ...styles.secondaryButton, borderColor: theme.screen.icon }} onPress={pickImage} disabled={saving}>
						<MaterialCommunityIcons name="image-plus" size={20} color={theme.screen.icon} />
						<Text style={{ ...styles.secondaryButtonText, color: theme.screen.text }}>{translate(TranslationKeys.inventory_item_select_image)}</Text>
					</TouchableOpacity>
					{imageUri && (
						<TouchableOpacity style={{ ...styles.secondaryButton, borderColor: theme.screen.icon }} onPress={() => setImageUri(null)} disabled={saving}>
							<MaterialCommunityIcons name="image-remove" size={20} color={theme.screen.icon} />
							<Text style={{ ...styles.secondaryButtonText, color: theme.screen.text }}>{translate(TranslationKeys.inventory_item_remove_image)}</Text>
						</TouchableOpacity>
					)}
				</View>

				<TouchableOpacity style={{ ...styles.saveButton, backgroundColor: primaryColor }} onPress={handleSave} disabled={saving}>
					{saving ? <LoadingIndicator size="small" color={contrastColor} /> : <Text style={{ ...styles.saveButtonText, color: contrastColor }}>{translate(TranslationKeys.save)}</Text>}
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: '100%',
	},
	contentContainer: {
		alignItems: 'center',
		paddingVertical: 20,
	},
	content: {
		width: '100%',
		maxWidth: 600,
		paddingHorizontal: 16,
		gap: 10,
	},
	label: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		marginTop: 10,
	},
	input: {
		width: '100%',
		height: 50,
		borderRadius: 10,
		paddingHorizontal: 20,
		fontFamily: 'Poppins_400Regular',
		fontSize: 16,
		borderWidth: 1,
		borderColor: '#3A3A3A',
		outlineWidth: 0,
		outlineColor: 'transparent',
	},
	multiLineInput: {
		width: '100%',
		minHeight: 120,
		borderRadius: 10,
		paddingHorizontal: 20,
		paddingTop: 10,
		fontFamily: 'Poppins_400Regular',
		fontSize: 16,
		borderWidth: 1,
		borderColor: '#3A3A3A',
		outlineWidth: 0,
		outlineColor: 'transparent',
		textAlignVertical: 'top',
	},
	imagePreview: {
		width: '100%',
		aspectRatio: 1,
		borderRadius: 10,
	},
	imageActions: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	secondaryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 10,
		borderWidth: 1,
	},
	secondaryButtonText: {
		fontSize: 15,
		fontFamily: 'Poppins_400Regular',
	},
	saveButton: {
		width: '100%',
		height: 50,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 20,
	},
	saveButtonText: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
});

export default CreateInventoryItemScreen;
