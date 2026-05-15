import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';
import AppScreen from '@/components/AppScreen';

const Index = () => {
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);

	useEffect(() => {
		const onChange = ({ window }: { window: any }) => {
			setWindowWidth(window.width);
		};

		const subscription = Dimensions.addEventListener('change', onChange);
		return () => {
			subscription.remove();
		};
	}, []);

	return (
		<AppScreen>
			<View style={{ alignItems: 'center' }}>
				<Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.screen.text, textAlign: 'center', marginVertical: 20 }}>
					{translate(TranslationKeys.faq_food)}
				</Text>
				<View style={{ width: windowWidth > 600 ? '80%' : '95%' }}>
					{/* FAQ Content will go here */}
				</View>
			</View>
		</AppScreen>
	);
};

export default Index;

const styles = StyleSheet.create({});
