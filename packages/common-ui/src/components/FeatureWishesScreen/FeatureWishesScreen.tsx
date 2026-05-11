import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DatabaseTypes } from 'repo-depkit-common';
import { useTheme } from '../../context/ThemeContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { myContrastColor } from '../../helpers/ColorHelper';
import { borderRadiusContainer, horizontalScreenPadding } from '../../constants/ui';
import { lightTheme } from '../../themes';
import type { Theme } from '../../themes';
import SettingsList from '../SettingsList';
import SettingsListLikeButton from '../SettingsListLikeButton';
import { useMyScrollViewModal } from '../GlobalModal/useMyScrollViewModal';

export type FeatureWishItem = Partial<DatabaseTypes.FeatureWhishes>;

export interface FeatureWishesScreenTexts {
	introText?: string;
	filterPublishedLabel?: string;
	filterDraftLabel?: string;
	approveLabel?: string;
	approvedLabel?: string;
	searchPlaceholder?: string;
	createButtonLabel?: string;
	createModalDescriptionPlaceholder?: string;
	createModalConfirmLabel?: string;
	pendingReviewTitle?: string;
	pendingReviewMessage?: string;
}

export interface FeatureWishesScreenProps {
	isAdmin?: boolean;
	primaryColor?: string;
	texts?: FeatureWishesScreenTexts;
}

const DEFAULT_ITEMS: FeatureWishItem[] = [
	{
		id: '1',
		title: 'Dark Mode',
		description: 'Add a dark mode for the entire app to reduce eye strain and save battery life.',
		likes: 42,
		status: 'published',
	},
	{
		id: '2',
		title: 'Weekly Plan Widget',
		description: 'Show the weekly meal plan as a home screen widget so users can see what is available at a glance.',
		likes: 31,
		status: 'published',
	},
	{
		id: '3',
		title: 'Calorie Counter',
		description: 'Add a feature to track daily calorie intake based on the meals consumed in the canteen.',
		likes: 28,
		status: 'draft',
	},
	{
		id: '4',
		title: 'Favorites List',
		description: 'Allow users to mark dishes as favorites and create a personal list of favorite meals.',
		likes: 19,
		status: 'draft',
	},
	{
		id: '5',
		title: 'Push Notifications for Favorite Meals',
		description: 'Receive notifications when a specific favorite dish is available on the menu.',
		likes: 15,
		status: 'published',
	},
];

const STATUS_PUBLISHED = 'published';
const STATUS_DRAFT = 'draft';

