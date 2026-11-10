import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';
import IconButton from '@/components/UI/IconButton';
import { numToOneDecimal } from '@/constants/HelperFunctions';
import { TranslationKeys } from '@/locales/keys';
import sharedStyles from '../styles';
import { isWeb } from '@/constants/Constants';
import DetailsHeaderImage from '@/components/DetailsHeaderImage/DetailsHeaderImage';
import SettingsList from '@/components/SettingsList';
import type { FoodDetailsSectionBaseProps } from './types';

interface FoodHeaderProps extends FoodDetailsSectionBaseProps {
    foodDetails: any;
    screenWidth: number;
    openFullScreenImage: () => void;
    rateFood: (rating: number) => void;
    // false hides the rating row (app_settings.foods_ratings_type is disabled). A rating that the
    // current user may not use stays visible and is locked via isAccountRequired.
    showRating?: boolean;
    appSettings: any;
    defaultImage?: string | null;
}

/** Whether the rating row is drawn as one group with the notification row below it (app only, as before). */
export function isFoodHeaderGroupedWithNotification() {
    return !isWeb;
}

const StarRatingIconButton = ({
    triggerProps,
    onPress,
    filled,
    color,
}: {
    triggerProps: object;
    onPress: () => void;
    filled: boolean;
    color: string;
}) => (
    <IconButton {...triggerProps} onPress={onPress} style={sharedStyles.paddingSmall}>
        <MaterialIcons name={filled ? 'star' : 'star-border'} size={22} color={color} />
    </IconButton>
);

// Factory returning a stable `trigger` render-prop for CustomTooltip, so no
// new function-that-returns-JSX is defined inside the parent component body.
function makeStarRatingTrigger(onPress: () => void, filled: boolean, color: string) {
    return (triggerProps: object) => (
        <StarRatingIconButton triggerProps={triggerProps} onPress={onPress} filled={filled} color={color} />
    );
}

function resolveDisplayRating(foodDetails: any) {
    const rating = foodDetails?.rating_average || foodDetails?.rating_average_legacy;
    return rating && numToOneDecimal(rating);
}

// "Average rating" badge (star icon + value), shown when `foods_ratings_average_display` is enabled.
// Same look as before: on web below the image on the right, in the app on the image (top left,
// the top right corner holds the expand button).
const RatingAverageBadge = ({
    appSettings,
    foodDetails,
    theme,
    foodsAreaColor,
}: {
    appSettings: any;
    foodDetails: any;
    theme: any;
    foodsAreaColor: string;
}) => {
    if (!appSettings?.foods_ratings_average_display) {
        return null;
    }
    return (
        <View style={[isWeb ? sharedStyles.ratingView : sharedStyles.mobileRatingView, { borderColor: theme.screen.text, backgroundColor: theme.screen.iconBg }]}>
            <AntDesign name="star" size={isWeb ? 22 : 18} color={foodsAreaColor} />
            <Text style={[isWeb ? sharedStyles.totalRating : sharedStyles.mobileTotalRating, { color: theme.screen.text }]}>{resolveDisplayRating(foodDetails)}</Text>
        </View>
    );
};

const FoodHeader = ({
    foodDetails,
    screenWidth,
    openFullScreenImage,
    rateFood,
    showRating = true,
    previousFeedback,
    appSettings,
    foodsAreaColor,
    theme,
    translate,
    defaultImage,
    isAccountRequired,
    onAccountRequired,
    containerWidth,
}: FoodHeaderProps) => {
    const imageRemoteUrl = foodDetails?.image_remote_url;
    const imageAssetId = typeof foodDetails?.image === 'object' ? foodDetails?.image?.id : foodDetails?.image;

    const renderStarItem = useCallback((index: number) => (
        <React.Fragment key={index}>
            {isWeb ? (
                <CustomTooltip
                    placement="top"
                    trigger={makeStarRatingTrigger(() => rateFood(index + 1), previousFeedback?.rating > index, foodsAreaColor)}
                >
                    <TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
                        <TooltipText fontSize="$sm" color={theme.tooltip.text}>
                            {`${translate(TranslationKeys.set_rating_to)} ${index + 1}`}
                        </TooltipText>
                    </TooltipContent>
                </CustomTooltip>
            ) : (
                <TouchableOpacity onPress={() => rateFood(index + 1)}>
                    <MaterialIcons
                        name={previousFeedback?.rating > index ? 'star' : 'star-border'}
                        size={20}
                        color={foodsAreaColor}
                    />
                </TouchableOpacity>
            )}
        </React.Fragment>
    ), [previousFeedback?.rating, foodsAreaColor, rateFood, theme, translate]);

    const ratingStars = (
        <View style={isWeb ? sharedStyles.stars : sharedStyles.mobileStars}>
            {Array.from({ length: 5 }).map((_, index) => renderStarItem(index))}
        </View>
    );

    // Same heading as before: web with the size depending on the screen width, app with its own style
    const titleStyle = isWeb
        ? [sharedStyles.foodHeading, sharedStyles.widthFull, sharedStyles.textCenter, screenWidth > 800 ? sharedStyles.fontSizeLarge : sharedStyles.fontSizeMedium]
        : sharedStyles.mobileFoodHeading;
    const ratingBadge = <RatingAverageBadge appSettings={appSettings} foodDetails={foodDetails} theme={theme} foodsAreaColor={foodsAreaColor} />;

    return (
        <View style={[styles.container, containerWidth ? { width: containerWidth as any } : null]}>
            <DetailsHeaderImage remoteImageUrl={imageRemoteUrl} assetId={imageAssetId} defaultImageUrl={defaultImage} onOpenFullScreen={openFullScreenImage}>
                {!isWeb && <View style={styles.badgeOnImage} pointerEvents="none">{ratingBadge}</View>}
            </DetailsHeaderImage>
            {isWeb && <View style={[sharedStyles.fullWidthEnd, styles.badgeBelowImage]}>{ratingBadge}</View>}
            <Text style={[titleStyle, { color: theme.screen.text }]}>{foodDetails?.name}</Text>
            {showRating && (
                <View style={sharedStyles.marginTopMedium}>
                    {/* in the app the rating groups with the notification item below it (see isFoodHeaderGroupedWithNotification) */}
                    <SettingsList
                        leftIcon={<MaterialIcons name="star" size={22} />}
                        iconBgColor={foodsAreaColor}
                        title={translate(TranslationKeys.RATE_FOOD)}
                        rightElement={ratingStars}
                        showSeparator={false}
                        groupPosition={isFoodHeaderGroupedWithNotification() ? 'top' : 'single'}
                        isAccountRequired={isAccountRequired}
                        onAccountRequired={onAccountRequired}
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignSelf: 'center',
        paddingTop: 10,
    },
    badgeOnImage: {
        position: 'absolute',
        top: 12,
        left: 12,
    },
    badgeBelowImage: {
        marginTop: 12,
    },
});

export default memo(FoodHeader, (prevProps, nextProps) => {
    return (
        prevProps.foodDetails === nextProps.foodDetails &&
        prevProps.screenWidth === nextProps.screenWidth &&
        prevProps.previousFeedback === nextProps.previousFeedback &&
        prevProps.foodsAreaColor === nextProps.foodsAreaColor &&
        prevProps.theme === nextProps.theme &&
        prevProps.defaultImage === nextProps.defaultImage &&
        prevProps.isAccountRequired === nextProps.isAccountRequired &&
        prevProps.showRating === nextProps.showRating &&
        prevProps.onAccountRequired === nextProps.onAccountRequired &&
        prevProps.containerWidth === nextProps.containerWidth
    );
});
