import React, { useState } from 'react';
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useAppSelector } from '@/redux/hooks';
import { isWeb } from '@/constants/Constants';
import { TranslationKeys } from '@/locales/keys';
import { myContrastColor } from '@/helper/ColorHelper';
import { cartoonifyImage } from './cartoonModel';
import styles, { CARTOON_AVATAR_IMAGE_SIZE } from './styles';

type Status = 'idle' | 'loading_model' | 'processing' | 'error';

const CartoonAvatar = () => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor, selectedTheme: mode } = useAppSelector((state) => state.settings);
	const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');

	const [originalUri, setOriginalUri] = useState<string | null>(null);
	const [cartoonUri, setCartoonUri] = useState<string | null>(null);
	const [status, setStatus] = useState<Status>('idle');

	const isBusy = status === 'loading_model' || status === 'processing';

	const processImage = async (rawUri: string) => {
		setCartoonUri(null);
		try {
			// Resize down to the model's target resolution and force JPEG output -
			// decodeJpeg() (used inside cartoonifyImage) only understands JPEG.
			const resized = await ImageManipulator.manipulateAsync(rawUri, [{ resize: { width: CARTOON_AVATAR_IMAGE_SIZE, height: CARTOON_AVATAR_IMAGE_SIZE } }], { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG });
			setOriginalUri(resized.uri);

			setStatus('loading_model');
			const result = await cartoonifyImage(resized.uri);

			setStatus('processing');
			setCartoonUri(result);
			setStatus('idle');
		} catch (error) {
			console.error('Error creating cartoon avatar:', error);
			setStatus('error');
		}
	};

	const pickImage = async (fromCamera: boolean) => {
		const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
		const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

		if (fromCamera && cameraPermission.status !== 'granted') {
			return;
		}
		if (!fromCamera && mediaPermission.status !== 'granted') {
			return;
		}

		const result = fromCamera
			? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 1 })
			: await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });

		if (!result.canceled && result.assets && result.assets[0]) {
			await processImage(result.assets[0].uri);
		}
	};

	const renderStatus = () => {
		if (status === 'loading_model' || status === 'processing') {
			return (
				<View style={styles.statusRow}>
					<ActivityIndicator color={primaryColor} />
					<Text style={{ ...styles.statusText, color: theme.screen.text }}>{translate(status === 'loading_model' ? TranslationKeys.photo_cartoon_avatar_loading_model : TranslationKeys.photo_cartoon_avatar_processing)}</Text>
				</View>
			);
		}
		if (status === 'error') {
			return <Text style={{ ...styles.errorText, color: 'red' }}>{translate(TranslationKeys.photo_cartoon_avatar_error)}</Text>;
		}
		return null;
	};

	return (
		<View style={styles.container}>
			<Text style={{ ...styles.description, color: theme.screen.text }}>{translate(TranslationKeys.photo_cartoon_avatar_description)}</Text>

			<View style={styles.buttonRow}>
				<TouchableOpacity style={{ ...styles.button, backgroundColor: primaryColor }} onPress={() => pickImage(false)} disabled={isBusy}>
					<MaterialIcons name="image" size={20} color={contrastColor} />
					<Text style={{ ...styles.buttonText, color: contrastColor }}>{translate(TranslationKeys.photo_cartoon_avatar_choose_photo)}</Text>
				</TouchableOpacity>
				{!isWeb && (
					<TouchableOpacity style={{ ...styles.button, backgroundColor: primaryColor }} onPress={() => pickImage(true)} disabled={isBusy}>
						<Ionicons name="camera" size={20} color={contrastColor} />
						<Text style={{ ...styles.buttonText, color: contrastColor }}>{translate(TranslationKeys.photo_cartoon_avatar_take_photo)}</Text>
					</TouchableOpacity>
				)}
			</View>

			{renderStatus()}

			{originalUri && (
				<View style={styles.imagesRow}>
					<View style={styles.imageColumn}>
						<Image source={{ uri: originalUri }} style={styles.image} />
						<Text style={{ ...styles.imageLabel, color: theme.screen.text }}>{translate(TranslationKeys.photo_cartoon_avatar_original)}</Text>
					</View>
					<View style={styles.imageColumn}>
						{cartoonUri ? (
							<Image source={{ uri: cartoonUri }} style={styles.image} />
						) : (
							<View style={[styles.image, { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.screen.text + '33', borderStyle: 'dashed' }]}>{isBusy && <ActivityIndicator color={primaryColor} />}</View>
						)}
						<Text style={{ ...styles.imageLabel, color: theme.screen.text }}>{translate(TranslationKeys.photo_cartoon_avatar_result)}</Text>
					</View>
				</View>
			)}

			<Text style={{ ...styles.licenseNotice, color: theme.screen.text }}>{translate(TranslationKeys.photo_cartoon_avatar_license_notice)}</Text>
		</View>
	);
};

export default CartoonAvatar;
