import React, { useMemo } from 'react';
import { ImageBackground, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import useActiveCollectibleEvent from '@/hooks/useActiveCollectibleEvent';
import { useLanguage } from '@/hooks/useLanguage';
import CustomStackHeader from '@/components/CustomStackHeader/CustomStackHeader';
import { getHighResImageUrl } from '@/constants/HelperFunctions';

const CollectibleEventMonitor = () => {
	useSetPageTitle(TranslationKeys.collectible_event_monitor);
	const { theme } = useTheme();
	const router = useRouter();
	const { fullscreen } = useLocalSearchParams();
	const { translate } = useLanguage();
	const { activeCollectibleEvent } = useActiveCollectibleEvent();
	const isFullscreen = Array.isArray(fullscreen) ? fullscreen.includes('true') : fullscreen === 'true';

	const jsonString = useMemo(
		() => JSON.stringify(activeCollectibleEvent ?? null, null, 2),
		[activeCollectibleEvent]
	);

	const backgroundImageUrl = useMemo(() => {
		if (activeCollectibleEvent?.monitor_background_image_remote_url) {
			return activeCollectibleEvent.monitor_background_image_remote_url;
		}

		if (activeCollectibleEvent?.monitor_background_image) {
			return getHighResImageUrl(activeCollectibleEvent.monitor_background_image, 1920);
		}

		return null;
	}, [activeCollectibleEvent]);

	const toggleFullscreen = () => {
		if (isFullscreen) {
			router.replace('/collectible-event-monitor');
			return;
		}

		router.replace({
			pathname: '/collectible-event-monitor',
			params: { fullscreen: 'true' },
		});
	};

	const fullscreenButton = (
		<TouchableOpacity
			onPress={toggleFullscreen}
			style={[styles.actionButton, { backgroundColor: theme.screen.iconBg, borderColor: theme.screen.icon }]}
		>
			<MaterialCommunityIcons
				name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
				size={20}
				color={theme.screen.text}
			/>
		</TouchableOpacity>
	);

	return (
		<SafeAreaView style={[styles.safeArea, { backgroundColor: theme.screen.background }]}>
			<ImageBackground
				source={backgroundImageUrl ? { uri: backgroundImageUrl } : undefined}
				style={styles.background}
				imageStyle={styles.backgroundImage}
			>
				<View
					style={[
						styles.overlay,
						{ backgroundColor: backgroundImageUrl ? 'rgba(0,0,0,0.45)' : theme.screen.background },
					]}
				>
					{isFullscreen ? (
						<View style={styles.floatingButton}>{fullscreenButton}</View>
					) : (
						<View style={styles.headerContainer}>
							<CustomStackHeader label={translate(TranslationKeys.collectible_event_monitor)} rightElement={fullscreenButton} />
						</View>
					)}

					<ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
						<Text style={{ ...styles.heading, color: theme.screen.text }}>
							{translate(TranslationKeys.collectible_event_monitor)}
						</Text>
						<View style={{ ...styles.card, backgroundColor: theme.screen.iconBg }}>
							<Text style={{ ...styles.code, color: theme.screen.text }}>{jsonString}</Text>
						</View>
					</ScrollView>
				</View>
			</ImageBackground>
		</SafeAreaView>
	);
};

export default CollectibleEventMonitor;
