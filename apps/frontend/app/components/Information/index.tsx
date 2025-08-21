import { Linking, Platform, Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import * as Clipboard from 'expo-clipboard';
import {
	Entypo,
	Ionicons,
	MaterialCommunityIcons,
	MaterialIcons,
} from '@expo/vector-icons';
import useToast from '@/hooks/useToast';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { TranslationKeys } from '@/locales/keys';

const Information: React.FC<any> = ({ campusDetails }) => {
	const { theme } = useTheme();
	const toast = useToast();
	const { translate } = useLanguage();

	const copyCordsToClipboard = async () => {
		const coordinates = campusDetails.coordinates?.coordinates;
		const copied = await Clipboard.setStringAsync(coordinates?.join(', '));
		if (copied) {
			toast('Copied', 'success');
		}
	};

	const handleCopyUrlToClipboard = async () => {
		const googleMapsUrl = campusDetails?.url;
		const copied = await Clipboard.setStringAsync(googleMapsUrl);
		if (copied) {
			toast('Copied', 'success');
		}
	};

	const handleOpenNavigation = () => {
		const coordinates = campusDetails.coordinates?.coordinates; // [longitude, latitude]

		if (!coordinates || coordinates.length !== 2) {
			console.error('Invalid coordinates');
			return;
		}

		const [longitude, latitude] = coordinates;
		const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

		if (Platform.OS === 'web') {
			window.open(googleMapsUrl, '_blank');
		} else {
			const mapsUrl =
				Platform.OS === 'ios'
					? `maps://?q=${latitude},${longitude}` // Apple Maps
					: `geo:${latitude},${longitude}?q=${latitude},${longitude}`; // Google Maps for Android

			Linking.openURL(mapsUrl).catch(err => {
				console.error('Error opening navigation:', err);
				// Fallback to Google Maps URL
				Linking.openURL(googleMapsUrl);
			});
		}
	};

	return (
		<View style={styles.container}>
			<Text style={{ ...styles.heading, color: theme.screen.text }}>
				{translate(TranslationKeys.information)}
			</Text>
			{/* Open Navigation */}
			<Tooltip
				placement="top"
				trigger={triggerProps => (
					<TouchableOpacity
						{...triggerProps}
						style={{ ...styles.row, backgroundColor: theme.screen.iconBg }}
						onPress={handleOpenNavigation}
					>
						<View style={styles.col}>
							<Ionicons name="navigate" size={24} color={theme.screen.icon} />
							<Text style={{ ...styles.body, color: theme.screen.text }}>
								{translate(TranslationKeys.open_navitation_to_location)}
							</Text>
						</View>
						<Entypo name="chevron-small-right" size={26} color={theme.screen.icon} />
					</TouchableOpacity>
				)}
			>
				<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
					<TooltipText fontSize="$sm" color={theme.tooltip.text}>
						{`${translate(TranslationKeys.open_navitation_to_location)}`}
					</TooltipText>
				</TooltipContent>
			</Tooltip>

			{/* Copy Coordinates */}
			<Tooltip
				placement="top"
				trigger={triggerProps => (
					<TouchableOpacity
						{...triggerProps}
						style={{ ...styles.row, backgroundColor: theme.screen.iconBg }}
						onPress={copyCordsToClipboard}
					>
						<View style={styles.col}>
							<Ionicons name="location-sharp" size={24} color={theme.screen.icon} />
							<Text style={{ ...styles.body, color: theme.screen.text }}>
								{translate(TranslationKeys.coordinates)}
							</Text>
						</View>
						<View style={styles.col2}>
							<Text style={{ ...styles.value, color: theme.screen.text }}>
								52.27780, 8.02325
							</Text>
							<MaterialCommunityIcons
								name="content-copy"
								size={24}
								color={theme.screen.icon}
							/>
						</View>
					</TouchableOpacity>
				)}
			>
				<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
					<TooltipText fontSize="$sm" color={theme.tooltip.text}>
						{`${translate(TranslationKeys.coordinates)}`}
					</TooltipText>
				</TooltipContent>
			</Tooltip>

			{/* Year of Construction */}
			<View style={{ ...styles.row, backgroundColor: theme.screen.iconBg }}>
				<View style={styles.col}>
					<MaterialIcons name="construction" size={24} color={theme.screen.icon} />
					<Text style={{ ...styles.body, color: theme.screen.text }}>
						{translate(TranslationKeys.year_of_construction)}
					</Text>
				</View>
				<View style={styles.col2}>
					<Text style={{ ...styles.value, color: theme.screen.text }}>
						{campusDetails?.date_of_construction}
					</Text>
				</View>
			</View>
			{/* Copy URl */}
			{campusDetails?.url && (
				<Tooltip
					placement="top"
					trigger={triggerProps => (
						<TouchableOpacity
							{...triggerProps}
							style={{ ...styles.row, backgroundColor: theme.screen.iconBg }}
							onPress={handleCopyUrlToClipboard}
						>
							<View style={styles.col}>
								<MaterialCommunityIcons
									name="attachment"
									size={24}
									color={theme.screen.icon}
								/>
								<Text style={{ ...styles.body, color: theme.screen.text }}>
									{translate(TranslationKeys.copy_url)}
								</Text>
							</View>
							<View style={styles.col2}>
								<MaterialCommunityIcons
									name="content-copy"
									size={24}
									color={theme.screen.icon}
								/>
							</View>
						</TouchableOpacity>
					)}
				>
					<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
						<TooltipText fontSize="$sm" color={theme.tooltip.text}>
							{`${translate(TranslationKeys.copy_url)}`}
						</TooltipText>
					</TooltipContent>
				</Tooltip>
			)}
		</View>
	);
};

export default Information;
