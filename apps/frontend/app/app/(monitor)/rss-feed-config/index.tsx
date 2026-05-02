import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import { useLanguage } from '@/hooks/useLanguage';
import styles from './styles';

const RssFeedConfig = () => {
	useSetPageTitle(TranslationKeys.rss_feed);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const [urls, setUrls] = useState<string[]>(['']);
	const [interval, setInterval] = useState('10');

	const addUrlField = () => {
		setUrls(prev => [...prev, '']);
	};

	const updateUrl = (index: number, value: string) => {
		setUrls(prev => prev.map((u, i) => (i === index ? value : u)));
	};

	return (
		<ScrollView style={[styles.container, { backgroundColor: theme.screen.background }]}>
			<View style={styles.field}>
				<Text style={[styles.label, { color: theme.screen.text }]}>RSS Feed URLs</Text>
				{urls.map((url, index) => (
					<TextInput
						key={index}
						style={[
							styles.input,
							{
								color: theme.screen.text,
								borderColor: theme.screen.icon,
								marginBottom: 8,
							},
						]}
						value={url}
						onChangeText={text => updateUrl(index, text)}
						placeholder="https://example.com/feed"
						placeholderTextColor={theme.screen.icon}
					/>
				))}
				<Text style={[styles.example, { color: theme.screen.text }]}>Beispiel: https://www.tagesschau.de/infoservices/alle-meldungen-100~rss2.xml</Text>
				<TouchableOpacity style={[styles.addButton, { backgroundColor: theme.screen.iconBg }]} onPress={addUrlField}>
					<Text style={[styles.addButtonText, { color: theme.screen.text }]}>Add URL</Text>
				</TouchableOpacity>
			</View>
			<View style={styles.field}>
				<Text style={[styles.label, { color: theme.screen.text }]}>Switch Interval (seconds)</Text>
				<TextInput style={[styles.input, { color: theme.screen.text, borderColor: theme.screen.icon }]} value={interval} onChangeText={setInterval} keyboardType="number-pad" placeholder="10" placeholderTextColor={theme.screen.icon} />
			</View>
			<TouchableOpacity
				style={[styles.button, { backgroundColor: theme.screen.iconBg }]}
				onPress={() => {
					router.push({
						pathname: '/rss-feed',
						params: {
							urls: urls.filter(u => u.trim()).join(','),
							switchIntervalInSeconds: interval,
						},
					});
				}}
			>
				<Text style={[styles.buttonText, { color: theme.screen.text }]}>{translate(TranslationKeys.rss_feed)}</Text>
			</TouchableOpacity>
		</ScrollView>
	);
};

export default RssFeedConfig;
