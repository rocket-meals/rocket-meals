import React, { useEffect, useRef, useState } from 'react';
import { Image, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';

export type RssFeedProps = {
	urls?: string | string[];
	switchIntervalInSeconds?: string | number;
};

const parseFeed = (xml: string) => {
	const items: {
		title: string;
		link: string;
		content: string;
		image: string;
	}[] = [];
	const itemRegex = /<item>([\s\S]*?)<\/item>/g;
	let match;
	while ((match = itemRegex.exec(xml))) {
		const itemXml = match[1];
		const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(itemXml) || /<title>(.*?)<\/title>/.exec(itemXml);
		const linkMatch = /<link>(.*?)<\/link>/.exec(itemXml);
		const descMatch = /<description><!\[CDATA\[(.*?)\]\]><\/description>/.exec(itemXml) || /<description>(.*?)<\/description>/.exec(itemXml);
		const contentEncodedMatch = /<content:encoded><!\[CDATA\[(.*?)\]\]><\/content:encoded>/.exec(itemXml) || /<content:encoded>([\s\S]*?)<\/content:encoded>/.exec(itemXml);
		const enclosureMatch = /<enclosure[^>]*url=['"](.*?)['"]/.exec(itemXml);
		const htmlContent = (contentEncodedMatch ? contentEncodedMatch[1] : '') || (descMatch ? descMatch[1] : '');
		const imageMatch = /<img[^>]*src=['"]([^'"]+)['"]/.exec(htmlContent);
		let image = '';
		if (enclosureMatch) {
			image = enclosureMatch[1];
		} else if (imageMatch) {
			image = imageMatch[1];
		}
		items.push({
			title: titleMatch ? titleMatch[1] : '',
			link: linkMatch ? linkMatch[1] : '',
			content: descMatch ? descMatch[1] : '',
			image,
		});
	}
	return items;
};

const RssFeed: React.FC<RssFeedProps> = ({ urls, switchIntervalInSeconds }) => {
	const { theme } = useTheme();
	const [items, setItems] = useState<any[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const fetchFeeds = async () => {
			if (!urls) return;
			setLoading(true);
			try {
				const urlList = Array.isArray(urls) ? urls : String(urls).split(',');
				// The feeds are independent, so they load side by side; Promise.all keeps the configured order.
				const feedItems = await Promise.all(
					urlList.map(async (url) => {
						const res = await fetch(url.trim());
						const text = await res.text();
						return parseFeed(text);
					})
				);
				const allItems: any[] = feedItems.flat();
				setItems(allItems);
			} catch (e) {
				console.error('Failed to load rss feed', e);
			} finally {
				setLoading(false);
			}
		};
		void fetchFeeds();
	}, [urls]);

	useEffect(() => {
		if (!items.length) return;
		if (intervalRef.current) clearInterval(intervalRef.current);
		const interval = Number(switchIntervalInSeconds || 10) * 1000;
		intervalRef.current = setInterval(() => {
			setCurrentIndex(prev => (prev + 1) % items.length);
		}, interval);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [items, switchIntervalInSeconds]);

	const currentItem = items[currentIndex];

	if (loading) {
		return (
			<View
				style={[
					styles.container,
					{
						backgroundColor: theme.screen.background,
						justifyContent: 'center',
						alignItems: 'center',
					},
				]}
			>
				<LoadingIndicator size={30} color={theme.screen.text} />
			</View>
		);
	}

	if (!currentItem) {
		return (
			<View
				style={[
					styles.container,
					{
						backgroundColor: theme.screen.background,
						justifyContent: 'center',
						alignItems: 'center',
					},
				]}
			>
				<Text style={{ color: theme.screen.text }}>No News</Text>
			</View>
		);
	}

	return (
		<ScrollView style={[styles.container, { backgroundColor: theme.screen.background }]} contentContainerStyle={styles.contentContainer}>
			<TouchableOpacity
				onPress={() => {
					if (currentItem.link) {
						Linking.openURL(currentItem.link);
					}
				}}
			>
				<Text style={[styles.title, { color: theme.screen.text }]}>{currentItem.title}</Text>
				{currentItem.image && <Image source={{ uri: currentItem.image }} style={styles.image} resizeMode="cover" />}
				{currentItem.content && <Text style={[styles.body, { color: theme.screen.text }]}>{currentItem.content}</Text>}
			</TouchableOpacity>
		</ScrollView>
	);
};

export default RssFeed;
