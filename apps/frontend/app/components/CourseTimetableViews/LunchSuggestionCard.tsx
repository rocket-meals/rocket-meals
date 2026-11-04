import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { myContrastColor } from '@/helper/ColorHelper';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import useFoodOfferDetailsModal from '@/hooks/useFoodOfferDetailsModal';
import { useAppSelector } from '@/redux/hooks';
import { SET_SELECTED_DATE } from '@/redux/Types/types';
import { TranslationKeys } from '@/locales/keys';
import { darkTheme } from '@/styles/themes';
import { getFoodOfferName } from '@/helper/resourceHelper';
import { minutesToTime } from '@/helper/courseTimetable/CourseTimetableModel';
import type { LunchSuggestion } from '@/hooks/useCourseTimetableLunchSuggestions';

/** Shows the suggested lunch break: the free block, the best fitting food and the opening hours. */
const LunchSuggestionCard: React.FC<{ suggestion: LunchSuggestion; dateString: string }> = ({ suggestion, dateString }) => {
	const { theme } = useTheme();
	const isDark = theme === darkTheme;
	const { translate } = useLanguage();
	const router = useRouter();
	const dispatch = useDispatch();
	const { openFoodOfferDetailsModal } = useFoodOfferDetailsModal();
	const { primaryColor, appSettings, language } = useAppSelector(state => state.settings);
	const badgeColor = appSettings?.foods_area_color || primaryColor;

	const foodName = getFoodOfferName(suggestion.food, language);
	const openingHours = suggestion.openingRanges.map(range => `${minutesToTime(range.start)}–${minutesToTime(range.end)}`).join(', ');
	const breakRange = `${minutesToTime(suggestion.start)}–${minutesToTime(suggestion.end)}`;
	const foodId = typeof suggestion.food.food === 'object' ? suggestion.food.food?.id : (suggestion.food.food ?? undefined);

	const openFoodOffers = () => {
		dispatch({ type: SET_SELECTED_DATE, payload: dateString });
		router.navigate('/foodoffers');
	};

	return (
		<View style={[styles.card, { backgroundColor: theme.screen.iconBg }]}>
			<View style={styles.headerRow}>
				<Text style={[styles.label, { color: theme.screen.placeholder }]}>{`${translate(TranslationKeys.course_timetable_break)} · ${breakRange}`}</Text>
				<View style={[styles.badge, { backgroundColor: badgeColor }]}>
					<Text style={[styles.badgeText, { color: myContrastColor(badgeColor, theme, isDark) }]}>{translate(TranslationKeys.course_timetable_lunch_suggestion)}</Text>
				</View>
			</View>
			<TouchableOpacity style={styles.foodRow} onPress={() => openFoodOfferDetailsModal(suggestion.food.id, foodId ?? undefined, suggestion.food)} accessibilityRole="button">
				<View style={[styles.foodIcon, { backgroundColor: theme.screen.background }]}>
					<MaterialCommunityIcons name="silverware-fork-knife" size={20} color={theme.screen.icon} />
				</View>
				<View style={styles.foodText}>
					<Text style={[styles.foodName, { color: theme.screen.text }]} numberOfLines={2}>
						{foodName}
					</Text>
					<Text style={[styles.hours, { color: theme.screen.placeholder }]}>{`${translate(TranslationKeys.course_timetable_canteen_open)} ${openingHours}`}</Text>
				</View>
			</TouchableOpacity>
			<TouchableOpacity onPress={openFoodOffers} style={styles.link} accessibilityRole="link">
				<Text style={[styles.linkText, { color: theme.screen.text }]}>{translate(TranslationKeys.course_timetable_open_food_offers)}</Text>
				<MaterialCommunityIcons name="arrow-right" size={18} color={theme.screen.text} />
			</TouchableOpacity>
		</View>
	);
};

export default LunchSuggestionCard;

const styles = StyleSheet.create({
	card: {
		borderRadius: 16,
		padding: 14,
		gap: 10,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		flexWrap: 'wrap',
		gap: 6,
	},
	label: {
		fontSize: 13,
		fontFamily: 'Poppins_600SemiBold',
	},
	badge: {
		borderRadius: 6,
		paddingHorizontal: 8,
		paddingVertical: 2,
	},
	badgeText: {
		fontSize: 12,
		fontFamily: 'Poppins_600SemiBold',
	},
	foodRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	foodIcon: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	foodText: {
		flex: 1,
		gap: 2,
	},
	foodName: {
		fontSize: 15,
		fontFamily: 'Poppins_600SemiBold',
	},
	hours: {
		fontSize: 13,
		fontFamily: 'Poppins_400Regular',
	},
	link: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		alignSelf: 'flex-start',
		paddingVertical: 4,
	},
	linkText: {
		fontSize: 14,
		fontFamily: 'Poppins_700Bold',
	},
});
