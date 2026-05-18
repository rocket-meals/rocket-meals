import { Dimensions, Text, View } from 'react-native';
import AppLoadingView from '@/components/AppLoadingView';
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
import { useLanguage } from '@/hooks/useLanguage';
import { useAppSelector } from '@/redux/hooks';
import { DatabaseTypes } from 'repo-depkit-common';
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';

import AppScreen from '@/components/AppScreen';

const Index = () => {
	useSetPageTitle(TranslationKeys.my_support_tickets);
	const { theme } = useTheme();
	const isLtrLanguage = useIsLtrLanguage();
	const { translate, language } = useLanguage();
	const { primaryColor } = useAppSelector((state) => state.settings);
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
			return () => { };
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
		<AppScreen>
			{loading ? (
				<AppLoadingView size="large" height={400} />
			) : (
				<View style={{ alignItems: 'center' }}>
					<Text style={{ ...styles.groupHeading, color: theme.screen.text, alignSelf: 'flex-start', marginLeft: windowWidth > 600 ? '7.5%' : '2.5%' }}>{translate(TranslationKeys.my_support_tickets)}</Text>
					<View style={[styles.section, { width: windowWidth > 600 ? '85%' : '95%' }]}>{allTickets && allTickets?.map((item, index: number) => <SettingsList key={index} iconBgColor={primaryColor} leftIcon={<MaterialCommunityIcons name="bell" size={24} color={theme.screen.icon} />} label={item?.title ?? undefined} value={item?.date_created ? format(new Date(item.date_created), 'dd.MM.yyyy HH:mm') : 'N/A'} rightIcon={<Octicons name={isLtrLanguage ? 'chevron-right' : 'chevron-left'} size={24} color={theme.screen.icon} />} handleFunction={() => router.push(`/feedback-support?app_feedbacks_id=${item.id}`)} groupPosition={allTickets.length === 1 ? 'single' : index === 0 ? 'top' : index === allTickets.length - 1 ? 'bottom' : 'middle'} />)}</View>
				</View>
			)}
		</AppScreen>
	);
};

export default Index;
