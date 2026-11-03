import React, { useCallback, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { AppLinks, AppScreens, CollectionNames, DatabaseTypes } from 'repo-depkit-common';

import CardWithText from '@/components/CardWithText/CardWithText';
import MyMarkdownProjectColored from '@/components/MyMarkdownProjectColored';
import QrCode from '@/components/QrCode';
import SettingsList from '@/components/SettingsList';
import { getAppIconInsideExpoLocalSaved } from '@/config';
import { getImageUrl } from '@/constants/HelperFunctions';
import { myContrastColor } from '@/helper/ColorHelper';
import useCustomerConfig from '@/hooks/useCustomerConfig';
import { useLanguage } from '@/hooks/useLanguage';
import useMyScrollviewDirectusImageEditModal from '@/hooks/useMyScrollviewDirectusImageEditModal';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';
import { InventoryItemsHelper } from '@/redux/actions/InventoryItems/InventoryItems';
import { useAppSelector } from '@/redux/hooks';

const MAX_CONTENT_WIDTH = 600;
const MAX_QR_SIZE = 260;

function getSingleParam(param: string | string[] | undefined): string {
	if (Array.isArray(param)) {
		return param[0] ?? '';
	}
	return param ?? '';
}

const InventoryItemDetailsScreen = () => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const customerConfig = useCustomerConfig();
	const { width: screenWidth } = useWindowDimensions();
	const { primaryColor, selectedTheme: mode } = useAppSelector((state) => state.settings);
	const { openDirectusImageEditModal } = useMyScrollviewDirectusImageEditModal();

	const { id } = useLocalSearchParams<{ id?: string | string[] }>();
	const itemId = getSingleParam(id);

	const [item, setItem] = useState<DatabaseTypes.InventoryItems | null>(null);
	const [loading, setLoading] = useState(true);

	const inventoryItemsHelper = useMemo(() => new InventoryItemsHelper(), []);

	useSetPageTitle(item?.alias ? item.alias : TranslationKeys.inventory_item);

	const loadItem = useCallback(async () => {
		if (!itemId) {
			setItem(null);
			return;
		}
		try {
			const result = await inventoryItemsHelper.fetchInventoryItemById(itemId);
			setItem(result ?? null);
		} catch (error) {
			console.error('Error loading inventory item:', error);
			setItem(null);
		}
	}, [inventoryItemsHelper, itemId]);

	useFocusEffect(
		useCallback(() => {
			let isActive = true;
			setLoading(true);
			loadItem().finally(() => {
				if (isActive) {
					setLoading(false);
				}
			});
			return () => {
				isActive = false;
			};
		}, [loadItem])
	);

	const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');
	const contentWidth = Math.min(screenWidth - 32, MAX_CONTENT_WIDTH);
	const qrSize = Math.min(screenWidth * 0.6, MAX_QR_SIZE);

	const publicUrl = itemId ? AppLinks.getPublicWebUrl(customerConfig.baseUrl, `${AppScreens.INVENTORY_ITEMS}/details`, [{ key: 'id', value: itemId }]) : '';

	const imageId = typeof item?.image === 'string' ? item.image : item?.image?.id;
	const imageUrl = imageId ? getImageUrl(String(imageId)) : null;
	const title = item?.alias ? item.alias : translate(TranslationKeys.inventory_item);

	const openImageEditModal = useCallback(() => {
		if (!itemId) {
			return;
		}
		openDirectusImageEditModal({
			itemId,
			field: 'image',
			collection: CollectionNames.INVENTORY_ITEMS,
			onUpdated: loadItem,
		});
	}, [itemId, loadItem, openDirectusImageEditModal]);

	if (loading) {
		return (
			<View style={{ ...styles.centered, backgroundColor: theme.screen.background }}>
				<LoadingIndicator size={30} color={theme.screen.text} />
			</View>
		);
	}

	if (!item) {
		return (
			<View style={{ ...styles.centered, backgroundColor: theme.screen.background }}>
				<Text style={{ ...styles.notFoundText, color: theme.screen.text }}>{translate(TranslationKeys.inventory_item_not_found)}</Text>
			</View>
		);
	}

	return (
		<ScrollView style={{ ...styles.container, backgroundColor: theme.screen.background }} contentContainerStyle={styles.contentContainer}>
			<View style={{ ...styles.content, width: contentWidth }}>
				<CardWithText
					knownCardWidth={contentWidth}
					containerStyle={{ ...styles.card, backgroundColor: theme.card.background }}
					imageContainerStyle={{ backgroundColor: theme.card.imageBg }}
					borderColor={primaryColor}
					imageSource={imageUrl ? { uri: imageUrl } : undefined}
					imageAccessibilityLabel={title}
					imageChildren={
						imageUrl ? undefined : (
							<View style={styles.imagePlaceholder}>
								<MaterialCommunityIcons name="package-variant" size={64} color={theme.card.text} />
							</View>
						)
					}
					bottomContent={<Text style={{ ...styles.cardTitle, color: theme.screen.text }}>{title}</Text>}
				/>

				<SettingsList
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="image-edit" size={24} color={theme.screen.icon} />}
					label={`${translate(TranslationKeys.edit)}: ${translate(TranslationKeys.inventory_item_image)}`}
					handleFunction={openImageEditModal}
					groupPosition="single"
				/>

				{!!item.note && (
					<View style={styles.section}>
						<MyMarkdownProjectColored content={item.note} textColor={theme.screen.text} />
					</View>
				)}

				<View style={styles.section}>
					<Text style={{ ...styles.sectionTitle, color: theme.screen.text }}>{translate(TranslationKeys.inventory_item_qr_code)}</Text>
					<View style={styles.qrContainer}>
						<QrCode value={publicUrl} size={qrSize} image={getAppIconInsideExpoLocalSaved()} innerSize={21} backgroundColor="white" />
					</View>
					<Text style={{ ...styles.hintText, color: theme.screen.text }}>{translate(TranslationKeys.inventory_item_qr_code_hint)}</Text>
					<Text selectable style={{ ...styles.urlText, color: theme.screen.text }}>
						{publicUrl}
					</Text>
					<TouchableOpacity style={{ ...styles.linkButton, backgroundColor: primaryColor }} onPress={() => Linking.openURL(publicUrl)}>
						<Text style={{ ...styles.linkButtonText, color: contrastColor }}>{translate(TranslationKeys.inventory_item_open_link)}</Text>
					</TouchableOpacity>
				</View>
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
		gap: 20,
	},
	centered: {
		flex: 1,
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
	},
	notFoundText: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'center',
	},
	card: {
		borderRadius: 10,
		overflow: 'hidden',
	},
	imagePlaceholder: {
		width: '100%',
		height: '100%',
		alignItems: 'center',
		justifyContent: 'center',
	},
	cardTitle: {
		fontSize: 18,
		fontFamily: 'Poppins_400Regular',
		paddingHorizontal: 10,
		paddingVertical: 10,
	},
	section: {
		width: '100%',
		gap: 10,
	},
	sectionTitle: {
		fontSize: 18,
		fontFamily: 'Poppins_400Regular',
	},
	qrContainer: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	hintText: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'center',
	},
	urlText: {
		fontSize: 13,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'center',
	},
	linkButton: {
		width: '100%',
		height: 50,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	linkButtonText: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
});

export default InventoryItemDetailsScreen;
