import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import { useLanguage } from '@/hooks/useLanguage';
import QRCode from 'react-native-qrcode-svg';
import styles from './styles';

const ReactNativeQrCodeSvgScreen = () => {
	useSetPageTitle(TranslationKeys.react_native_qrcode_svg);
	const { theme } = useTheme();
	const { translate } = useLanguage();

	return (
		<ScrollView
			style={{ ...styles.container, backgroundColor: theme.screen.background }}
			contentContainerStyle={{
				...styles.contentContainer,
				backgroundColor: theme.screen.background,
			}}
		>
			<View style={{ ...styles.content }}>
				<Text style={{ ...styles.heading, color: theme.screen.text }}>
					{translate(TranslationKeys.react_native_qrcode_svg)}
				</Text>
				<QRCode
					value="https://example.com"
					size={200}
					logo={require('@/assets/images/react-logo.png')}
					logoSize={40}
					logoBackgroundColor="transparent"
				/>
			</View>
		</ScrollView>
	);
};

export default ReactNativeQrCodeSvgScreen;
