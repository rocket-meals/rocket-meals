import { ActivityIndicator, Dimensions, Text, View } from 'react-native';
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
import { FlashList } from '@shopify/flash-list';

const Index = () => {
	useSetPageTitle(TranslationKeys.my_support_tickets);
	const { theme } = useTheme();
	const { translate } = useLanguage();
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
		<View style={[styles.container, { backgroundColor: theme.screen.background }]}>
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
				<View style={{ flex: 1, alignItems: 'center' }}>
					<View style={[styles.section, { width: windowWidth > 600 ? '85%' : '95%', flex: 1 }]}>
						<FlashList
							data={allTickets || []}
							keyExtractor={(item, index) => item?.id ?? String(index)}
							renderItem={({ item, index }) => (
								<SettingsList
									iconBgColor={primaryColor}
									leftIcon={<MaterialCommunityIcons name="bell" size={24} color={theme.screen.icon} />}
									label={item?.title ?? undefined}
									value={item?.date_created ? format(new Date(item.date_created), 'dd.MM.yyyy HH:mm') : 'N/A'}
									rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />}
									handleFunction={() => router.push(`/feedback-support?app_feedbacks_id=${item.id}`)}
									groupPosition={(allTickets?.length ?? 0) === 1 ? 'single' : index === 0 ? 'top' : index === (allTickets?.length ?? 0) - 1 ? 'bottom' : 'middle'}
								/>
							)}
							ListHeaderComponent={
								<Text style={{ ...styles.groupHeading, color: theme.screen.text }}>{translate(TranslationKeys.my_support_tickets)}</Text>
							}
							contentContainerStyle={{ paddingBottom: 20 }}
							// @ts-ignore: estimatedItemSize is missing in the type definition but required for performance
							estimatedItemSize={60}
							extraData={[allTickets, primaryColor, theme, windowWidth]}
						/>
					</View>
				</View>
			)}
		</View>
	);
};

export default Index;
