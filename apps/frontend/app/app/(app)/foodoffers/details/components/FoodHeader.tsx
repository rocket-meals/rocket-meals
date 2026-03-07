import React, { memo, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import IconButton from '@/components/UI/IconButton';
import { getImageUrl, numToOneDecimal } from '@/constants/HelperFunctions';
import { TranslationKeys } from '@/locales/keys';
import styles from '../styles';
import { isWeb } from '@/constants/Constants';
import MyImage from '@/components/MyImage';
import SettingsList from '@/components/SettingsList';

interface FoodHeaderProps {
    foodDetails: any;
    screenWidth: number;
    openFullScreenImage: () => void;
    rateFood: (rating: number) => void;
    previousFeedback: any;
    appSettings: any;
    foodsAreaColor: string;
    theme: any;
    translate: (key: string) => string;
    defaultImage?: string | null;
}

const FoodHeader = ({
    foodDetails,
    screenWidth,
    openFullScreenImage,
    rateFood,
    previousFeedback,
    appSettings,
    foodsAreaColor,
    theme,
    translate,
    defaultImage,
}: FoodHeaderProps) => {
    const isLargeScreen = screenWidth > 1000;
    const isMediumScreen = screenWidth > 800;

    const dynamicImageStyle = useMemo(() => ({
        width: isLargeScreen ? 400 : screenWidth - 40,
        height: isLargeScreen ? 400 : screenWidth - 40,
    }), [isLargeScreen, screenWidth]);

    const renderRatingStars = useCallback(() => (
        <View style={isWeb ? styles.stars : styles.mobileStars}>
            {Array.from({ length: 5 }).map((_, index) => (
                <React.Fragment key={index}>
                    {isWeb ? (
                        <Tooltip
                            placement="top"
                            trigger={(triggerProps) => (
                                <IconButton {...triggerProps} onPress={() => rateFood(index + 1)} style={styles.paddingSmall}>
                                    <MaterialIcons
                                        name={previousFeedback?.rating > index ? 'star' : 'star-border'}
                                        size={22}
                                        color={foodsAreaColor}
                                    />
                                </IconButton>
                            )}
                        >
                            <TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
                                <TooltipText fontSize="$sm" color={theme.tooltip.text}>
                                    {`${translate(TranslationKeys.set_rating_to)} ${index + 1}`}
                                </TooltipText>
                            </TooltipContent>
                        </Tooltip>
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
            ))}
        </View>
    ), [isWeb, previousFeedback?.rating, foodsAreaColor, rateFood, theme, translate]);

    if (isWeb) {
        return (
            <>
                <View
                    style={[
                        styles.featuredContainer,
                        isLargeScreen ? styles.featuredContainerLarge : styles.featuredContainerSmall
                    ]}
                >
                    <View
                        style={[
                            styles.foodDetail,
                            isLargeScreen ? styles.foodDetailLarge : styles.foodDetailSmall
                        ]}
                    >
                        <View
                        style={[
                            styles.imageContainer,
                            dynamicImageStyle
                        ]}
                    >
                            <TouchableOpacity onPress={openFullScreenImage} activeOpacity={0.9} style={styles.featuredImage}>
                                <MyImage
                                    style={styles.featuredImage}
                                    remote_image_url={foodDetails?.image_remote_url}
                                    directus_asset_id={foodDetails?.image}
                                    defaultImageUrl={defaultImage}
                                    contentFit="cover"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View
                        style={[
                            styles.detailsContainer,
                            isLargeScreen ? styles.detailsContainerLarge : styles.detailsContainerSmall,
                            isMediumScreen ? styles.paddingHorizontalMedium : styles.paddingHorizontalNone
                        ]}
                    >
                        <View style={styles.fullWidthEnd}>
                            {appSettings?.foods_ratings_average_display && (
                                <View
                                    style={[
                                        styles.ratingView,
                                        { borderColor: theme.screen.text, backgroundColor: theme.screen.iconBg }
                                    ]}
                                >
                                    <AntDesign name="star" size={22} color={foodsAreaColor} />
                                    <Text
                                        style={[
                                            styles.totalRating,
                                            { color: theme.screen.text }
                                        ]}
                                    >
                                        {(foodDetails?.rating_average || foodDetails?.rating_average_legacy) &&
                                            numToOneDecimal(
                                                foodDetails?.rating_average || foodDetails?.rating_average_legacy
                                            )}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={isLargeScreen ? null : styles.marginTopMedium}>
                            <SettingsList
                                leftIcon={<MaterialIcons name="star" size={22} />}
                                iconBgColor={foodsAreaColor}
                                title={translate(TranslationKeys.RATE_FOOD)}
                                rightElement={renderRatingStars()}
                                showSeparator={false}
                                groupPosition="single"
                                isAccountRequired={true}
                            />
                        </View>
                    </View>
                </View>
                <View
                    style={[
                        styles.featuredContainer,
                        isLargeScreen ? styles.featuredContainerLarge : styles.featuredContainerSmall
                    ]}
                >
                    <Text
                        style={[
                            styles.foodHeading,
                            styles.widthFull,
                            { color: theme.screen.text },
                            isLargeScreen ? styles.textLeft : styles.textCenter,
                            styles.flexColumn,
                            isMediumScreen ? styles.fontSizeLarge : styles.fontSizeMedium
                        ]}
                    >
                        {foodDetails?.name}
                    </Text>
                </View>
            </>
        );
    }

    return (
        <View style={styles.mobileImageContainer}>
            <TouchableOpacity onPress={openFullScreenImage} activeOpacity={0.9} style={styles.mobileFeaturedImage}>
                <MyImage
                    style={styles.mobileFeaturedImage}
                    remote_image_url={foodDetails?.image_remote_url}
                    directus_asset_id={foodDetails?.image}
                    defaultImageUrl={defaultImage}
                    contentFit="cover"
                />
            </TouchableOpacity>
            <View style={styles.overlay} pointerEvents="box-none">
                <View style={styles.mobileDetailsHeader}>
                    <View style={styles.row}>
                        <View />
                        {appSettings?.foods_ratings_average_display && (
                            <View
                                style={[
                                    styles.mobileRatingView,
                                    { borderColor: theme.screen.text, backgroundColor: theme.screen.iconBg }
                                ]}
                            >
                                <AntDesign name="star" size={18} color={foodsAreaColor} />
                                <Text
                                    style={[
                                        styles.mobileTotalRating,
                                        { color: theme.screen.text }
                                    ]}
                                >
                                    {(foodDetails?.rating_average || foodDetails?.rating_average_legacy) &&
                                        numToOneDecimal(
                                            foodDetails?.rating_average || foodDetails?.rating_average_legacy
                                        )}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
                <View style={styles.mobileDetailsFooter}></View>
            </View>
            <Text
                style={[
                    styles.mobileFoodHeading,
                    { color: theme.screen.text }
                ]}
            >
                {foodDetails?.name}
            </Text>
            <View style={styles.marginTopMedium}>
                <SettingsList
                    leftIcon={<MaterialIcons name="star" size={22} />}
                    iconBgColor={foodsAreaColor}
                    title={translate(TranslationKeys.RATE_FOOD)}
                    rightElement={renderRatingStars()}
                    showSeparator={false}
                    groupPosition="single"
                    isAccountRequired={true}
                />
            </View>
        </View>
    );
};

export default memo(FoodHeader, (prevProps, nextProps) => {
    return (
        prevProps.foodDetails === nextProps.foodDetails &&
        prevProps.screenWidth === nextProps.screenWidth &&
        prevProps.previousFeedback === nextProps.previousFeedback &&
        prevProps.foodsAreaColor === nextProps.foodsAreaColor &&
        prevProps.theme === nextProps.theme &&
        prevProps.defaultImage === nextProps.defaultImage
    );
});
