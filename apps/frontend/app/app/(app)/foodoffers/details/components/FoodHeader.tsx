import React, { memo, useMemo, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { AntDesign, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';
import IconButton from '@/components/UI/IconButton';
import { getImageUrl, numToOneDecimal } from '@/constants/HelperFunctions';
import { TranslationKeys } from '@/locales/keys';
import sharedStyles from '../styles';
import { isWeb } from '@/constants/Constants';
import MyImage from '@/components/MyImage';
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

// Share of the window height the image may take, so the name and rating stay visible below it
const IMAGE_MAX_HEIGHT_SHARE = 0.38;
const IMAGE_MIN_HEIGHT = 180;
const IMAGE_RADIUS = 25;

/**
 * Size of the food image: always the full width, at most square, and at most a share of the
 * window height. On a phone in portrait that is (nearly) square, on wide screens (landscape,
 * tablet, desktop) it becomes wider than high and the photo is zoomed in (contentFit cover).
 */
export function computeFoodHeaderImageSize(contentWidth: number, windowHeight: number) {
    const maxHeight = Math.max(IMAGE_MIN_HEIGHT, windowHeight * IMAGE_MAX_HEIGHT_SHARE);
    return { width: contentWidth, height: Math.min(contentWidth, maxHeight) };
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

/**
 * Round button in the image's top right corner: a spinner while the high resolution image is
 * still loading (the low resolution one from the list is shown meanwhile), afterwards an
 * expand icon that opens the image in full screen.
 */
const ImageCornerButton = ({ loading, onPress, translate }: { loading: boolean; onPress: () => void; translate: (key: string) => string }) => (
    <TouchableOpacity
        style={styles.cornerButton}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={translate(loading ? TranslationKeys.image_loading_high_resolution : TranslationKeys.image_enlarge)}
    >
        {loading ? <ActivityIndicator size="small" color="#ffffff" /> : <MaterialCommunityIcons name="arrow-expand" size={20} color="#ffffff" />}
    </TouchableOpacity>
);

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
    const { height: windowHeight } = useWindowDimensions();
    // Real width of the header, measured, because containerWidth is a percentage
    const [contentWidth, setContentWidth] = useState(Math.max(0, screenWidth - 40));
    const onLayout = useCallback((event: LayoutChangeEvent) => {
        const width = Math.round(event.nativeEvent.layout.width);
        if (width > 0) setContentWidth(width);
    }, []);
    const imageSize = useMemo(() => computeFoodHeaderImageSize(contentWidth, windowHeight), [contentWidth, windowHeight]);

    const imageRemoteUrl = foodDetails?.image_remote_url;
    const imageAssetId = typeof foodDetails?.image === 'object' ? foodDetails?.image?.id : foodDetails?.image;
    // The food card loads the asset at 512px, so that URL is usually cached already. It shows at once
    // while the high-res version (2048px) loads. A remote URL is the same in both places anyway.
    const imagePlaceholder = useMemo(() => {
        if (imageRemoteUrl || !imageAssetId) return undefined;
        const previewUrl = getImageUrl(String(imageAssetId));
        return previewUrl ? { uri: previewUrl } : undefined;
    }, [imageRemoteUrl, imageAssetId]);

    // Which image has finished loading. Keyed by the image so a different food starts loading again.
    const imageKey = imageRemoteUrl || (imageAssetId ? String(imageAssetId) : null);
    const [loadedImageKey, setLoadedImageKey] = useState<string | null>(null);
    const markImageLoaded = useCallback(() => setLoadedImageKey(imageKey), [imageKey]);
    const isHighResLoading = !!imageKey && loadedImageKey !== imageKey;

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
        <View onLayout={onLayout} style={[styles.container, containerWidth ? { width: containerWidth as any } : null]}>
            <View style={[styles.imageFrame, { width: imageSize.width, height: imageSize.height, backgroundColor: theme.screen.iconBg }]}>
                <TouchableOpacity onPress={openFullScreenImage} activeOpacity={0.9} style={StyleSheet.absoluteFill} accessibilityRole="imagebutton" accessibilityLabel={translate(TranslationKeys.image_enlarge)}>
                    <MyImage
                        style={styles.image}
                        remote_image_url={imageRemoteUrl}
                        directus_asset_id={imageAssetId}
                        defaultImageUrl={defaultImage}
                        contentFit="cover"
                        placeholder={imagePlaceholder}
                        placeholderContentFit="cover"
                        onLoad={markImageLoaded}
                        onError={markImageLoaded}
                    />
                </TouchableOpacity>
                {!isWeb && <View style={styles.badgeOnImage} pointerEvents="none">{ratingBadge}</View>}
                <ImageCornerButton loading={isHighResLoading} onPress={openFullScreenImage} translate={translate} />
            </View>
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
    imageFrame: {
        borderRadius: IMAGE_RADIUS,
        overflow: 'hidden',
        alignSelf: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    cornerButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
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
