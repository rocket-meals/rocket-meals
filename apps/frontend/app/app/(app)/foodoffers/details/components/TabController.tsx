import React, { memo, useCallback } from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';
import IconButton from '@/components/UI/IconButton';
import { TranslationKeys } from '@/locales/keys';
import styles from '../styles';
import { isWeb } from '@/constants/Constants';
import { FoodAreaDisplayProps } from './types';

interface TabControllerProps extends FoodAreaDisplayProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    contrastColor: string;
    translate: (key: string) => string;
    containerWidth: string | number;
}

const TabController = ({
    activeTab,
    setActiveTab,
    theme,
    contrastColor,
    translate,
    containerWidth,
    foodsAreaColor,
}: TabControllerProps) => {
    const getTabStyle = useCallback((tabName: string) => [
        styles.tab,
        activeTab === tabName
            ? { backgroundColor: foodsAreaColor, borderColor: foodsAreaColor }
            : { backgroundColor: theme.screen.iconBg, borderColor: theme.screen.icon + '40' }
    ], [activeTab, foodsAreaColor, theme.screen.iconBg, theme.screen.icon]);

    const renderTab = (tabName: string, iconName: any, labelKey: string) => (
        <CustomTooltip
            placement="top"
            trigger={(triggerProps) => (
                <IconButton
                    {...triggerProps}
                    style={getTabStyle(tabName)}
                    activeOpacity={1}
                    onPress={(e: any) => {
                        setActiveTab(tabName);
                        if (triggerProps.onPress) {
                            triggerProps.onPress(e);
                        }
                    }}
                    padding={10}
                >
                    <View style={styles.tabContent}>
                        <MaterialCommunityIcons
                            name={iconName}
                            size={22}
                            color={activeTab === tabName ? contrastColor : theme.screen.icon}
                        />
                        <Text
                            style={[
                                styles.tabLabel,
                                { color: activeTab === tabName ? contrastColor : theme.screen.icon },
                            ]}
                            numberOfLines={1}
                        >
                            {translate(labelKey)}
                        </Text>
                    </View>
                </IconButton>
            )}
        >
            <TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
                <TooltipText fontSize="$sm" color={theme.tooltip.text}>
                    {translate(labelKey)}
                </TooltipText>
            </TooltipContent>
        </CustomTooltip>
    );

    return (
        <View
            style={[
                styles.tabViewContainer,
                { width: containerWidth as number }
            ]}
        >
            <View
                style={[
                    styles.tabs,
                    isWeb ? styles.tabsWeb : styles.tabsMobile
                ]}
            >
                {renderTab('feedbacks', 'chat', TranslationKeys.food_feedbacks)}
                {renderTab('details', 'nutrition', TranslationKeys.food_data)}
                {renderTab('labels', 'medical-bag', TranslationKeys.markings)}
            </View>
        </View>
    );
};

export default memo(TabController, (prevProps, nextProps) => {
    return (
        prevProps.activeTab === nextProps.activeTab &&
        prevProps.theme === nextProps.theme &&
        prevProps.contrastColor === nextProps.contrastColor &&
        prevProps.containerWidth === nextProps.containerWidth &&
        prevProps.foodsAreaColor === nextProps.foodsAreaColor
    );
});
