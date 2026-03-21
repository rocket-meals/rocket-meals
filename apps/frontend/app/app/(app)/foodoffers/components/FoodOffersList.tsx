import React, { useCallback, memo } from 'react';
import { View, RefreshControl, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { DatabaseTypes } from 'repo-depkit-common';
import FoodOfferListItem, { FoodOfferItemSharedProps } from './FoodOfferListItem';

interface DayItem {
    foodoffer: DatabaseTypes.Foodoffers | null;
    foodofferInfoItem: DatabaseTypes.FoodoffersInfoItems | null;
}

interface FoodOffersListProps extends FoodOfferItemSharedProps {
    dayItems: DayItem[];
    numColumns: number;
    refreshing: boolean;
    onRefresh: () => void;
    ListFooterComponent: React.ReactElement | null;
    ListEmptyComponent: React.ReactElement | null;
    setListWidth: (width: number) => void;
    listWidth: number | null;
    handleMenuSheet: (sheet: any, props?: any) => void;
    handleImageSheet: (food: DatabaseTypes.Foods) => void;
    getInfoItemContent: (item: DatabaseTypes.FoodoffersInfoItems) => { content: any; popup_button_text?: any; popup_content?: any; } | null;
    feedbackMap: Map<string, any>;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
    },
    listContainer: {
        width: '100%',
        // maxWidth: 1420,
        flex: 1,
    },
    flashListContent: {
        marginTop: 20,
    },
});

const FoodOffersList: React.FC<FoodOffersListProps> = ({
    dayItems,
    numColumns,
    cardWidth,
    refreshing,
    listWidth,
    selectedCanteen,
    onRefresh,
    setListWidth,
    handleMenuSheet,
    handleImageSheet,
    getInfoItemContent,
    ListFooterComponent,
    ListEmptyComponent,
    feedbackMap,
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

    const renderItem = useCallback(({ item, index }: { item: DayItem; index: number }) => {
        // Optimization: Lookup feedback directly from the map passed as prop
        // Use food.id for lookup as feedbackMap is keyed by food ID
        const food = item.foodoffer?.food;
        const foodId = food ? (typeof food === 'string' ? food : food.id) : undefined;
        const previousFeedback = foodId ? feedbackMap.get(foodId) : undefined;

        return (
            <FoodOfferListItem
                item={item}
                index={index}
                cardWidth={cardWidth}
                selectedCanteen={selectedCanteen}
                handleMenuSheet={handleMenuSheet}
                handleImageSheet={handleImageSheet}
                getInfoItemContent={getInfoItemContent}
                itemGap={10}
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
        );
    }, [cardWidth, selectedCanteen, handleMenuSheet, handleImageSheet, getInfoItemContent, feedbackMap, language, pirateLanguage, funLanguageMode, serverInfo, appSettings, primaryColor, user, isManagement, profile, markings, screenWidth, theme, amountColumnsForcard]);

    const keyExtractor = useCallback((item: DayItem, index: number) => {
        if (item.foodoffer && item.foodoffer.id) return `f-${item.foodoffer.id}`;
        if (item.foodofferInfoItem && item.foodofferInfoItem.id) return `i-${item.foodofferInfoItem.id}`;
        return `di-${index}`;
    }, []);

    const getItemType = useCallback((item: DayItem) => {
        return item.foodoffer ? 'food' : 'info';
    }, []);

    return (
        <View style={styles.container}>
            <View
                style={styles.listContainer}
                onLayout={e => {
                    const w = e.nativeEvent.layout.width;
                    if (w && w !== listWidth) {
                        setListWidth(w);
                    }
                }}
            >
                <FlashList
                    key={numColumns} // Force re-render when numColumns changes
                    data={dayItems}
                    extraData={[
                        cardWidth,
                        selectedCanteen,
                        feedbackMap,
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
                    ]}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    getItemType={getItemType}
                    numColumns={numColumns}
                    // @ts-ignore: estimatedItemSize is missing in the type definition but required for performance
                    estimatedItemSize={280}
                    contentContainerStyle={styles.flashListContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListFooterComponent={ListFooterComponent}
                    ListEmptyComponent={ListEmptyComponent}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </View>
    );
};

export default memo(FoodOffersList, (prev, next) => {
    const isSame = 
        prev.dayItems === next.dayItems &&
        prev.numColumns === next.numColumns &&
        prev.cardWidth === next.cardWidth &&
        prev.refreshing === next.refreshing &&
        prev.listWidth === next.listWidth &&
        prev.selectedCanteen === next.selectedCanteen &&
        prev.onRefresh === next.onRefresh &&
        prev.setListWidth === next.setListWidth &&
        prev.handleMenuSheet === next.handleMenuSheet &&
        prev.handleImageSheet === next.handleImageSheet &&
        prev.getInfoItemContent === next.getInfoItemContent &&
        prev.ListFooterComponent === next.ListFooterComponent &&
        prev.feedbackMap === next.feedbackMap;

    if (!isSame) return false;

    // If everything else is same, check ListEmptyComponent ONLY if list is empty
    if (next.dayItems.length === 0) {
        return prev.ListEmptyComponent === next.ListEmptyComponent;
    }

    // If list has items, check if footer changed
    return prev.ListFooterComponent === next.ListFooterComponent &&
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