const FeatureWishesScreen: React.FC<FeatureWishesScreenProps> = ({
	isAdmin = false,
	primaryColor,
	texts,
}) => {
	const { theme, isDark } = useTheme();
	const settingsCtx = useSettingsContext();
	const resolvedPrimaryColor = primaryColor ?? settingsCtx?.primaryColor ?? lightTheme.primary;
	const contrastColor = myContrastColor(resolvedPrimaryColor, theme, isDark);

	const [items, setItems] = useState<FeatureWishItem[]>(DEFAULT_ITEMS);
	const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
	const [activeFilter, setActiveFilter] = useState<string>(STATUS_PUBLISHED);
	const [searchText, setSearchText] = useState('');

	const { show, showAndDiscardOthers } = useMyScrollViewModal();

	const introText =
		texts?.introText ?? 'Here you can wish for features. Like suggestions you find good!';
	const filterPublishedLabel = texts?.filterPublishedLabel ?? 'Veröffentlichte Wünsche';
	const filterDraftLabel = texts?.filterDraftLabel ?? 'Neue Wünsche';
	const approveLabel = texts?.approveLabel ?? 'Genehmigen';
	const approvedLabel = texts?.approvedLabel ?? 'Genehmigt';
	const searchPlaceholder = texts?.searchPlaceholder ?? 'Feature Wunsch suchen oder erstellen …';
	const createButtonLabel = texts?.createButtonLabel ?? 'Feature Wunsch erstellen';
	const createModalDescriptionPlaceholder =
		texts?.createModalDescriptionPlaceholder ?? 'Beschreibe deinen Feature Wunsch …';
	const createModalConfirmLabel = texts?.createModalConfirmLabel ?? 'Erstellen';
	const pendingReviewTitle = texts?.pendingReviewTitle ?? 'Wunsch eingereicht';
	const pendingReviewMessage =
		texts?.pendingReviewMessage ??
		'Dein Feature Wunsch wird nun geprüft (z. B. auf Verstöße oder unangemessene Sprache) und danach veröffentlicht.';

	const visibleItems = useMemo(() => {
		let filtered = items.filter((i) => i.status === activeFilter);
		const query = searchText.trim().toLowerCase();
		if (query) {
			filtered = filtered.filter(
				(i) =>
					i.title?.toLowerCase().includes(query) ||
					i.description?.toLowerCase().includes(query)
			);
		}
		return [...filtered].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
	}, [items, activeFilter, searchText]);

	const handleLike = useCallback((id: string) => {
		setLikedIds((prev) => {
			const wasLiked = prev.has(id);
			const next = new Set(prev);
			if (wasLiked) {
				next.delete(id);
			} else {
				next.add(id);
			}
			setItems((prevItems) =>
				prevItems.map((item) => {
					if (item.id !== id) return item;
					return { ...item, likes: (item.likes ?? 0) + (wasLiked ? -1 : 1) };
				})
			);
			return next;
		});
	}, []);

	const handleApprove = useCallback(
		(id: string) => {
			setItems((prev) =>
				prev.map((item) => (item.id === id ? { ...item, status: STATUS_PUBLISHED } : item))
			);
			showAndDiscardOthers({
				title: approvedLabel,
				children: (
					<PendingReviewContent
						message={approveLabel + ' ✓'}
						theme={theme}
					/>
				),
			});
		},
		[showAndDiscardOthers, approveLabel, approvedLabel, theme]
	);

	const handleCreate = useCallback(
		(title: string, description: string) => {
			const newItem: FeatureWishItem = {
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
				title,
				description,
				likes: 0,
				status: STATUS_DRAFT,
				date_created: new Date().toISOString(),
			};
			setItems((prev) => [newItem, ...prev]);
			setSearchText('');
			showAndDiscardOthers({
				title: pendingReviewTitle,
				children: (
					<PendingReviewContent
						message={pendingReviewMessage}
						theme={theme}
					/>
				),
			});
		},
		[showAndDiscardOthers, pendingReviewTitle, pendingReviewMessage, theme]
	);

	const openDetail = useCallback(
		(item: FeatureWishItem) => {
			show({
				title: item.title ?? '',
				children: (
					<DetailContent
						item={item}
						isAdmin={isAdmin}
						approveLabel={approveLabel}
						approvedLabel={approvedLabel}
						primaryColor={resolvedPrimaryColor}
						onApprove={() => handleApprove(item.id ?? '')}
						theme={theme}
					/>
				),
			});
		},
		[show, isAdmin, approveLabel, approvedLabel, resolvedPrimaryColor, handleApprove, theme]
	);

	const showCreateModal = useCallback(() => {
		const title = searchText.trim();
		if (!title) return;
		show({
			title,
			children: (
				<CreateWishContent
					descriptionPlaceholder={createModalDescriptionPlaceholder}
					createConfirmLabel={createModalConfirmLabel}
					primaryColor={resolvedPrimaryColor}
					contrastColor={contrastColor}
					theme={theme}
					onConfirm={(description) => handleCreate(title, description)}
				/>
			),
		});
	}, [
		show,
		searchText,
		createModalDescriptionPlaceholder,
		createModalConfirmLabel,
		resolvedPrimaryColor,
		contrastColor,
		theme,
		handleCreate,
	]);

	const renderItem = useCallback(
		({ item, index }: { item: FeatureWishItem; index: number }) => {
			const total = visibleItems.length;
			const groupPosition =
				total === 1 ? 'single' : index === 0 ? 'top' : index === total - 1 ? 'bottom' : 'middle';
			const isLiked = likedIds.has(item.id ?? '');

			return (
				<SettingsList
					key={item.id}
					title={item.title ?? ''}
					iconBgColor={resolvedPrimaryColor}
					leftIcon={
						<MaterialCommunityIcons name="lightbulb-outline" size={22} color={contrastColor} />
					}
					rightElement={
						<SettingsListLikeButton
							liked={isLiked}
							likeCount={item.likes ?? 0}
							onPressLike={() => handleLike(item.id ?? '')}
							primaryColor={resolvedPrimaryColor}
						/>
					}
					groupPosition={groupPosition}
					showSeparator={groupPosition !== 'bottom' && groupPosition !== 'single'}
					onPress={() => openDetail(item)}
				/>
			);
		},
		[visibleItems.length, resolvedPrimaryColor, contrastColor, likedIds, handleLike, openDetail]
	);

	const keyExtractor = useCallback((item: FeatureWishItem) => item.id ?? '', []);

	const filterButtonStyle = (active: boolean) => [
		styles.filterButton,
		{
			backgroundColor: active ? resolvedPrimaryColor : theme.screen.iconBg,
			borderColor: resolvedPrimaryColor,
		},
	];

	const filterTextStyle = (active: boolean) => ({
		color: active ? myContrastColor(resolvedPrimaryColor, theme, isDark) : theme.screen.text,
		fontSize: 13,
		fontWeight: '600' as const,
	});

	const showCreateButton = searchText.trim().length > 0;

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background }]}>
			<View style={styles.header}>
				<Text style={[styles.introText, { color: theme.screen.text }]}>{introText}</Text>
				<View
					style={[
						styles.searchInputContainer,
						{ backgroundColor: theme.screen.iconBg },
					]}
				>
					<MaterialCommunityIcons
						name="magnify"
						size={20}
						color={theme.screen.icon}
						style={styles.searchIcon}
					/>
					<TextInput
						style={[styles.searchInput, { color: theme.screen.text }]}
						value={searchText}
						onChangeText={setSearchText}
						placeholder={searchPlaceholder}
						placeholderTextColor={theme.screen.placeholder}
						returnKeyType="search"
					/>
					{showCreateButton && (
						<Pressable onPress={() => setSearchText('')} style={styles.clearButton}>
							<MaterialCommunityIcons name="close-circle" size={18} color={theme.screen.icon} />
						</Pressable>
					)}
				</View>
				{showCreateButton && (
					<Pressable
						style={[styles.createButton, { backgroundColor: resolvedPrimaryColor }]}
						onPress={showCreateModal}
					>
						<MaterialCommunityIcons name="plus-circle-outline" size={18} color={contrastColor} />
						<Text style={[styles.createButtonText, { color: contrastColor }]}>
							{createButtonLabel}
						</Text>
					</Pressable>
				)}
				<View style={styles.filterRow}>
					<Pressable
						style={filterButtonStyle(activeFilter === STATUS_PUBLISHED)}
						onPress={() => setActiveFilter(STATUS_PUBLISHED)}
					>
						<Text style={filterTextStyle(activeFilter === STATUS_PUBLISHED)}>
							{filterPublishedLabel}
						</Text>
					</Pressable>
					<Pressable
						style={filterButtonStyle(activeFilter === STATUS_DRAFT)}
						onPress={() => setActiveFilter(STATUS_DRAFT)}
					>
						<Text style={filterTextStyle(activeFilter === STATUS_DRAFT)}>
							{filterDraftLabel}
						</Text>
					</Pressable>
				</View>
			</View>
			<FlatList
				data={visibleItems}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				contentContainerStyle={styles.listContent}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			/>
		</View>
	);
};

