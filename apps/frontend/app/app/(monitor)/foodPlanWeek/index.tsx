import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';
import styles from './styles';
import { Entypo, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '@/hooks/useLanguage';
import { SET_WEEK_PLAN } from '@/redux/Types/types';
import { Switch } from '@gluestack-ui/themed';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useAppSelector } from '@/redux/hooks';
import { useMyScrollviewModalSelectWeekPlanCanteen } from '@/hooks/useMyScrollviewModalSelectWeekPlanCanteen';

const Index = () => {
	useSetPageTitle(TranslationKeys.food_plan_week);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const { primaryColor: projectColor, appSettings } = useAppSelector((state) => state.settings);
	const { weekPlan } = useAppSelector((state) => state.management);
	const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
	const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : projectColor;
	const { openSelectWeekPlanCanteenModal } = useMyScrollviewModalSelectWeekPlanCanteen();

	const toggleMenuSwitch = () => {
		dispatch({
			type: SET_WEEK_PLAN,
			payload: { isAllergene: !weekPlan?.isAllergene },
		});
	};

	useEffect(() => {
		const onChange = ({ window }: { window: any }) => {
			setWindowWidth(window.width);
		};

		const subscription = Dimensions.addEventListener('change', onChange);
		return () => {
			subscription.remove();
		};
	}, []);

	return (
		<>
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
				<TouchableOpacity
					style={{
						...styles.list,
						backgroundColor: theme.screen.iconBg,
						paddingHorizontal: windowWidth > 600 ? 20 : 10,
					}}
					onPress={openSelectWeekPlanCanteenModal}
				>
					<View style={styles.col1}>
						<Ionicons name="restaurant-sharp" size={24} color={theme.screen.icon} />
						{windowWidth < 600 && weekPlan?.selectedCanteen?.alias ? <Text style={{ ...styles.label, color: theme.screen.text }}>{weekPlan?.selectedCanteen?.alias}</Text> : <Text style={{ ...styles.label, color: theme.screen.text }}>{translate(TranslationKeys.canteen)}</Text>}
					</View>
					<View style={styles.col2}>
						{windowWidth > 600 && <Text style={{ ...styles.label, color: theme.screen.text }}>{weekPlan?.selectedCanteen?.alias}</Text>}
						<MaterialCommunityIcons name="pencil" size={22} color={theme.screen.icon} />
					</View>
				</TouchableOpacity>
				<View
					style={{
						...styles.list,
						backgroundColor: theme.screen.iconBg,
						paddingHorizontal: windowWidth > 600 ? 20 : 10,
					}}
				>
					<View style={styles.col1}>
						<Text style={{ ...styles.label, color: theme.screen.text }}>Allergene Anzeigen</Text>
					</View>
					<View style={styles.col2}>
						<Switch
							value={weekPlan?.isAllergene}
							onValueChange={toggleMenuSwitch}
							thumbColor={foods_area_color}
							trackColor={{
								false: theme.screen.icon,
								true: foods_area_color,
							}}
						/>
					</View>
				</View>
				<TouchableOpacity
					style={{
						...styles.button,
						backgroundColor: theme.screen.iconBg,
						paddingHorizontal: windowWidth > 600 ? 20 : 10,
						opacity: weekPlan?.selectedCanteen?.alias ? 1 : 0.5,
					}}
					disabled={weekPlan?.selectedCanteen?.alias ? false : true}
					onPress={() => {
						if (weekPlan?.selectedCanteen?.alias) {
							router.navigate('/list-week-screen');
						}
					}}
				>
					<View style={styles.col1}>
						<Text style={{ ...styles.label, color: theme.screen.text }}>BigScreen</Text>
					</View>
					<View style={styles.col2}>
						<Entypo name="chevron-small-right" size={22} color={theme.screen.icon} />
					</View>
				</TouchableOpacity>
			</ScrollView>
		</>
	);
};

export default Index;
