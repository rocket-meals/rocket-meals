import { ScrollView, View } from 'react-native';
import React from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { FontAwesome, Ionicons, MaterialCommunityIcons, Octicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';
import { SET_DAY_PLAN, SET_FOOD_PLAN, SET_WEEK_PLAN } from '@/redux/Types/types';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import SettingsGroupTitle from '@/components/SettingsGroupTitle';
import SettingsList from '@/components/SettingsList';

const Index = () => {
	useSetPageTitle(TranslationKeys.role_management);
	const { translate } = useLanguage();
        const { theme } = useTheme();
        const dispatch = useDispatch();

        return (
                <ScrollView
			style={{
				...styles.container,
				backgroundColor: theme.screen.background,
			}}
			contentContainerStyle={{
                                ...styles.contentContainer,
                                backgroundColor: theme.screen.background,
                        }}
                >
                        <View style={{ ...styles.content }}>
                                <SettingsGroupTitle>{translate(TranslationKeys.meal_guidance_system)}</SettingsGroupTitle>
                                <View style={styles.groupContainer}>
                                        <SettingsList
                                                leftIcon={<MaterialCommunityIcons name="calendar" size={24} />}
                                                label={translate(TranslationKeys.foodweekplan)}
                                                rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />}
                                                onPress={() => {
                                                        dispatch({
                                                                type: SET_WEEK_PLAN,
                                                                payload: {
                                                                        selectedCanteen: {},
                                                                        isAllergene: true,
                                                                },
                                                        });
                                                        router.navigate('/foodPlanWeek');
                                                }}
                                                groupPosition="top"
                                        />
                                        <SettingsList
                                                leftIcon={<MaterialCommunityIcons name="folder-image" size={24} />}
                                                label={translate(TranslationKeys.foodBigScreen)}
                                                rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />}
                                                onPress={() => {
                                                        dispatch({
                                                                type: SET_DAY_PLAN,
                                                                payload: {
                                                                        selectedCanteen: {},
                                                                        mealOfferCategory: '',
                                                                        isMenuCategory: true,
                                                                        nextFoodInterval: 10,
                                                                        refreshInterval: 300,
                                                                        isFullScreen: true,
                                                                        foodCategory: '',
                                                                        isMenuCategoryName: true,
                                                                },
                                                        });
                                                        router.navigate('/foodPlanDay');
                                                }}
                                                groupPosition="middle"
                                        />
                                        <SettingsList
                                                leftIcon={<MaterialCommunityIcons name="view-list" size={24} />}
                                                label={translate(TranslationKeys.monitorDayPlan)}
                                                rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />}
                                                onPress={() => {
                                                        dispatch({
                                                                type: SET_FOOD_PLAN,
                                                                payload: {
                                                                        selectedCanteen: {},
                                                                        additionalSelectedCanteen: {},
                                                                        nextFoodInterval: 10,
                                                                        refreshInterval: 300,
                                                                },
                                                        });
                                                        router.navigate('/foodPlanList');
                                                }}
                                                groupPosition="middle"
                                        />
                                        <SettingsList
                                                leftIcon={<Ionicons name="bag-add" size={24} />}
                                                label={translate(TranslationKeys.markings)}
                                                rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />}
                                                onPress={() => {
                                                        router.navigate('/labels');
                                                }}
                                                groupPosition="bottom"
                                        />
                                </View>

                                <SettingsGroupTitle>{translate(TranslationKeys.forms)}</SettingsGroupTitle>
                                <View style={styles.groupContainer}>
                                        <SettingsList
                                                leftIcon={<FontAwesome name="list-alt" size={22} />}
                                                label={translate(TranslationKeys.form_categories)}
                                                rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />}
                                                onPress={() => {
                                                        router.navigate('/form-categories');
                                                }}
                                                groupPosition="single"
                                        />
                                </View>

                                <SettingsGroupTitle>{translate(TranslationKeys.event_monitors)}</SettingsGroupTitle>
                                <View style={styles.groupContainer}>
                                        <SettingsList
                                                leftIcon={<MaterialCommunityIcons name="trophy" size={24} />}
                                                label={translate(TranslationKeys.collectible_event_monitor)}
                                                rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />}
                                                onPress={() => {
                                                        router.navigate('/collectible-event-monitor');
                                                }}
                                                groupPosition="single"
                                        />
                                </View>

                                <SettingsGroupTitle>{translate(TranslationKeys.rss_feed)}</SettingsGroupTitle>
                                <View style={styles.groupContainer}>
                                        <SettingsList
                                                leftIcon={<FontAwesome name="rss-square" size={22} />}
                                                label={translate(TranslationKeys.rss_feed)}
                                                rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />}
                                                onPress={() => {
                                                        router.navigate('/rss-feed-config');
                                                }}
                                                groupPosition="single"
                                        />
                                </View>

                                <SettingsGroupTitle>{translate(TranslationKeys.statistiken)}</SettingsGroupTitle>
                                <View style={styles.groupContainer}>
                                        <SettingsList
                                                leftIcon={<MaterialCommunityIcons name="calendar" size={24} />}
                                                label={translate(TranslationKeys.test_statistik)}
                                                rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />}
                                                onPress={() => {
                                                        router.navigate('/statistics');
                                                }}
                                                groupPosition="single"
                                        />
                                </View>
                        </View>
                </ScrollView>
        );
};

export default Index;