interface CreateWishContentProps {
	descriptionPlaceholder: string;
	createConfirmLabel: string;
	primaryColor: string;
	contrastColor: string;
	theme: Theme;
	onConfirm: (description: string) => void;
}

const CreateWishContent: React.FC<CreateWishContentProps> = ({
	descriptionPlaceholder,
	createConfirmLabel,
	primaryColor,
	contrastColor,
	theme,
	onConfirm,
}) => {
	const [description, setDescription] = useState('');
	const isDisabled = description.trim().length === 0;

	return (
		<View style={createStyles.container}>
			<TextInput
				style={[
					createStyles.descriptionInput,
					{
						color: theme.screen.text,
						backgroundColor: theme.screen.iconBg,
						borderColor: theme.screen.iconBg,
					},
				]}
				value={description}
				onChangeText={setDescription}
				placeholder={descriptionPlaceholder}
				placeholderTextColor={theme.screen.placeholder}
				multiline
				numberOfLines={4}
				textAlignVertical="top"
			/>
			<Pressable
				style={[
					createStyles.confirmButton,
					{ backgroundColor: isDisabled ? theme.screen.iconBg : primaryColor },
				]}
				onPress={() => !isDisabled && onConfirm(description)}
				disabled={isDisabled}
			>
				<Text
					style={[
						createStyles.confirmButtonText,
						{ color: isDisabled ? theme.screen.placeholder : contrastColor },
					]}
				>
					{createConfirmLabel}
				</Text>
			</Pressable>
		</View>
	);
};

interface PendingReviewContentProps {
	message: string;
	theme: Theme;
}

