import { View } from 'react-native';
import AppLoadingView from '@/components/AppLoadingView';
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
import AppScreen from '@/components/AppScreen';

const Index = () => {
	useSetPageTitle(TranslationKeys.news);
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const newsHelper = new NewsHelper();
	const [refreshing, setRefreshing] = useState(false);
	const [loading, setLoading] = useState(false);
	const { newsDict } = useAppSelector((state) => state.news);
	const news = useMemo(() => Object.values(newsDict || {}) as DatabaseTypes.News[], [newsDict]);

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
		if (!Object.keys(newsDict || {}).length) {
			fetchAllNews();
		}
	}, []);

	const filteredNews = useMemo(
		() => (news ?? []).filter((item: DatabaseTypes.News) => (item?.translations?.length ?? 0) > 1),
		[news]
	);


	const ListHeaderComponent = useMemo(
		() => <CollectibleSpot collectibleKey={CollectibleAt.collectible_at_news} />,
		[]
	);

	const ListEmptyComponent = useMemo(
		() =>
			loading ? (
				<AppLoadingView size={30} height={200} />
			) : null,
		[loading]
	);

	return (
		<AppScreen scrollable={true} fullWidth={true} refreshing={refreshing} onRefresh={onRefresh}>
			{ListHeaderComponent}
			{loading && ListEmptyComponent}
			<View style={[styles.newsContainer, { paddingHorizontal: isWeb ? 30 : 5 }]}>
				{filteredNews.map((item, index) => (
					<React.Fragment key={item.id || index}>
						<NewsItem news={item} />
						{index < filteredNews.length - 1 && <View style={{ height: 20 }} />}
					</React.Fragment>
				))}
			</View>
		</AppScreen>
	);
};

export default Index;
