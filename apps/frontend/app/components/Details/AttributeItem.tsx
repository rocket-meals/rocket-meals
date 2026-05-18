import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import SettingsList from '@/components/SettingsList';
import AppExpoIcon from '@/components/AppExpoIcon';
import { formatFoodInformationValue, getImageUrl } from '@/constants/HelperFunctions';
import { getFoodAttributesTranslation } from '@/helper/resourceHelper';
import { useMyContrastColor } from '@/helper/ColorHelper';
import { useAppSelector } from '@/redux/hooks';

type GroupPosition = 'top' | 'middle' | 'bottom' | 'single';

interface AttributeItemProps {
	attr: any;
	groupPosition: GroupPosition;
}

const AttributeItem: React.FC<AttributeItemProps> = ({ attr, groupPosition }) => {
	const { theme } = useTheme();
	const { language, selectedTheme: mode } = useAppSelector((state) => state.settings);

	const prefix = attr?.food_attribute?.prefix || '';
	const suffix = attr?.food_attribute?.suffix || '';
	const status = attr?.food_attribute?.status;
	const backgroundColor = attr?.food_attribute?.background_color || 'transparent';
	const label = attr?.food_attribute?.translations ? getFoodAttributesTranslation(attr?.food_attribute?.translations, language) : '';
	const iconColor = useMyContrastColor(backgroundColor, theme, mode === 'dark');

	let value: string | undefined;
	if (attr?.number_value !== null && attr?.number_value !== undefined) {
		value = formatFoodInformationValue(attr?.number_value, suffix) ?? undefined;
	} else if (attr?.string_value) {
		value = `${attr?.string_value}${suffix}`;
	}

	if (prefix && value) {
		value = `${prefix} ${value}`;
	}

	if (!(label || value) || status !== 'published') {
		return null;
	}

	const imageUri = attr?.food_attribute?.image_remote_url || getImageUrl(attr?.food_attribute?.image);
	const imageSource = imageUri ? { uri: imageUri } : null;

	const attributeIconColor = attr?.color_value || theme.screen.text;

	const leftIconComponent =
		!attr?.food_attribute?.icon_expo && imageSource ? (
			<View style={[styles.attributeIconWrapper, backgroundColor ? { backgroundColor } : null]}>
				<Image source={imageSource} style={styles.attributeImage} />
			</View>
		) : undefined;

	return (
		<SettingsList
			label={label || undefined}
			value={value}
			leftIcon={
				attr?.food_attribute?.icon_expo ? (
					<AppExpoIcon iconString={attr.food_attribute.icon_expo} size={18} color={iconColor} />
				) : undefined
			}
			leftIconComponent={leftIconComponent}
			rightIcon={
				attr?.icon_value ? (
					<AppExpoIcon iconString={attr.icon_value} size={20} color={attributeIconColor} />
				) : undefined
			}
			iconBgColor={backgroundColor}
			groupPosition={groupPosition}
		/>
	);
};

export default AttributeItem;

const styles = StyleSheet.create({
	attributeIconWrapper: {
		width: 34,
		height: 34,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	attributeImage: {
		width: 20,
		height: 20,
		resizeMode: 'contain',
	},
});