const PendingReviewContent: React.FC<PendingReviewContentProps> = ({ message, theme }) => (
	<View style={reviewStyles.container}>
		<MaterialCommunityIcons name="clock-check-outline" size={48} color={theme.screen.text} />
		<Text style={[reviewStyles.message, { color: theme.screen.text }]}>{message}</Text>
	</View>
);

interface DetailContentProps {
	item: FeatureWishItem;
	isAdmin: boolean;
	approveLabel: string;
	approvedLabel: string;
	primaryColor: string;
	onApprove: () => void;
	theme: Theme;
}

const DetailContent: React.FC<DetailContentProps> = ({
	item,
	isAdmin,
	approveLabel,
	approvedLabel,
	primaryColor,
	onApprove,
	theme,
}) => {
	const { isDark } = useTheme();
	const contrastOnPrimary = myContrastColor(primaryColor, theme, isDark);
	const isDraft = item.status === STATUS_DRAFT;

	return (
		<View style={detailStyles.container}>
			<Text style={[detailStyles.description, { color: theme.screen.text }]}>
				{item.description}
			</Text>
			{isAdmin && isDraft && (
				<Pressable
					style={[detailStyles.approveButton, { backgroundColor: primaryColor }]}
					onPress={onApprove}
				>
					<MaterialCommunityIcons name="check-circle-outline" size={20} color={contrastOnPrimary} />
					<Text style={[detailStyles.approveButtonText, { color: contrastOnPrimary }]}>
						{approveLabel}
					</Text>
				</Pressable>
			)}
			{isAdmin && !isDraft && (
				<View style={[detailStyles.approvedBadge, { borderColor: primaryColor }]}>
					<MaterialCommunityIcons name="check-circle" size={16} color={primaryColor} />
					<Text style={[detailStyles.approvedText, { color: primaryColor }]}>
						{approvedLabel}
					</Text>
				</View>
			)}
		</View>
	);
};

export default FeatureWishesScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		paddingHorizontal: horizontalScreenPadding,
		paddingVertical: 12,
		gap: 10,
	},
	introText: {
		fontSize: 14,
		lineHeight: 20,
	},
	searchInputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: borderRadiusContainer,
		paddingHorizontal: 10,
		minHeight: 44,
	},
	searchIcon: {
		marginRight: 6,
	},
	searchInput: {
		flex: 1,
		fontSize: 15,
		paddingVertical: 8,
	},
	clearButton: {
		paddingLeft: 6,
	},
	createButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 11,
		paddingHorizontal: 16,
		borderRadius: borderRadiusContainer,
		gap: 8,
	},
	createButtonText: {
		fontSize: 14,
		fontWeight: '600',
	},
	filterRow: {
		flexDirection: 'row',
		gap: 8,
	},
	filterButton: {
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: borderRadiusContainer,
		borderWidth: 1,
	},
	listContent: {
		paddingBottom: 24,
	},
});

const createStyles = StyleSheet.create({
	container: {
		paddingHorizontal: horizontalScreenPadding,
		paddingTop: 8,
		paddingBottom: 20,
		gap: 16,
	},
	descriptionInput: {
		borderRadius: borderRadiusContainer,
		borderWidth: 1,
		padding: 12,
		fontSize: 15,
		minHeight: 100,
	},
	confirmButton: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 13,
		paddingHorizontal: 20,
		borderRadius: borderRadiusContainer,
	},
	confirmButtonText: {
		fontSize: 15,
		fontWeight: '600',
	},
});

const reviewStyles = StyleSheet.create({
	container: {
		paddingHorizontal: horizontalScreenPadding,
		paddingTop: 16,
		paddingBottom: 28,
		alignItems: 'center',
		gap: 16,
	},
	message: {
		fontSize: 15,
		lineHeight: 22,
		textAlign: 'center',
	},
});

const detailStyles = StyleSheet.create({
	container: {
		paddingHorizontal: horizontalScreenPadding,
		paddingTop: 8,
		paddingBottom: 20,
		gap: 16,
	},
	description: {
		fontSize: 15,
		lineHeight: 22,
	},
	approveButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: borderRadiusContainer,
		gap: 8,
	},
	approveButtonText: {
		fontSize: 15,
		fontWeight: '600',
	},
	approvedBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-start',
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: borderRadiusContainer,
		borderWidth: 1,
		gap: 6,
	},
	approvedText: {
		fontSize: 13,
		fontWeight: '600',
	},
});
