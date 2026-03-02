import React, { useCallback, useState } from 'react';
import { Dimensions, Platform, Share, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useSelector } from 'react-redux';
import Animated, { runOnJS, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import BaseBottomModal from '@/components/BaseBottomModal';
import SettingsList from '@/components/SettingsList';
import * as FileSystem from 'expo-file-system';
import useToast from '@/hooks/useToast';
import { getHighResImageUrl } from '@/constants/HelperFunctions';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

export default function ImageFullScreen() {
	const { uri, assetId } = useLocalSearchParams<{
		uri?: string;
		assetId?: string;
	}>();
	const { theme } = useTheme();
	const { drawerPosition } = useSelector((state: RootState) => state.settings);
	const toast = useToast();
	const { translate } = useLanguage();
	const [showControls, setShowControls] = useState(true);
	const [modalVisible, setModalVisible] = useState(false);

	const highResUri = assetId ? getHighResImageUrl(String(assetId)) : String(uri);
	const lowResUri = uri ? String(uri) : highResUri;

	const baseScale = useSharedValue(1);
	const pinchScale = useSharedValue(1);
	const dismissScale = useSharedValue(1);
	const scale = useDerivedValue(() => baseScale.value * pinchScale.value * dismissScale.value);

	const translationX = useSharedValue(0);
	const translationY = useSharedValue(0);
	const startX = useSharedValue(0);
	const startY = useSharedValue(0);
	const imageOpacity = useSharedValue(1);
	const indicatorOpacity = useSharedValue(1);

	const windowHeight = Dimensions.get('window').height;
	const CLOSE_DISTANCE = windowHeight * 0.25;
	const FADE_DISTANCE = windowHeight * 0.25;

	const pinchGesture = Gesture.Pinch()
		.onUpdate(event => {
			pinchScale.value = event.scale;
		})
		.onEnd(() => {
			const nextScale = baseScale.value * pinchScale.value;
			if (nextScale < 1) {
				baseScale.value = withTiming(1, { duration: 150 });
				pinchScale.value = 1;
				translationX.value = withTiming(0, { duration: 150 });
				translationY.value = withTiming(0, { duration: 150 });
			} else {
				baseScale.value = nextScale;
				pinchScale.value = 1;
			}
		});

	const doubleTapGesture = Gesture.Tap()
		.numberOfTaps(2)
		.onStart(() => {
			if (baseScale.value !== 1 || pinchScale.value !== 1) {
				baseScale.value = withTiming(1, { duration: 150 });
				pinchScale.value = withTiming(1, { duration: 150 });
				translationX.value = withTiming(0, { duration: 150 });
				translationY.value = withTiming(0, { duration: 150 });
			} else {
				baseScale.value = withTiming(2, { duration: 150 });
			}
		});

	const panGesture = Gesture.Pan()
		.onStart(() => {
			startX.value = translationX.value;
			startY.value = translationY.value;
		})
		.onUpdate(event => {
			if (scale.value > 1) {
				translationX.value = startX.value + event.translationX;
				translationY.value = startY.value + event.translationY;
				imageOpacity.value = 1;
				dismissScale.value = 1;
			} else {
				translationY.value = event.translationY;
				if (event.translationY > 0) {
					const progress = Math.min(event.translationY / FADE_DISTANCE, 1);
					imageOpacity.value = 1 - progress;
					dismissScale.value = 1;
				} else {
					imageOpacity.value = 1;
					dismissScale.value = 1;
				}
			}
		})
		.onEnd(() => {
			if (scale.value <= 1) {
				if (translationY.value > CLOSE_DISTANCE) {
					imageOpacity.value = 1;
					dismissScale.value = 1;
					runOnJS(router.back)();
				} else {
					translationX.value = withTiming(0);
					translationY.value = withTiming(0);
					startX.value = 0;
					startY.value = 0;
					imageOpacity.value = withTiming(1);
					dismissScale.value = withTiming(1);
				}
			}
		});

	const composedGesture = Gesture.Simultaneous(doubleTapGesture, pinchGesture, panGesture);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }, { translateX: translationX.value }, { translateY: translationY.value }],
		opacity: imageOpacity.value,
	}));

	const indicatorStyle = useAnimatedStyle(() => ({
		opacity: indicatorOpacity.value,
	}));

	useFocusEffect(
		useCallback(() => {
			translationX.value = 0;
			translationY.value = 0;
			startX.value = 0;
			startY.value = 0;
			imageOpacity.value = 1;
			baseScale.value = 1;
			pinchScale.value = 1;
			indicatorOpacity.value = 1;
			dismissScale.value = 1;
		}, [])
	);

	const toggleControls = () => setShowControls(p => !p);

	const downloadImage = async () => {
		try {
			const extension = String(highResUri).split('.').pop()?.split(/[#?]/)[0];
			const name = assetId ? assetId : `image_${Date.now()}`;
			if (Platform.OS === 'web') {
				const link = document.createElement('a');
				link.href = String(highResUri);
				link.download = extension ? `${name}.${extension}` : name;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			} else {
				const filename = extension ? `${name}.${extension}` : name;
				const fileUri = FileSystem.documentDirectory + filename;
				const { uri } = await FileSystem.downloadAsync(String(highResUri), fileUri);
				await Share.share({
					url: uri,
					message: uri,
				});
				toast('Image downloaded', 'success');
			}
		} catch (e) {
			toast('Download failed', 'error');
		}
	};

	return (
		<Animated.View style={[styles.container, { backgroundColor: theme.screen.background }]}>
			{showControls && (
				<Animated.View pointerEvents="none" style={[styles.backIndicator, indicatorStyle]}>
					<Ionicons name="chevron-down" size={48} color={theme.screen.text} />
					<Text style={[styles.backText, { color: theme.screen.text }]}>{translate(TranslationKeys.pull_down_to_close)}</Text>
				</Animated.View>
			)}
			{showControls && (
				<View style={[styles.topRow, drawerPosition === 'left' ? styles.topRowLeft : styles.topRowRight]} pointerEvents="box-none">
					{drawerPosition === 'left' ? (
						<>
							<TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.screen.iconBg }]} onPress={() => router.back()}>
								<Ionicons name="close" size={28} color={theme.screen.icon} />
							</TouchableOpacity>
							<TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.screen.iconBg }]} onPress={downloadImage}>
								<Ionicons name="cloud-download-outline" size={28} color={theme.screen.icon} />
							</TouchableOpacity>
						</>
					) : (
						<>
							<TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.screen.iconBg }]} onPress={downloadImage}>
								<Ionicons name="cloud-download-outline" size={28} color={theme.screen.icon} />
							</TouchableOpacity>
							<TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.screen.iconBg }]} onPress={() => router.back()}>
								<Ionicons name="close" size={28} color={theme.screen.icon} />
							</TouchableOpacity>
						</>
					)}
				</View>
			)}
			<GestureDetector gesture={composedGesture}>
				<Animated.View style={styles.flex}>
					<TouchableWithoutFeedback onPress={toggleControls} onLongPress={() => setModalVisible(true)}>
						<Animated.View style={[styles.imageWrapper, animatedStyle]}>
							<Image source={{ uri: lowResUri }} style={styles.image} contentFit="contain" />
							<Image source={{ uri: highResUri }} style={[styles.image, StyleSheet.absoluteFill]} contentFit="contain" />
						</Animated.View>
					</TouchableWithoutFeedback>
				</Animated.View>
			</GestureDetector>
			<BaseBottomModal visible={modalVisible} onClose={() => setModalVisible(false)}>
				<SettingsList
					leftIcon={<Ionicons name="cloud-download-outline" size={24} color={theme.screen.icon} />}
					label="Download Image"
					handleFunction={() => {
						setModalVisible(false);
						downloadImage();
					}}
					groupPosition="single"
				/>
			</BaseBottomModal>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	flex: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	topRow: {
		position: 'absolute',
		top: 40,
		flexDirection: 'row',
		gap: 10,
		zIndex: 2,
	},
	topRowLeft: { left: 20 },
	topRowRight: { right: 20 },
	iconButton: { padding: 8, borderRadius: 20 },
	imageWrapper: { width: '100%', height: '100%' },
	image: { width: '100%', height: '100%' },
	backIndicator: {
		position: 'absolute',
		top: 110,
		left: 0,
		right: 0,
		justifyContent: 'flex-start',
		alignItems: 'center',
	},
	backText: { marginTop: 8, fontSize: 12 },
});
