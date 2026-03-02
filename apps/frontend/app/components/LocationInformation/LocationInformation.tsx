import { Text, View } from 'react-native';
import React from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import useToast from '@/hooks/useToast';
import { TranslationKeys } from '@/locales/keys';
import SettingsList from '@/components/SettingsList';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import SettingsListCoordinate from '@/components/SettingsListCoordinate/SettingsListCoordinate';

const LocationInformation: React.FC<any> = ({ campusDetails }) => {
	const { theme } = useTheme();
	const toast = useToast();
	const { translate } = useLanguage();
	const { appSettings, primaryColor } = useSelector((state: RootState) => state.settings);
	const campusAreaColor = appSettings?.campus_area_color ?? primaryColor;

	const coordinates = campusDetails?.coordinates?.coordinates;
	const location = coordinates?.length === 2 ? { longitude: coordinates[0], latitude: coordinates[1] } : undefined;

	const handleCopyUrlToClipboard = async () => {
		const googleMapsUrl = campusDetails?.url;
		const copied = await Clipboard.setStringAsync(googleMapsUrl);
		if (copied) {
			toast('Copied', 'success');
		}
	};

	const infoItems = [
		...(location ? [{ key: 'location', type: 'location' }] : []),
		{
			key: 'construction',
			type: 'default',
			label: translate(TranslationKeys.year_of_construction),
			leftIcon: <MaterialIcons name="construction" size={24} color={theme.screen.icon} />,
			value: campusDetails?.date_of_construction ? String(campusDetails?.date_of_construction) : undefined,
		},
		...(campusDetails?.url
			? [
					{
						key: 'url',
						type: 'default',
						label: translate(TranslationKeys.copy_url),
						leftIcon: <MaterialCommunityIcons name="attachment" size={24} color={theme.screen.icon} />,
						rightIcon: <MaterialCommunityIcons name="content-copy" size={24} color={theme.screen.icon} />,
						handleFunction: handleCopyUrlToClipboard,
						value: undefined,
					},
				]
			: []),
	];

	return (
		<View style={styles.container}>
			<Text style={{ ...styles.heading, color: theme.screen.text }}>{translate(TranslationKeys.information)}</Text>
			<View style={{ gap: 0 }}>
				{infoItems.map((item, index) => {
					const groupPosition =
						infoItems.length === 1 ? 'single' : index === 0 ? 'top' : index === infoItems.length - 1 ? 'bottom' : 'middle';
					const showSeparator = index !== infoItems.length - 1;
					if (item.type === 'location') {
						return (
							<SettingsListCoordinate
								key={item.key}
								iconBgColor={campusAreaColor}
								location={location}
								groupPosition={groupPosition}
								showSeparator={showSeparator}
							/>
						);
					}

					return (
						<SettingsList
							key={item.key}
							iconBgColor={campusAreaColor}
							leftIcon={item.leftIcon}
							label={item.label}
							value={item.value}
							rightIcon={item.rightIcon}
							handleFunction={item.handleFunction}
							groupPosition={groupPosition}
							showSeparator={showSeparator}
						/>
					);
				})}
			</View>
		</View>
	);
};

export default LocationInformation;
