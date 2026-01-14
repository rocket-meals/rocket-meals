import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '@/hooks/useTheme';
import { RootState } from '@/redux/reducer';
import SettingsList from '@/components/SettingsList';
import { iconLibraries } from '@/components/Drawer/CustomDrawerContent';
import { formatFoodInformationValue, getImageUrl } from '@/constants/HelperFunctions';
import { getFoodAttributesTranslation } from '@/helper/resourceHelper';
import { useMyContrastColor } from '@/helper/ColorHelper';

type GroupPosition = 'top' | 'middle' | 'bottom' | 'single';

interface AttributeItemProps {
	attr: any;
	groupPosition: GroupPosition;
}

const AttributeItem: React.FC<AttributeItemProps> = ({ attr, groupPosition }) => {
	const { theme } = useTheme();
	const { language, selectedTheme: mode } = useSelector((state: RootState) => state.settings);

	const prefix = attr?.food_attribute?.prefix || '';
	const suffix = attr?.food_attribute?.suffix || '';
	const status = attr?.food_attribute?.status;
	const backgroundColor = attr?.food_attribute?.background_color || 'transparent';
	const label = attr?.food_attribute?.translations ? getFoodAttributesTranslation(attr?.food_attribute?.translations, language) : '';

	let value: string | undefined;
	if (attr?.number_value !== null && attr?.number_value !== undefined) {
		value = formatFoodInformationValue(attr?.number_value, suffix);
	} else if (attr?.string_value) {
		value = `${attr?.string_value}${suffix}`;
	}

	if (prefix && value) {
		value = `${prefix} ${value}`;
	}

	if (!(label || value) || status !== 'published') {
		return null;
	}

	const iconParts = attr?.food_attribute?.icon_expo?.split(':') || [];
	const [library, name] = iconParts;
	const Icon = library && iconLibraries[library];
	const iconColor = useMyContrastColor(backgroundColor, theme, mode === 'dark');

	const imageUri = attr?.food_attribute?.image_remote_url || getImageUrl(attr?.food_attribute?.image);
	const imageSource = imageUri ? { uri: imageUri } : null;

	const attributeIconParts = attr?.icon_value?.split(':') || [];
	const [attributeIconLibrary, attributeIconName] = attributeIconParts;
	const AttributeIcon = attributeIconLibrary && iconLibraries[attributeIconLibrary];
	const attributeIconColor = attr?.color_value || theme.screen.text;

	const leftIconComponent =
		!Icon && imageSource ? (
			<View style={[styles.attributeIconWrapper, backgroundColor ? { backgroundColor } : null]}>
				<Image source={imageSource} style={styles.attributeImage} />
			</View>
		) : undefined;

	return (
		<SettingsList
			label={label || undefined}
			value={value}
			leftIcon={Icon ? <Icon name={name} size={18} color={iconColor} /> : undefined}
			leftIconComponent={leftIconComponent}
			rightIcon={AttributeIcon ? <AttributeIcon name={attributeIconName} size={20} color={attributeIconColor} /> : undefined}
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
