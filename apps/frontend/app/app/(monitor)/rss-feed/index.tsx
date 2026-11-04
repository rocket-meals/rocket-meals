import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import RssFeed from '@/components/RssFeed';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';

const RssFeedScreen = () => {
	useSetPageTitle(TranslationKeys.rss_feed);
	const { urls, switchIntervalInSeconds } = useLocalSearchParams<{
		urls?: string | string[];
		switchIntervalInSeconds?: string;
	}>();
	return <RssFeed urls={urls} switchIntervalInSeconds={switchIntervalInSeconds} />;
};

export default RssFeedScreen;
