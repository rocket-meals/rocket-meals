import { Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import React, { useEffect } from 'react';
import { AntDesign, Entypo, EvilIcons, Feather, FontAwesome, FontAwesome5, FontAwesome6, Foundation, Ionicons, MaterialCommunityIcons, Octicons, SimpleLineIcons, Zocial } from '@expo/vector-icons';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useTheme } from '@/hooks/useTheme';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { useRouter } from 'expo-router';
import { SET_WIKIS } from '@/redux/Types/types';
import { getImageUrl } from '@/constants/HelperFunctions';
import { useLanguage } from '@/hooks/useLanguage';
import * as Linking from 'expo-linking';
import useToast from '@/hooks/useToast';
import { getTitleFromTranslation } from '@/helper/resourceHelper';
import { WikisHelper } from '@/redux/actions/Wikis/Wikis';
import { DatabaseTypes } from 'repo-depkit-common';
import { IconProps } from '@expo/vector-icons/build/createIconSet';
import { TranslationKeys } from '@/locales/keys';
import { ServerInfoHelper } from '@/helper/ServerInfoHelper';
import useChatUnreadStatus from '@/hooks/useChatUnreadStatus';
import useActiveCollectibleEvent from '@/hooks/useActiveCollectibleEvent';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import { CollectibleAt } from 'repo-depkit-common';
import useConfirmLogoutModal from '@/hooks/useConfirmLogoutModal';
import useLogoutButtonTranslation from '@/hooks/useLogoutButtonTranslation';
import { AppDrawer, DrawerItem } from 'repo-depkit-common-ui';

export const iconLibraries: Record<string, any> = {
	Ionicons,
	MaterialCommunityIcons,
	FontAwesome5,
	FontAwesome6,
	FontAwesome,
	Octicons,
	AntDesign,
	Feather,
	Entypo,
	EvilIcons,
	Foundation,
	SimpleLineIcons,
	Zocial,
};

interface MenuItemProps {
        label: string;
        iconName: string;
        iconLibName: React.ComponentType<IconProps<any>>;
        activeKey: string;
        route?: string;
        action?: () => void;
        position: number;
        hasUnread?: boolean;
        activeColor?: string;
}

