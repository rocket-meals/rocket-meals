import React from 'react';
import { ScrollView } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import CartoonAvatar from '@/components/CartoonAvatar/CartoonAvatar';

const PhotoCartoonAvatarScreen = () => {
	useSetPageTitle(TranslationKeys.photo_cartoon_avatar);
	const { theme } = useTheme();

	return (
		<ScrollView style={{ flex: 1, backgroundColor: theme.screen.background }} contentContainerStyle={{ backgroundColor: theme.screen.background }}>
			<CartoonAvatar />
		</ScrollView>
	);
};

export default PhotoCartoonAvatarScreen;
