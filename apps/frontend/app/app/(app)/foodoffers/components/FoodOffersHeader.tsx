import React, { memo } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons, Entypo } from '@expo/vector-icons';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';
import { useNavigation } from 'expo-router';
import { DrawerNavigationProp } from 'expo-router/drawer';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import IconButton from '@/components/UI/IconButton';
import { TranslationKeys } from '@/locales/keys';
import { ComponentIds } from '@/constants/ComponentIds';
import { isWeb } from '@/constants/Constants';
import styles from '../styles';
import { RootDrawerParamList } from '../types';
import { DatabaseTypes } from 'repo-depkit-common';
import BalanceQuickAccessButton from './BalanceQuickAccessButton';

interface FoodOffersHeaderProps {
    drawerPosition: 'left' | 'right';
    hasUnreadChats: boolean;
    selectedCanteen: DatabaseTypes.Canteens | null;
    openSheet: (sheet: any, props?: Record<string, any>) => void;
    openOptionsModal: () => void;
}

const HeaderIconButton = ({
    triggerProps,
    onPress,
    style,
    nativeID,
    children,
}: {
    triggerProps: object;
    onPress: () => void;
    style?: any;
    nativeID?: string;
    children: React.ReactNode;
}) => (
    <IconButton {...triggerProps} onPress={onPress} style={style} nativeID={nativeID}>
        {children}
    </IconButton>
);

// Factories returning a stable `trigger` render-prop for CustomTooltip, so no
// new function-that-returns-JSX is defined inside the parent component body.
function makeMenuTrigger(
    onPress: () => void,
    style: any,
    iconColor: string,
    hasUnreadChats: boolean,
    accentColor: string,
    backgroundColor: string
) {
    return (triggerProps: object) => (
        <HeaderIconButton triggerProps={triggerProps} onPress={onPress} style={style} nativeID={ComponentIds.OPEN_DRAWER}>
            <Ionicons name="menu" size={24} color={iconColor} />
            {hasUnreadChats ? (
                <View
                    style={[
                        styles.notificationDot,
                        {
                            backgroundColor: accentColor,
                            borderColor: backgroundColor,
                        },
                    ]}
                />
            ) : null}
        </HeaderIconButton>
    );
}

function makeOptionsTrigger(onPress: () => void, style: any, iconColor: string) {
    return (triggerProps: object) => (
        <HeaderIconButton triggerProps={triggerProps} onPress={onPress} style={style}>
            <Entypo name="dots-three-vertical" size={22} color={iconColor} />
        </HeaderIconButton>
    );
}

const FoodOffersHeader: React.FC<FoodOffersHeaderProps> = ({
    drawerPosition,
    hasUnreadChats,
    selectedCanteen,
    openSheet,
    openOptionsModal,
}) => {
    const { theme } = useTheme();
    const { translate } = useLanguage();
    const drawerNavigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
    const { width: screenWidth } = useWindowDimensions();

    const iconPaddingStyle = isWeb && screenWidth >= 500 ? styles.paddingMedium : styles.paddingSmall;

    const rowStyle = [styles.row, drawerPosition === 'right' && styles.rowReverse];
    const col1Style = [styles.col1, drawerPosition === 'right' && styles.rowReverse];

    return (
        <View
            style={[
                styles.header,
                { backgroundColor: theme.header.background }
            ]}
        >
            <View style={rowStyle}>
                <View style={col1Style}>
                    <CustomTooltip
                        placement="top"
                        trigger={makeMenuTrigger(
                            () => drawerNavigation.toggleDrawer(),
                            iconPaddingStyle,
                            theme.header.text,
                            hasUnreadChats,
                            theme.accent,
                            theme.header.background
                        )}
                    >
                        <TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
                            <TooltipText fontSize="$sm" color={theme.tooltip.text}>
                                {`${translate(TranslationKeys.open_drawer)}`}
                            </TooltipText>
                        </TooltipContent>
                    </CustomTooltip>

                    <TouchableOpacity
                        onPress={() => openSheet('canteen')}
                        activeOpacity={0.7}
                        style={[iconPaddingStyle, styles.canteenNameButton]}
                    >
                        <Text style={[styles.heading, { color: theme.header.text }]} numberOfLines={1}>
                            {String(selectedCanteen?.alias) || 'Food Offers'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.col2, drawerPosition === 'right' && styles.rowReverse]}>
                    <BalanceQuickAccessButton style={iconPaddingStyle} />

                    <CustomTooltip
                        placement="top"
                        trigger={makeOptionsTrigger(openOptionsModal, iconPaddingStyle, theme.header.text)}
                    >
                        <TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
                            <TooltipText fontSize="$sm" color={theme.tooltip.text}>
                                {translate(TranslationKeys.more_options)}
                            </TooltipText>
                        </TooltipContent>
                    </CustomTooltip>
                </View>
            </View>
        </View>
    );
};

export default memo(FoodOffersHeader);
