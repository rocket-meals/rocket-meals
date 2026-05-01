import { ActivityIndicator, FlatList, SafeAreaView, View } from 'react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import styles from './styles';
import { isWeb } from '@/constants/Constants';
import NewsItem from '@/components/NewsItem/NewsItem';
import { NewsHelper } from '@/redux/actions/News/News';
import { DatabaseTypes } from 'repo-depkit-common';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { SET_NEWS } from '@/redux/Types/types';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import { CollectibleAt } from 'repo-depkit-common';

const Index = () => {
	useSetPageTitle(TranslationKeys.news);
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const newsHelper = new NewsHelper();
	const [refreshing, setRefreshing] = useState(false);
	const [loading, setLoading] = useState(false);
	const { news } = useAppSelector((state) => state.news);

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		fetchAllNews().finally(() => setRefreshing(false));
	}, []);

	const fetchAllNews = async () => {
		setLoading(true);
		const newsData = (await newsHelper.fetchNews({})) as DatabaseTypes.News[];

		const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

		const sortedNews = [...(newsData || [])].sort((a, b) => {
			const dateA = a?.date;
			const dateB = b?.date;

			if (!dateA && !dateB) return 0;
			if (!dateA) return 1;
			if (!dateB) return -1;

			const dayA = dateA.split('T')[0];
			const dayB = dateB.split('T')[0];

			if (dayA === today && dayB !== today) return -1;
			if (dayB === today && dayA !== today) return 1;

			return dayA < dayB ? 1 : -1; // neuere zuerst
		});

		dispatch({ type: SET_NEWS, payload: sortedNews });
		setLoading(false);
	};

	useEffect(() => {
		if (!news || news.length === 0) {
			fetchAllNews();
		}
	}, []);

	const filteredNews = useMemo(
		() => (news ?? []).filter((item: DatabaseTypes.News) => (item?.translations?.length ?? 0) > 1),
		[news]
	);

	const renderItem = useCallback(({ item }: { item: DatabaseTypes.News }) => {
		return <NewsItem news={item} />;
	}, []);

	const keyExtractor = useCallback((item: DatabaseTypes.News) => String(item?.id ?? ''), []);

	const ItemSeparatorComponent = useCallback(() => <View style={{ height: 20 }} />, []);

	const ListHeaderComponent = useMemo(
		() => <CollectibleSpot collectibleKey={CollectibleAt.collectible_at_news} />,
		[]
	);

	const ListEmptyComponent = useMemo(
		() =>
			loading ? (
				<View style={{ height: 200, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
					<ActivityIndicator size={30} color={theme.screen.text} />
				</View>
			) : null,
		[loading, theme.screen.text]
	);

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: theme.screen.background }}>
			<FlatList
				data={filteredNews}
				renderItem={renderItem}
				keyExtractor={keyExtractor}
				ListHeaderComponent={ListHeaderComponent}
				ListEmptyComponent={ListEmptyComponent}
				ItemSeparatorComponent={ItemSeparatorComponent}
				contentContainerStyle={[styles.flatListContent, { paddingHorizontal: isWeb ? 30 : 5 }]}
				style={[styles.newsContainer, { backgroundColor: theme.screen.background }]}
				refreshing={refreshing}
				onRefresh={onRefresh}
			/>
		</SafeAreaView>
	);
};

export default Index;