const CustomDrawerContent: React.FC<DrawerContentComponentProps> = ({ navigation, state }) => {
	const { translate, translateDynamic } = useLanguage();
	const toast = useToast();
	const dispatch = useDispatch();
	const router = useRouter();
        const wikisHelper = new WikisHelper();
        const activeIndex = state.index;
        const { isManagement, isDevMode } = useAppSelector((state) => state.authReducer);
        const { chats } = useAppSelector((state) => state.chats);
        const { serverInfo, primaryColor: projectColor, language, appSettings, wikis } = useAppSelector((state) => state.settings);
        const { hasUnreadChats } = useChatUnreadStatus();
        const { hasActiveCollectibleEvent } = useActiveCollectibleEvent();
        const { openConfirmLogoutModal } = useConfirmLogoutModal();
        const { buttonLabel: logoutButtonLabel } = useLogoutButtonTranslation();
        const { theme } = useTheme();

	const balance_area_color = appSettings?.balance_area_color ? appSettings?.balance_area_color : projectColor;
	const course_timetable_area_color = appSettings?.course_timetable_area_color ? appSettings?.course_timetable_area_color : projectColor;
	const campus_area_color = appSettings?.campus_area_color ? appSettings?.campus_area_color : projectColor;
	const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : projectColor;
	const housing_area_color = appSettings?.housing_area_color ? appSettings?.housing_area_color : projectColor;
	const news_area_color = appSettings?.news_area_color ? appSettings?.news_area_color : projectColor;

	const getRouteActiveColor = (routeName: string): string | undefined => {
		switch (routeName) {
			case 'account-balance/index': return balance_area_color;
			case 'course-timetable/index': return course_timetable_area_color;
			case 'campus': return campus_area_color;
			case 'foodoffers': return foods_area_color;
			case 'housing': return housing_area_color;
			case 'news/index': return news_area_color;
			default: return projectColor;
		}
	};

        const openInBrowser = async (url: string) => {
                try {
                        if (Platform.OS === 'web') {
                                window.open(url, '_blank');
                        } else {
				const supported = await Linking.canOpenURL(url);

				if (supported) {
					await Linking.openURL(url);
				} else {
					toast(`Cannot open URL: ${url}`, 'error');
				}
			}
		} catch (error) {
			console.error('An error occurred:', error);
		}
	};

	const getWikis = async () => {
		try {
			const response = (await wikisHelper.fetchWikis()) as DatabaseTypes.Wikis[];
			if (response) {
				dispatch({ type: SET_WIKIS, payload: response });
			}
		} catch (error) {
			console.error('Error fetching wikis:', error);
		}
	};

	useEffect(() => {
		if (!wikis || wikis.length === 0) {
			getWikis();
		}
	}, []);

        const generateMenuItems = (): MenuItemProps[] => {
		let menuItems: MenuItemProps[] = [];

		// Static menu items with positions
		if (appSettings?.foods_enabled) {
			menuItems.push({
				label: translate(TranslationKeys.canteens),
				iconName: 'restaurant-sharp',
				iconLibName: Ionicons,
				activeKey: 'foodoffers',
				route: 'foodoffers',
				position: 1,
				activeColor: foods_area_color,
			});
		}

		if (appSettings?.balance_enabled) {
			menuItems.push({
				label: translate(TranslationKeys.accountbalance),
				iconName: 'credit-card',
				iconLibName: Octicons,
				activeKey: 'account-balance/index',
				route: 'account-balance/index',
				position: 3,
				activeColor: balance_area_color,
			});
		}

		if (appSettings?.campus_enabled) {
			menuItems.push({
				label: translate(TranslationKeys.campus),
				iconName: 'mortar-board',
				iconLibName: Octicons,
				activeKey: 'campus',
				route: 'campus',
				position: 5,
				activeColor: campus_area_color,
			});
		}

		if (appSettings?.housing_enabled) {
			menuItems.push({
				label: translate(TranslationKeys.housing),
				iconName: 'home',
				iconLibName: Octicons,
				activeKey: 'housing',
				route: 'housing',
				position: 6,
				activeColor: housing_area_color,
			});
		}

		if (appSettings?.news_enabled) {
			menuItems.push({
				label: translate(TranslationKeys.news),
				iconName: 'newspaper',
				iconLibName: FontAwesome6,
				activeKey: 'news/index',
				route: 'news/index',
				position: 7,
				activeColor: news_area_color,
			});
		}

                if (appSettings?.course_timetable_enabled) {
                        menuItems.push({
                                label: translate(TranslationKeys.course_timetable),
                                iconName: 'calendar-clock-outline',
                                iconLibName: MaterialCommunityIcons,
                                activeKey: 'course-timetable/index',
                                route: 'course-timetable/index',
                                position: 8,
                                activeColor: course_timetable_area_color,
                        });
                }

                if (hasActiveCollectibleEvent) {
                        menuItems.push({
                                label: translate(TranslationKeys.collectible_event_active),
                                iconName: 'trophy-outline',
                                iconLibName: MaterialCommunityIcons,
                                activeKey: 'collectible-event/index',
                                route: 'collectible-event/index',
                                position: 2,
                                hasUnread: true,
                        });
                }

                if (appSettings?.map_enabled || isDevMode) {
                        menuItems.push({
                                label: translate(TranslationKeys.map),
                                iconName: 'map-outline',
                                iconLibName: Ionicons,
                                activeKey: 'map/index',
                                route: 'map/index',
                                position: 4,
                        });
                }

                if (isManagement) {
                        menuItems.push({
                                label: translate(TranslationKeys.role_management),
                                iconName: 'bag',
                                iconLibName: Ionicons,
				activeKey: 'management/index',
				route: 'management/index',
				position: 9,
			});
			menuItems.push({
				label: translate(TranslationKeys.experimentell),
				iconName: 'flask',
				iconLibName: MaterialCommunityIcons,
				activeKey: 'experimentell/index',
				route: 'experimentell/index',
				position: 10,
			});
		}

		// Add DatabaseTypes.Wikis dynamically with position sorting
		if (wikis) {
			const wikiMenuItems = wikis
				.filter((wiki: any) => wiki.show_in_drawer) // Only show relevant wikis
				.map((wiki: any) => {
					let iconLib: any = Entypo;
					let iconName = 'home';

					if (wiki?.icon) {
						const [library, name] = wiki.icon.split(':');
						if (iconLibraries[library]) {
							iconLib = iconLibraries[library]; // Assign the library dynamically
							iconName = name;
						}
					}

					return {
						label: translateDynamic(getTitleFromTranslation(wiki?.translations, language)),
						iconName,
						iconLibName: iconLib,
						activeKey: 'faq-food/index',
						position: wiki.position ?? Number.MAX_SAFE_INTEGER,
						action: wiki.url
							? () => openInBrowser(wiki?.url)
							: () =>
									router.push({
										pathname: '/wikis',
										params: wiki?.custom_id ? { custom_id: wiki?.custom_id } : { id: wiki?.id },
									}),
					};
				});

			menuItems = [...menuItems, ...wikiMenuItems];
		}

                if (chats && chats.length > 0) {
                        menuItems.push({
                                label: translate(TranslationKeys.chats),
                                iconName: 'chat',
                                iconLibName: MaterialCommunityIcons,
                                activeKey: 'chats',
                                route: 'chats',
                                position: 9999,
                                hasUnread: hasUnreadChats,
                        });
                }

		// Sort menu items by position (smallest first)
		menuItems.sort((a, b) => a.position - b.position);

		return menuItems;
	};

	const toDrawerItems = (menuProps: MenuItemProps[]): DrawerItem[] =>
		menuProps.map((item) => ({
			key: item.activeKey,
			label: item.label,
			renderIcon: (_, color) => <item.iconLibName name={item.iconName as never} size={24} color={color} />,
			onPress: () => (item.route ? navigation.navigate(item.route) : item.action?.()),
			hasUnread: item.hasUnread,
			activeColor: item.activeColor,
		}));

	const bottomItems: DrawerItem[] = [
		{
			key: 'settings/index',
			label: translate(TranslationKeys.settings),
			renderIcon: (_, color) => <Ionicons name="settings-outline" size={28} color={color} />,
			onPress: () => navigation.navigate('settings/index'),
			activeColor: getRouteActiveColor('settings/index'),
		},
		{
			key: 'logout',
			label: logoutButtonLabel,
			renderIcon: (_, color) => <MaterialCommunityIcons name="logout" size={28} color={color} />,
			onPress: openConfirmLogoutModal,
		},
	];

	const footerContent = (
		<>
			{wikis &&
				wikis?.map((wiki: any, index: number) => {
					if (wiki?.custom_id && !wiki?.url && wiki?.show_in_drawer_as_bottom_item) {
						return (
							<React.Fragment key={index}>
								<TouchableOpacity
									onPress={() =>
										router.push({
											pathname: '/wikis',
											params: { custom_id: wiki?.custom_id },
										})
									}
								>
									<Text style={[styles.link, { color: theme.drawer.link }]}>{translateDynamic(getTitleFromTranslation(wiki?.translations, language))}</Text>
								</TouchableOpacity>
								{index + 1 < wikis?.length - 1 && <Text style={[styles.bar, { color: theme.drawer.divider }]}>|</Text>}
							</React.Fragment>
						);
					}
				})}
			<CollectibleSpot collectibleKey={CollectibleAt.collectible_at_drawer} />
		</>
	);

	const activeKey = state.routes[activeIndex].name;
	const logoUri = getImageUrl(serverInfo?.info?.project?.project_logo) ?? undefined;

	return (
		<AppDrawer
			logoSource={logoUri ? { uri: logoUri } : undefined}
			title={ServerInfoHelper.getServerName(serverInfo)}
			onLogoPress={() => navigation.navigate('foodoffers')}
			items={toDrawerItems(generateMenuItems())}
			bottomItems={bottomItems}
			activeKey={activeKey}
			primaryColor={projectColor}
			footerContent={footerContent}
		/>
	);
};

export default CustomDrawerContent;

const styles = StyleSheet.create({
	link: {
		fontSize: 14,
		paddingHorizontal: 2,
	},
	bar: {
		marginHorizontal: 10,
	},
});
