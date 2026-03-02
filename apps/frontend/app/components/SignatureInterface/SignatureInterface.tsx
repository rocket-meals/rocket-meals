import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import styles from './styles';
import SignatureScreen from 'react-native-signature-canvas';
import { isWeb } from '@/constants/Constants';
import { useLanguage } from '@/hooks/useLanguage';
import * as FileSystem from 'expo-file-system';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

// Import libraries based on platform
const SignatureCanvas = Platform.OS === 'web' ? require('react-signature-canvas').default : require('react-native-signature-canvas').default;

const SignatureInterface = ({ id, value, onChange, error, isDisabled, custom_type, scrollViewRef }: { id: string; value: any; onChange: (id: string, value: any, custom_type: string) => void; error: string; isDisabled: boolean; custom_type: string; scrollViewRef?: any }) => {
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const { primaryColor } = useSelector((state: RootState) => state.settings);
	const signatureRef = useRef<any>(null);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

	const handleClear = () => {
		if (!isDisabled) {
			if (Platform.OS === 'web') {
				signatureRef.current?.clear();
				onChange(id, null, '');
			} else {
				signatureRef.current?.clearSignature();
				scrollViewRef.current.setNativeProps({ scrollEnabled: true });
				onChange(id, null, '');
			}
		}
	};

	const handleSave = () => {
		if (!isDisabled) {
			if (Platform.OS === 'web') {
				const signature = signatureRef.current?.toDataURL();
				const base64Data = signature.replace(/^data:image\/\w+;base64,/, '');
				const signatureUri = `data:image/png;base64,${base64Data}`;

				const fileData = {
					name: `signature_${Date.now()}.png`,
					type: 'image/png',
					image: signatureUri,
				};
				onChange(id, fileData, custom_type);
			}
		}
	};

	const handleBegin = () => {
		if (scrollViewRef?.current) {
			scrollViewRef.current.setNativeProps({ scrollEnabled: false });
		}
	};

	const handleEnd = () => {
		if (scrollViewRef?.current) {
			scrollViewRef.current.setNativeProps({ scrollEnabled: true });
			signatureRef.current.readSignature();
		}
	};

	const handleSignature = async (signature: string) => {
		if (isDisabled) return;

		const base64Data = signature.replace(/^data:image\/\w+;base64,/, '');
		const path = FileSystem.cacheDirectory + `signature_${Date.now()}.png`;

		try {
			await FileSystem.writeAsStringAsync(path, base64Data, {
				encoding: FileSystem.EncodingType.Base64,
			});

			console.log('Signature saved at:', path);

			const fileData = {
				name: `signature_${Date.now()}.png`,
				type: 'image/png',
				image: path,
			};

			console.log('Signature Captured:', fileData);
			onChange(id, fileData, custom_type);
		} catch (error) {
			console.error('Error saving signature:', error);
		}
	};

	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(Dimensions.get('window').width);
		};

		const subscription = Dimensions.addEventListener('change', handleResize);

		return () => subscription?.remove();
	}, []);

	return (
		<View style={{ ...styles.container, backgroundColor: theme.screen.iconBg }}>
			{value && typeof value === 'string' && value?.startsWith('https') ? (
				<View style={styles.fileContainer}>
					<Image
						source={{ uri: value }}
						style={{
							...styles.filePreview,
							width: screenWidth > 768 ? screenWidth * 0.6 : screenWidth * 0.8,
						}}
					/>
				</View>
			) : isWeb ? (
				<SignatureCanvas
					ref={signatureRef}
					onEnd={handleSave}
					descriptionText="Sign here"
					penColor={'#000000'}
					clearText="Clear"
					confirmText="Save"
					backgroundColor={'#ffffff'}
					webStyle={styles.signaturePad}
					autoClear={false}
					canvasProps={{
						width: screenWidth > 768 ? screenWidth * 0.6 : screenWidth * 0.8,
						height: 250,
					}}
					disabled={isDisabled}
				/>
			) : (
				<SignatureScreen
					ref={signatureRef}
					onBegin={handleBegin}
					onEnd={handleEnd}
					onOK={handleSignature}
					autoClear={false}
					descriptionText="Sign here"
					backgroundColor="#ffffff"
					penColor="#000000"
					style={{
						width: screenWidth > 768 ? screenWidth * 0.6 : screenWidth * 0.8,
						height: 250,
					}}
				/>
			)}

			<View style={{ ...styles.buttonContainer }}>
				<TouchableOpacity style={{ ...styles.button, backgroundColor: primaryColor }} onPress={handleClear} activeOpacity={0.7}>
					<MaterialIcons name="clear" size={24} color={theme.screen.text} />
					<Text style={{ ...styles.buttonText, color: theme.screen.text }}>{translate(TranslationKeys.clear)}</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default SignatureInterface;
