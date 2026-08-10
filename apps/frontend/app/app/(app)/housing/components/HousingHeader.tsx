import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { DrawerNavigationProp } from 'expo-router/drawer';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';

import IconButton from '@/components/UI/IconButton';
import { TranslationKeys } from '@/locales/keys';
import { ComponentIds } from '@/constants/ComponentIds';
import { isWeb } from '@/constants/Constants';
import { RootDrawerParamList } from '../types';
import styles from '../styles';

interface HousingHeaderProps {
	theme: any;
	translate: (key: string) => string;
	drawerPosition: string;
	openHousingSortingModal: () => void;
}

const HeaderIconButton = ({
	triggerProps,
	onPress,
	nativeID,
	children,
}: {
	triggerProps: object;
	onPress: () => void;
	nativeID?: string;
	children: React.ReactNode;
}) => (
	<IconButton {...triggerProps} onPress={onPress} style={{ padding: 10 }} nativeID={nativeID}>
		{children}
	</IconButton>
);

// Factories returning a stable `trigger` render-prop for CustomTooltip, so no
// new function-that-returns-JSX is defined inside the parent component body.
function makeMenuTrigger(onToggleDrawer: () => void, iconColor: string) {
	return (triggerProps: object) => (
		<HeaderIconButton triggerProps={triggerProps} onPress={onToggleDrawer} nativeID={ComponentIds.OPEN_DRAWER}>
			<Ionicons name="menu" size={24} color={iconColor} />
		</HeaderIconButton>
	);
}

function makeSortTrigger(onSort: () => void, iconColor: string) {
	return (triggerProps: object) => (
		<HeaderIconButton triggerProps={triggerProps} onPress={onSort}>
			<MaterialIcons name="sort" size={24} color={iconColor} />
		</HeaderIconButton>
	);
}

const HousingHeader: React.FC<HousingHeaderProps> = ({
	theme,
	translate,
	drawerPosition,
	openHousingSortingModal,
}) => {
	const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();

	return (
		<View
			style={[
				styles.header,
				{
					backgroundColor: theme.header.background,
					paddingHorizontal: isWeb ? 20 : 10,
				},
			]}
		>
			<View
				style={[
					styles.row,
					{
						flexDirection: drawerPosition === 'right' ? 'row-reverse' : 'row',
					},
				]}
			>
				<View
					style={[
						styles.col1,
						{
							flexDirection: drawerPosition === 'right' ? 'row-reverse' : 'row',
						},
					]}
				>
					<CustomTooltip
						placement="top"
						trigger={makeMenuTrigger(() => navigation.toggleDrawer(), theme.header.text)}
					>
						<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
							<TooltipText fontSize="$sm" color={theme.tooltip.text}>
								{`${translate(TranslationKeys.open_drawer)}`}
							</TooltipText>
						</TooltipContent>
					</CustomTooltip>

					<Text style={[styles.heading, { color: theme.header.text }]}>
						{translate(TranslationKeys.housing)}
					</Text>
				</View>
				<View style={[styles.col2, { gap: isWeb ? 30 : 15 }]}>
					<CustomTooltip
						placement="top"
						trigger={makeSortTrigger(openHousingSortingModal, theme.header.text)}
					>
						<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
							<TooltipText fontSize="$sm" color={theme.tooltip.text}>
								{`${translate(TranslationKeys.sort)}: ${translate(TranslationKeys.apartments)}`}
							</TooltipText>
						</TooltipContent>
					</CustomTooltip>
				</View>
			</View>
		</View>
	);
};

export default memo(HousingHeader);
