import React, { memo } from 'react';
import { View } from 'react-native';
import { FoodItemBase } from '@/components/FoodItem/FoodItem';
import FoodOfferInfoItem from '@/components/FoodOfferInfoItem/FoodOfferInfoItem';
import { DatabaseTypes } from 'repo-depkit-common';
import styles from '../styles';

interface DayItem {
    foodoffer: DatabaseTypes.Foodoffers | null;
    foodofferInfoItem: DatabaseTypes.FoodoffersInfoItems | null;
}

export interface FoodOfferItemSharedProps {
    cardWidth: number;
    selectedCanteen: DatabaseTypes.Canteens | null;
    language?: string;
    pirateLanguage?: boolean;
    funLanguageMode?: string | null;
    serverInfo?: any;
    appSettings?: any;
    primaryColor?: string;
    user?: any;
    isManagement?: boolean;
    profile?: any;
    markings?: any[];
    screenWidth?: number;
    theme?: any;
    amountColumnsForcard?: number;
}

interface FoodOfferListItemProps extends FoodOfferItemSharedProps {
    item: DayItem;
    index: number;
    handleMenuSheet: (sheet: any, props?: any) => void;
    handleImageSheet: (food: DatabaseTypes.Foods) => void;
    getInfoItemContent: (item: DatabaseTypes.FoodoffersInfoItems) => { content: any; popup_button_text?: any; popup_content?: any; } | null;
    itemGap?: number;
    previousFeedback?: any;
}

const FoodOfferListItem: React.FC<FoodOfferListItemProps> = ({
    item,
    index,
    cardWidth,
    selectedCanteen,
    handleMenuSheet,
    handleImageSheet,
    getInfoItemContent,
    itemGap,
    previousFeedback,
    language,
    pirateLanguage,
    funLanguageMode,
    serverInfo,
    appSettings,
    primaryColor,
    user,
    isManagement,
    profile,
    markings,
    screenWidth,
    theme,
    amountColumnsForcard
}) => {
    return (
        <View
            style={[
                styles.listItemContainer,
                itemGap !== undefined && { marginHorizontal: itemGap, marginVertical: itemGap }
            ]}
        >
            {item.foodoffer ? (
                <FoodItemBase
                    canteen={selectedCanteen as any}
                    item={item.foodoffer}
                    key={item.foodoffer.id || `food-item-${index}`}
                    handleMenuSheet={handleMenuSheet}
                    handleImageSheet={handleImageSheet}
                    cardWidth={cardWidth}
                    previousFeedback={previousFeedback}
                    language={language}
                    pirateLanguage={pirateLanguage}
                    funLanguageMode={funLanguageMode}
                    serverInfo={serverInfo}
                    appSettings={appSettings}
                    primaryColor={primaryColor}
                    user={user}
                    isManagement={isManagement}
                    profile={profile}
                    markings={markings}
                    screenWidth={screenWidth}
                    theme={theme}
                    amountColumnsForcard={amountColumnsForcard}
                />
            ) : item.foodofferInfoItem ? (
                <FoodOfferInfoItem
                    key={item.foodofferInfoItem.id || `info-item-${index}`}
                    item={item.foodofferInfoItem}
                    content={
                        (getInfoItemContent(item.foodofferInfoItem) || {}).content || ''
                    }
                    cardWidth={cardWidth}
                    screenWidth={screenWidth}
                />
            ) : null}
        </View>
    );
};

export default memo(FoodOfferListItem, (prev, next) => {
    const isItemEqual = 
        prev.item.foodoffer === next.item.foodoffer && 
        prev.item.foodofferInfoItem === next.item.foodofferInfoItem;
        
    return isItemEqual &&
        prev.index === next.index &&
        prev.cardWidth === next.cardWidth &&
        prev.selectedCanteen === next.selectedCanteen &&
        prev.handleMenuSheet === next.handleMenuSheet &&
        prev.handleImageSheet === next.handleImageSheet &&
        prev.getInfoItemContent === next.getInfoItemContent &&
        prev.itemGap === next.itemGap &&
        prev.previousFeedback === next.previousFeedback &&
        prev.language === next.language &&
        prev.pirateLanguage === next.pirateLanguage &&
        prev.funLanguageMode === next.funLanguageMode &&
        prev.serverInfo === next.serverInfo &&
        prev.appSettings === next.appSettings &&
        prev.primaryColor === next.primaryColor &&
        prev.user === next.user &&
        prev.isManagement === next.isManagement &&
        prev.profile === next.profile &&
        prev.markings === next.markings &&
        prev.screenWidth === next.screenWidth &&
        prev.theme === next.theme &&
        prev.amountColumnsForcard === next.amountColumnsForcard;
});
