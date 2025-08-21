import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import RssFeed from '@/components/RssFeed';

const RssFeedScreen = () => {
	const { urls, switchIntervalInSeconds } = useLocalSearchParams<{
		urls?: string | string[];
		switchIntervalInSeconds?: string;
	}>();
	return (
		<RssFeed urls={urls} switchIntervalInSeconds={switchIntervalInSeconds} />
	);
};

export default RssFeedScreen;
