import { ActivityIndicator, Dimensions, ScrollView, Text, View } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { AppFeedback } from '@/redux/actions/AppFeedback/AppFeedback';
import SettingsList from '@/components/SettingsList';
import { MaterialCommunityIcons, Octicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { DatabaseTypes } from 'repo-depkit-common';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { useLanguage } from '@/hooks/useLanguage';

const Index = () => {
	useSetPageTitle(TranslationKeys.my_support_tickets);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor } = useSelector((state: RootState) => state.settings);
	const appFeedback = new AppFeedback();
	const [loading, setLoading] = useState(false);
	const [allTickets, setAllTickets] = useState<DatabaseTypes.AppFeedbacks[] | null>(null);
	const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);

	const getAllTickets = async () => {
		setLoading(true);
		const allTickets = (await appFeedback.fetchAppFeedback()) as DatabaseTypes.AppFeedbacks[];
		if (allTickets) {
			setAllTickets(allTickets);
			setLoading(false);
		}
	};

	useFocusEffect(
		useCallback(() => {
			getAllTickets();
			return () => {};
		}, [])
	);

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
		<ScrollView style={[styles.container, { backgroundColor: theme.screen.background }]} contentContainerStyle={styles.contentContainer}>
			{loading ? (
				<View
					style={{
						width: '100%',
						height: 400,
						justifyContent: 'center',
						alignItems: 'center',
					}}
				>
					<ActivityIndicator size="large" color={theme.screen.text} />
				</View>
			) : (
				<>
					<Text style={{ ...styles.groupHeading, color: theme.screen.text }}>{translate(TranslationKeys.my_support_tickets)}</Text>
					<View style={[styles.section, { width: windowWidth > 600 ? '85%' : '95%' }]}>{allTickets && allTickets?.map((item, index: number) => <SettingsList key={index} iconBgColor={primaryColor} leftIcon={<MaterialCommunityIcons name="bell" size={24} color={theme.screen.icon} />} label={item?.title} value={item?.date_created ? format(new Date(item.date_created), 'dd.MM.yyyy HH:mm') : 'N/A'} rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />} handleFunction={() => router.push(`/feedback-support?app_feedbacks_id=${item.id}`)} groupPosition={allTickets.length === 1 ? 'single' : index === 0 ? 'top' : index === allTickets.length - 1 ? 'bottom' : 'middle'} />)}</View>
				</>
			)}
		</ScrollView>
	);
};

export default Index;
