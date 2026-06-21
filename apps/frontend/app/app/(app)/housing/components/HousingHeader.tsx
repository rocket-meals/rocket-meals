import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';

import IconButton from '@/components/UI/IconButton';
import { TranslationKeys } from '@/locales/keys';
import { isWeb } from '@/constants/Constants';
import { RootDrawerParamList } from '../types';
import styles from '../styles';
import { TestIds } from '@/constants/TestIds';

interface HousingHeaderProps {
	theme: any;
	translate: (key: string) => string;
	drawerPosition: 'left' | 'right' | 'system' | string;
	openHousingSortingModal: () => void;
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
						trigger={(triggerProps) => (
							<IconButton
								{...triggerProps}
								onPress={() => navigation.toggleDrawer()}
								style={{ padding: 10 }}
								testID={TestIds.OPEN_DRAWER_BUTTON}
							>
								<Ionicons name="menu" size={24} color={theme.header.text} />
							</IconButton>
						)}
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
						trigger={(triggerProps) => (
							<IconButton
								{...triggerProps}
								onPress={openHousingSortingModal}
								style={{ padding: 10 }}
							>
								<MaterialIcons name="sort" size={24} color={theme.header.text} />
							</IconButton>
						)}
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
