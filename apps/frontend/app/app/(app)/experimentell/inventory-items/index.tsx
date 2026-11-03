import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import { Entypo, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { AppScreens, DatabaseTypes } from 'repo-depkit-common';

import SettingsList from '@/components/SettingsList';
import MyImage from '@/components/MyImage';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useAppSelector } from '@/redux/hooks';
import { TranslationKeys } from '@/locales/keys';
import { excerpt } from '@/constants/HelperFunctions';
import { InventoryItemsHelper } from '@/redux/actions/InventoryItems/InventoryItems';

type GroupPosition = 'single' | 'top' | 'bottom' | 'middle';

function getGroupPosition(index: number, total: number): GroupPosition {
	if (total === 1) {
		return 'single';
	}
	if (index === 0) {
		return 'top';
	}
	if (index === total - 1) {
		return 'bottom';
	}
	return 'middle';
}

const InventoryItemsScreen = () => {
	useSetPageTitle(TranslationKeys.inventory_items);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor } = useAppSelector((state) => state.settings);

	const [items, setItems] = useState<DatabaseTypes.InventoryItems[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const inventoryItemsHelper = useMemo(() => new InventoryItemsHelper(), []);

	const loadItems = useCallback(async () => {
		try {
			const result = await inventoryItemsHelper.fetchInventoryItems({
				fields: ['id', 'alias', 'image', 'date_created'],
				sort: ['-date_created'],
				filter: { status: { _in: ['published', 'draft'] } },
				limit: -1,
			});
			setItems(result ?? []);
		} catch (error) {
			console.error('Error loading inventory items:', error);
		}
	}, [inventoryItemsHelper]);

	useFocusEffect(
		useCallback(() => {
			let isActive = true;
			setLoading(true);
			loadItems().finally(() => {
				if (isActive) {
					setLoading(false);
				}
			});
			return () => {
				isActive = false;
			};
		}, [loadItems])
	);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await loadItems();
		setRefreshing(false);
	}, [loadItems]);

	const openDetails = useCallback((id: string) => {
		router.push({
			pathname: `/${AppScreens.INVENTORY_ITEMS}/details`,
			params: { id },
		});
	}, []);

	const renderItemRow = (item: DatabaseTypes.InventoryItems, index: number) => {
		const imageId = typeof item.image === 'string' ? item.image : item.image?.id;
		const label = item.alias ? item.alias : excerpt(String(item.id), 8);
		return (
			<SettingsList
				key={String(item.id)}
				iconBgColor={primaryColor}
				leftIcon={
					imageId ? (
						<MyImage directus_asset_id={imageId} style={styles.thumbnail} contentFit="cover" accessibilityLabel={label} />
					) : (
						<MaterialCommunityIcons name="package-variant-closed" size={24} color={theme.screen.icon} />
					)
				}
				label={label}
				rightIcon={<Entypo name="chevron-small-right" color={theme.screen.icon} size={24} />}
				handleFunction={() => openDetails(String(item.id))}
				groupPosition={getGroupPosition(index, items.length)}
			/>
		);
	};

	return (
		<ScrollView
			style={{ ...styles.container, backgroundColor: theme.screen.background }}
			contentContainerStyle={styles.contentContainer}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.screen.text} />}
		>
			<View style={styles.content}>
				<SettingsList
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="plus" size={24} color={theme.screen.icon} />}
					label={translate(TranslationKeys.inventory_item_create)}
					rightIcon={<Entypo name="chevron-small-right" color={theme.screen.icon} size={24} />}
					handleFunction={() => router.push(`/${AppScreens.EXPERIMENTELL}/${AppScreens.INVENTORY_ITEMS}/create`)}
					groupPosition="single"
				/>

				<View style={styles.listSection}>
					{loading && (
						<View style={styles.centered}>
							<LoadingIndicator size={30} color={theme.screen.text} />
						</View>
					)}
					{!loading && items.length === 0 && <Text style={{ ...styles.emptyText, color: theme.screen.text }}>{translate(TranslationKeys.inventory_items_empty)}</Text>}
					{!loading && items.map(renderItemRow)}
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
		width: '100%',
		maxWidth: 600,
		paddingHorizontal: 16,
		gap: 20,
	},
	listSection: {
		width: '100%',
	},
	centered: {
		height: 200,
		width: '100%',
		justifyContent: 'center',
		alignItems: 'center',
	},
	emptyText: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'center',
		paddingVertical: 40,
	},
	thumbnail: {
		width: 24,
		height: 24,
		borderRadius: 4,
	},
});

export default InventoryItemsScreen;
