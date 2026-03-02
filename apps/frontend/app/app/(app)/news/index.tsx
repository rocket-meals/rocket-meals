import { ActivityIndicator, RefreshControl, SafeAreaView, ScrollView, View } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import styles from './styles';
import { isWeb } from '@/constants/Constants';
import NewsItem from '@/components/NewsItem/NewsItem';
import { NewsHelper } from '@/redux/actions/News/News';
import { DatabaseTypes } from 'repo-depkit-common';
import { useDispatch, useSelector } from 'react-redux';
import { SET_NEWS } from '@/redux/Types/types';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import { CollectibleAt } from 'repo-depkit-common';

const Index = () => {
	useSetPageTitle(TranslationKeys.news);
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const newsHelper = new NewsHelper();
	const [refreshing, setRefreshing] = useState(false);
	const [loading, setLoading] = useState(false);
	const { news } = useSelector((state: RootState) => state.news);

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

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: theme.screen.background }}>
			<ScrollView
				style={{
					...styles.newsContainer,
					backgroundColor: theme.screen.background,
				}}
				contentContainerStyle={{
					...styles.newsContentContainer,
					paddingHorizontal: isWeb ? 30 : 5,
				}}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
			>
				<View style={styles.newsListContainer}>
					<CollectibleSpot collectibleKey={CollectibleAt.collectible_at_news} />
					{loading ? (
						<View
							style={{
								height: 200,
								width: '100%',
								justifyContent: 'center',
								alignItems: 'center',
							}}
						>
							<ActivityIndicator size={30} color={theme.screen.text} />
						</View>
					) : (
                                                news &&
                                                news?.map((item: DatabaseTypes.News, index: number) => {
                                                        if (item?.translations?.length > 1) {
                                                                return <NewsItem key={item?.id} news={item} />;
                                                        }
                                                })
                                        )}
                                </View>
                        </ScrollView>
                </SafeAreaView>
        );
};

export default Index;
