import React from 'react';
import {Image, Linking, SafeAreaView, ScrollView, Text, TouchableOpacity, View, StyleSheet, useWindowDimensions} from 'react-native';
import {useAppSelector} from '@/redux/hooks';
import {useTheme} from '@/hooks/useTheme';
import {TranslationKeys} from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import {getImageUrl} from '@/constants/HelperFunctions';
import {getAppIconInsideExpoLocalSaved} from '@/config';
import useCustomerConfig from '@/hooks/useCustomerConfig';
import QrCode from '@/components/QrCode';
import useDebugMode from '@/hooks/useDebugMode';
import {myContrastColor} from '@/helper/ColorHelper';
import {ServerInfoHelper} from '@/helper/ServerInfoHelper';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useLanguage} from '@/hooks/useLanguage';
import CustomStackHeader from '@/components/CustomStackHeader/CustomStackHeader';

const ROUTE_PATH = '/app-download-management';

const AppDownloadManagement = () => {
	useSetPageTitle(TranslationKeys.app_download);
	const {theme} = useTheme();
	const {translate} = useLanguage();
	const router = useRouter();
	const {fullscreen} = useLocalSearchParams();
	const {serverInfo, primaryColor, selectedTheme: mode} = useAppSelector((state) => state.settings);
	const isDebugMode = useDebugMode();
	const {width: screenWidth} = useWindowDimensions();

	// useLocalSearchParams may return a string or string[] depending on the router
	const isFullscreen = Array.isArray(fullscreen) ? fullscreen.includes('true') : fullscreen === 'true';

	const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');

	const projectLogo = serverInfo?.info?.project?.project_logo ? getImageUrl(serverInfo.info.project.project_logo) : null;
	const iconSource = projectLogo ? {uri: projectLogo} : getAppIconInsideExpoLocalSaved();

	const customerConfig = useCustomerConfig();
	const baseUrl = customerConfig.baseUrl;

	const projectName = ServerInfoHelper.getServerName(serverInfo || {}, customerConfig);
	const projectDescriptor = serverInfo?.info?.project?.project_descriptor || '';
	const appDownloadUrl = `https://rocket-meals.de${baseUrl}/experimentell/app-download${isFullscreen ? '?fullscreen=true' : ''}`;

	const qrSize = Math.min(screenWidth * 0.6, 280);

	const toggleFullscreen = () => {
		if (isFullscreen) {
			router.replace(ROUTE_PATH);
			return;
		}
		router.replace({
			pathname: ROUTE_PATH,
			params: {fullscreen: 'true'},
		});
	};

	const exitFullscreen = () => {
		if (isFullscreen) {
			router.replace(ROUTE_PATH);
		}
	};

	const fullscreenButton = (
		<TouchableOpacity
			onPress={toggleFullscreen}
			style={[styles.actionButton, {backgroundColor: theme.screen.iconBg, borderColor: theme.screen.icon}]}
		>
			<MaterialCommunityIcons
				name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
				size={20}
				color={theme.screen.text}
			/>
		</TouchableOpacity>
	);

	return (
		<SafeAreaView style={[styles.safeArea, {backgroundColor: theme.screen.background}]}>
			{!isFullscreen && (
				<CustomStackHeader label={translate(TranslationKeys.app_download)} rightElement={fullscreenButton} />
			)}
			<ScrollView
				style={styles.container}
				contentContainerStyle={styles.contentContainer}
			>
				<TouchableOpacity
					activeOpacity={1}
					onPress={exitFullscreen}
					style={[styles.heroSection, {backgroundColor: primaryColor}]}
				>
					<Image source={iconSource} style={styles.projectLogo} />
					<Text style={[styles.projectName, {color: contrastColor}]}>{projectName}</Text>
					{projectDescriptor ? (
						<Text style={[styles.projectDescriptor, {color: contrastColor}]}>{projectDescriptor}</Text>
					) : null}
					<TouchableOpacity
						style={styles.qrContainer}
						onPress={() => Linking.openURL(appDownloadUrl)}
						activeOpacity={0.8}
					>
						<QrCode
							value={appDownloadUrl}
							size={qrSize}
							image={iconSource}
							innerSize={21}
							backgroundColor="white"
						/>
					</TouchableOpacity>
					{isDebugMode ? (
						<Text style={[styles.debugLink, {color: contrastColor}]} selectable>{appDownloadUrl}</Text>
					) : null}
				</TouchableOpacity>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
	},
	container: {
		flex: 1,
	},
	contentContainer: {
		flexGrow: 1,
	},
	heroSection: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 40,
		paddingHorizontal: 20,
		minHeight: 500,
	},
	projectLogo: {
		width: 80,
		height: 80,
		resizeMode: 'contain',
		marginBottom: 16,
		borderRadius: 12,
	},
	projectName: {
		fontSize: 32,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: 8,
	},
	projectDescriptor: {
		fontSize: 18,
		textAlign: 'center',
		marginBottom: 24,
		paddingHorizontal: 20,
	},
	qrContainer: {
		backgroundColor: 'white',
		borderRadius: 16,
		padding: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	debugLink: {
		fontSize: 12,
		textAlign: 'center',
		marginTop: 16,
		opacity: 0.8,
	},
	actionButton: {
		padding: 10,
		borderRadius: 50,
		borderWidth: 1,
	},
});

export default AppDownloadManagement;
