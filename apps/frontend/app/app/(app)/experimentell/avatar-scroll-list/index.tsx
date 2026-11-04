import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, DimensionValue, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { CollectionHelper } from '@/helper/collectionHelper';
import { DatabaseTypes } from 'repo-depkit-common';
import { AvatarConfig, MyAvatar } from 'repo-depkit-common-ui';
import { parseProfileAvatar, AVATAR_BACKGROUND } from '@/hooks/useAvatarProfileEditor';

const PAGE_SIZE = 24;
const AVATAR_RENDER_SIZE = 80;
const MIN_ITEM_WIDTH = 110;

const profilesHelper = new CollectionHelper<DatabaseTypes.Profiles>('profiles');

interface AvatarListItem {
	id: string;
	nickname: string | null;
	config: AvatarConfig;
}

// Same query as the onboarding avatar carousel: only profiles that actually have
// an avatar are loaded from the backend - no default/preset avatars are mixed in.
// Paginated via limit/offset; the id tiebreaker keeps the order stable while
// scrolling even when many profiles share the same (or no) date_updated.
async function fetchProfilesPage(offset: number): Promise<DatabaseTypes.Profiles[]> {
	return await profilesHelper.readItems({
		filter: { avatar: { _nnull: true } },
		sort: ['-date_updated', 'id'],
		fields: ['id', 'nickname', 'avatar'],
		limit: PAGE_SIZE,
		offset,
	});
}

// Profiles whose avatar field cannot be parsed into a config are skipped -
// the list only shows real, renderable server avatars.
function toAvatarListItems(profiles: DatabaseTypes.Profiles[]): AvatarListItem[] {
	const items: AvatarListItem[] = [];
	for (const profile of profiles) {
		const config = parseProfileAvatar(profile.avatar);
		if (config) {
			items.push({ id: String(profile.id), nickname: profile.nickname ?? null, config });
		}
	}
	return items;
}

const AvatarScrollListScreen = () => {
	useSetPageTitle(TranslationKeys.avatar_scroll_list);
	const { theme } = useTheme();
	const { translate } = useLanguage();

	const [items, setItems] = useState<AvatarListItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	// Offset counts fetched profiles (not rendered items), since unparseable avatars are skipped.
	const offsetRef = useRef(0);
	// Guards against parallel page loads (onEndReached can fire multiple times while scrolling).
	const loadingMoreRef = useRef(false);

	useEffect(() => {
		const handleResize = () => setScreenWidth(Dimensions.get('window').width);
		const subscription = Dimensions.addEventListener('change', handleResize);
		return () => subscription?.remove();
	}, []);

	const numColumns = useMemo(() => {
		return Math.max(2, Math.min(6, Math.floor(screenWidth / MIN_ITEM_WIDTH)));
	}, [screenWidth]);

	const appendUniqueItems = useCallback((prev: AvatarListItem[], page: AvatarListItem[]) => {
		const knownIds = new Set(prev.map((item) => item.id));
		return [...prev, ...page.filter((item) => !knownIds.has(item.id))];
	}, []);

	const loadInitial = useCallback(async () => {
		try {
			const page = await fetchProfilesPage(0);
			offsetRef.current = page.length;
			setItems(toAvatarListItems(page));
			setHasMore(page.length === PAGE_SIZE);
		} catch (e) {
			console.error('[AvatarScrollList] Error loading profiles', e);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadInitial();
	}, [loadInitial]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await loadInitial();
		setRefreshing(false);
	}, [loadInitial]);

	const loadMore = useCallback(async () => {
		if (loadingMoreRef.current || !hasMore || loading) return;
		loadingMoreRef.current = true;
		setLoadingMore(true);
		try {
			const page = await fetchProfilesPage(offsetRef.current);
			offsetRef.current += page.length;
			setItems((prev) => appendUniqueItems(prev, toAvatarListItems(page)));
			setHasMore(page.length === PAGE_SIZE);
		} catch (e) {
			console.error('[AvatarScrollList] Error loading more profiles', e);
		} finally {
			loadingMoreRef.current = false;
			setLoadingMore(false);
		}
	}, [hasMore, loading, appendUniqueItems]);

	const renderItem = useCallback(
		({ item }: { item: AvatarListItem }) => {
			const displayName = item.nickname || `#${item.id.slice(0, 8)}`;
			return (
				<View style={[styles.profileItem, { width: (100 / numColumns + '%') as DimensionValue }]}>
					<MyAvatar
						style={item.config.style}
						options={item.config.options}
						size={AVATAR_RENDER_SIZE}
						rounded={true}
						backgroundColor={AVATAR_BACKGROUND}
					/>
					<Text style={[styles.profileName, { color: theme.screen.text }]} numberOfLines={1}>
						{displayName}
					</Text>
				</View>
			);
		},
		[numColumns, theme.screen.text]
	);

	if (loading) {
		return (
			<View style={[styles.loader, { backgroundColor: theme.screen.background }]}>
				<LoadingIndicator />
			</View>
		);
	}

	return (
		<FlatList
			// Changing numColumns on the fly is not supported by FlatList, so remount on change.
			key={`avatar-grid-${numColumns}`}
			data={items}
			keyExtractor={(item) => item.id}
			renderItem={renderItem}
			numColumns={numColumns}
			onEndReached={loadMore}
			onEndReachedThreshold={0.5}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
			scrollEventThrottle={16}
			style={{ flex: 1, backgroundColor: theme.screen.background }}
			contentContainerStyle={styles.listContent}
			ListEmptyComponent={
				<Text style={[styles.emptyText, { color: theme.screen.text }]}>
					{translate(TranslationKeys.no_data_currently_calculating)}
				</Text>
			}
			ListFooterComponent={
				loadingMore ? (
					<View style={styles.footerLoader}>
						<LoadingIndicator />
					</View>
				) : null
			}
		/>
	);
};

const styles = StyleSheet.create({
	loader: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	listContent: {
		paddingVertical: 16,
		paddingHorizontal: 8,
	},
	profileItem: {
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 4,
	},
	profileName: {
		marginTop: 8,
		fontSize: 14,
		textAlign: 'center',
		maxWidth: '100%',
	},
	emptyText: {
		textAlign: 'center',
		paddingVertical: 32,
	},
	footerLoader: {
		paddingVertical: 16,
		alignItems: 'center',
	},
});

export default AvatarScrollListScreen;
