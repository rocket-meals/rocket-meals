import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DatabaseTypes, NumberHelper } from 'repo-depkit-common';
import { MaterialCommunityIcons, Entypo } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useAppSelector } from '@/redux/hooks';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { UserHelper } from '@/helper/UserHelper';
import { useMyContrastColor } from '@/helper/ColorHelper';
import SettingsList from '@/components/SettingsList';
import SettingsListBoolean from '@/components/SettingsListBoolean';
import { SettingsListGroupTitle } from 'repo-depkit-common-ui';
import { TranslationKeys } from '@/locales/keys';
import { CanteenVisitsHelper, getFriendProfileIds } from '@/redux/actions/CanteenVisits/CanteenVisits';
import { FriendsContent } from '@/components/FriendsContent';
import DebugView from '@/components/DebugView';
import useCheckAppRateAsking from '@/hooks/useCheckAppRateAsking';
import useCanteenVisitData from '@/hooks/useCanteenVisitData';
import useAccountRequiredModal from '@/hooks/useAccountRequiredModal';
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';

const canteenVisitsHelper = new CanteenVisitsHelper();

/* ─────────────────── CanteenVisitDetailsModalContent ─────────────────── */

export interface CanteenVisitDetailsModalContentProps {
	canteenId: string;
	date: string;
	initialCounts: { total: number; friends: number };
	primaryColor: string;
	foods_area_color: string;
	isRegistered: boolean;
	friendProfileIds: string[];
	friendsDict: Record<string, DatabaseTypes.Profiles>;
	profileId: string | undefined;
	translate: (key: TranslationKeys) => string;
	theme: any;
	showFriendsModal: () => void;
	showLoginModal: () => void;
	onRefresh?: () => void;
}

export const CanteenVisitDetailsModalContent: React.FC<CanteenVisitDetailsModalContentProps> = ({
	canteenId,
	date,
	initialCounts,
	primaryColor,
	foods_area_color,
	isRegistered,
	friendProfileIds,
	friendsDict,
	profileId,
	translate,
	theme,
	showFriendsModal,
	showLoginModal,
	onRefresh,
}) => {
	const isLtrLanguage = useIsLtrLanguage();
	const isArabic = !isLtrLanguage;
	const [toggling, setToggling] = useState(false);
	const { checkAndShowAppRating } = useCheckAppRateAsking();

	const { counts, ownVisit, setOwnVisit, fetchData } = useCanteenVisitData({
		canteenId,
		date,
		profileId,
		friendProfileIds,
		isRegistered,
		initialCounts,
	});

	const [debugOwnVisits, setDebugOwnVisits] = useState<DatabaseTypes.CanteenVisits[] | undefined>(undefined);
	const [debugFriendVisits, setDebugFriendVisits] = useState<DatabaseTypes.CanteenVisits[] | undefined>(undefined);
	const [debugAllVisits, setDebugAllVisits] = useState<DatabaseTypes.CanteenVisits[] | undefined>(undefined);

	const fetchDebugData = useCallback(async () => {
		try {
			const [ownRaw, friendRaw, allRaw] = await Promise.all([
				profileId ? canteenVisitsHelper.fetchOwnVisitsForDate(canteenId, date, profileId) : Promise.resolve([]),
				friendProfileIds.length > 0 ? canteenVisitsHelper.fetchFriendVisitsForDate(canteenId, date, friendProfileIds) : Promise.resolve([]),
				canteenVisitsHelper.fetchAllVisitsForDate(canteenId, date),
			]);
			setDebugOwnVisits(ownRaw);
			setDebugFriendVisits(friendRaw);
			setDebugAllVisits(allRaw);
		} catch (error) {
			console.error('Error fetching debug canteen visit data:', error);
			setDebugOwnVisits([]);
			setDebugFriendVisits([]);
			setDebugAllVisits([]);
		}
	}, [canteenId, date, profileId, friendProfileIds]);

	useEffect(() => {
		fetchDebugData();
	}, [fetchDebugData]);

	const handleToggle = useCallback(async () => {
		if (!isRegistered || !profileId) {
			showLoginModal();
			return;
		}
		if (toggling) return;
		setToggling(true);
		try {
			if (ownVisit) {
				await canteenVisitsHelper.deleteOwnVisitsForDate(canteenId, date, profileId);
			} else {
				await canteenVisitsHelper.createVisitForDate(canteenId, date, profileId);
				checkAndShowAppRating();
			}
			await fetchData();
			onRefresh?.();
			fetchDebugData();
		} catch (e) {
			console.error('Error toggling own canteen visit:', e);
		} finally {
			setToggling(false);
		}
	}, [isRegistered, profileId, toggling, ownVisit, canteenId, date, showLoginModal, fetchData, onRefresh, fetchDebugData, checkAndShowAppRating]);

	return (
		<View>
			<SettingsListGroupTitle title={translate(TranslationKeys.canteen_visits_my_visit_group)} />
			<SettingsListBoolean
				leftIcon={<MaterialCommunityIcons name="silverware-fork-knife" size={24} color={theme.screen.icon} />}
				iconBgColor={ownVisit ? foods_area_color : primaryColor}
				label={translate(TranslationKeys.canteen_visits_i_will_be_there)}
				isEnabled={!!ownVisit}
				onToggle={handleToggle}
				disabled={toggling || ownVisit === undefined}
				groupPosition="single"
				isAccountRequired={!isRegistered}
				onAccountRequired={showLoginModal}
			/>
			<SettingsListGroupTitle title={translate(TranslationKeys.canteen_visits_friends_group)} />
			{isRegistered ? (
				<>
					<SettingsList
						leftIcon={<MaterialCommunityIcons name="account-multiple-plus" size={24} color={theme.screen.icon} />}
						iconBgColor={primaryColor}
						label={translate(TranslationKeys.canteen_visits_manage_friends)}
						value={NumberHelper.formatCompact(counts.friends)}
						rightIcon={<Entypo name={isArabic ? 'chevron-small-left' : 'chevron-small-right'} color={theme.screen.icon} size={24} />}
						handleFunction={() => {
							showFriendsModal();
						}}
						groupPosition={(debugFriendVisits ?? []).length > 0 ? 'top' : 'single'}
					/>
					{(debugFriendVisits ?? []).map((visit, index) => {
						const profileField = visit.profile;
						const friendProfileId = typeof profileField === 'string' ? profileField : (profileField as DatabaseTypes.Profiles)?.id ?? '';
						const friendProfile = friendsDict[friendProfileId];
						const alias = friendProfile?.nickname || friendProfileId;
						const isLast = index === (debugFriendVisits ?? []).length - 1;
						return (
							<SettingsList
								key={friendProfileId}
								leftIcon={<MaterialCommunityIcons name="account" size={24} color={theme.screen.icon} />}
								iconBgColor={primaryColor}
								label={alias}
								groupPosition={isLast ? 'bottom' : 'middle'}
							/>
						);
					})}
				</>
			) : (
				<>
					<SettingsList
						leftIcon={<MaterialCommunityIcons name="account-heart" size={24} color={theme.screen.icon} />}
						iconBgColor={primaryColor}
						label={translate(TranslationKeys.canteen_visits_friends)}
						value="-"
						isAccountRequired={true}
						onAccountRequired={showLoginModal}
						groupPosition="top"
					/>
					<SettingsList
						leftIcon={<MaterialCommunityIcons name="login" size={24} color={theme.screen.icon} />}
						iconBgColor={primaryColor}
						label={translate(TranslationKeys.canteen_visits_login_hint)}
						rightIcon={<Entypo name={isArabic ? 'chevron-small-left' : 'chevron-small-right'} color={theme.screen.icon} size={24} />}
						handleFunction={showLoginModal}
						groupPosition="bottom"
					/>
				</>
			)}
			<SettingsListGroupTitle title={translate(TranslationKeys.canteen_visits_total_group)} />
			<SettingsList
				leftIcon={<MaterialCommunityIcons name="account-group" size={24} color={theme.screen.icon} />}
				iconBgColor={primaryColor}
				label={translate(TranslationKeys.canteen_visits_total_people)}
				value={NumberHelper.formatCompact(counts.total)}
				groupPosition="top"
			/>
			<SettingsList
				leftIcon={<MaterialCommunityIcons name="account-group" size={24} color={theme.screen.icon} />}
				iconBgColor={primaryColor}
				label={translate(TranslationKeys.canteen_visits_total_description)}
				italic={true}
				groupPosition="bottom"
			/>
			<DebugView
				title="Canteen Visits Debug"
				logs={[
					`Own visits: ${debugOwnVisits ? JSON.stringify(debugOwnVisits, null, 2) : 'loading...'}`,
					`Friend visits: ${debugFriendVisits ? JSON.stringify(debugFriendVisits, null, 2) : 'loading...'}`,
					`All visits: ${debugAllVisits ? JSON.stringify(debugAllVisits, null, 2) : 'loading...'}`,
				]}
			/>
		</View>
	);
};

/* ─────────────────────── CanteenVisitsDateRow ──────────────────────────── */

export interface CanteenVisitsDateRowProps {
	canteenId: string;
	date: string;
}

export const CanteenVisitsDateRow: React.FC<CanteenVisitsDateRowProps> = ({ canteenId, date }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor, appSettings, selectedTheme: mode } = useAppSelector((state) => state.settings);
	const canteenVisitsVisibility = useAppSelector((state) => (state.settings as any).canteenVisits?.visibility ?? 'all') as 'all' | 'friends_only' | 'public_only' | 'off';
	const { profile, user, isDevMode } = useAppSelector((state) => state.authReducer);
	const { friendships } = useAppSelector((state) => state.friendships);
	const isLtrLanguage = useIsLtrLanguage();
	const isArabic = !isLtrLanguage;
	const { show: showScrollViewModal } = useMyScrollViewModal();
	const { checkAndShowAppRating } = useCheckAppRateAsking();
	const { openAccountRequiredModal } = useAccountRequiredModal();

	const isRegistered = UserHelper.isRegisteredUser(user);
	const foods_area_color = appSettings?.foods_area_color || primaryColor;
	const canteenContrastColor = useMyContrastColor(foods_area_color, theme, mode === 'dark');

	// Check if the component should be rendered
	const showCanteenVisits = appSettings?.friends_enabled || isDevMode;

	const friendProfileIds = useMemo(() => {
		if (!isRegistered || !profile?.id) return [];
		return getFriendProfileIds(friendships, profile.id);
	}, [isRegistered, profile?.id, friendships]);

	const friendsDict = useMemo((): Record<string, DatabaseTypes.Profiles> => {
		const dict: Record<string, DatabaseTypes.Profiles> = {};
		if (!profile?.id || !friendships) return dict;
		for (const friendship of friendships) {
			if (friendship.friendship_status !== 'accepted') continue;
			const req = friendship.requester_profiles_id;
			const rec = friendship.receiver_profiles_id;
			const reqId = typeof req === 'string' ? req : (req as DatabaseTypes.Profiles)?.id;
			const recId = typeof rec === 'string' ? rec : (rec as DatabaseTypes.Profiles)?.id;
			if (reqId === profile.id && recId && typeof rec !== 'string') {
				dict[recId] = rec as DatabaseTypes.Profiles;
			} else if (recId === profile.id && reqId && typeof req !== 'string') {
				dict[reqId] = req as DatabaseTypes.Profiles;
			}
		}
		return dict;
	}, [friendships, profile?.id]);

	const [toggling, setToggling] = useState(false);

	const { counts, ownVisit, fetchData } = useCanteenVisitData({
		canteenId,
		date,
		profileId: profile?.id,
		friendProfileIds,
		isRegistered,
		visibility: canteenVisitsVisibility,
		enabled: showCanteenVisits && canteenVisitsVisibility !== 'off',
	});

	const handleToggle = useCallback(async () => {
		if (!isRegistered) {
			openAccountRequiredModal();
			return;
		}
		if (!profile?.id || toggling) return;
		setToggling(true);
		try {
			if (ownVisit) {
				await canteenVisitsHelper.deleteOwnVisitsForDate(canteenId, date, profile.id);
			} else {
				await canteenVisitsHelper.createVisitForDate(canteenId, date, profile.id);
				checkAndShowAppRating();
			}
			await fetchData();
		} catch (e) {
			console.error('Error toggling canteen visit:', e);
		} finally {
			setToggling(false);
		}
	}, [isRegistered, profile?.id, toggling, ownVisit, canteenId, date, openAccountRequiredModal, fetchData, checkAndShowAppRating]);

	const openDetailsModal = useCallback(() => {
		showScrollViewModal({
			title: translate(TranslationKeys.canteen_visits_details),
			children: (
				<CanteenVisitDetailsModalContent
					canteenId={canteenId}
					date={date}
					initialCounts={counts}
					primaryColor={primaryColor}
					foods_area_color={foods_area_color}
					isRegistered={isRegistered}
					friendProfileIds={friendProfileIds}
					friendsDict={friendsDict}
					profileId={profile?.id}
					translate={translate}
					theme={theme}
					showFriendsModal={() => {
						showScrollViewModal({
							title: translate(TranslationKeys.friendships),
							children: <FriendsContent showHeading={false} />,
							disableHorizontalPadding: true,
						});
					}}
					showLoginModal={openAccountRequiredModal}
					onRefresh={fetchData}
				/>
			),
		});
	}, [counts, canteenId, date, primaryColor, foods_area_color, isRegistered, friendProfileIds, friendsDict, profile?.id, translate, theme, showScrollViewModal, openAccountRequiredModal, fetchData]);

	// Early return if not enabled or visibility is 'off' — placed after all hooks
	if (!showCanteenVisits || canteenVisitsVisibility === 'off') {
		return null;
	}

	const isOwnVisitActive = !!ownVisit;
	const hasFriendsVisiting = isRegistered && friendProfileIds.length > 0 && counts.friends > 0;
	const joinButtonBg = isOwnVisitActive ? foods_area_color : theme.screen.iconBg;
	const joinTextColor = isOwnVisitActive ? canteenContrastColor : theme.screen.text;
	const countsBg = hasFriendsVisiting ? foods_area_color : theme.screen.iconBg;
	const countsTextColor = hasFriendsVisiting ? canteenContrastColor : theme.screen.text;

	// Determine which counts to show based on visibility setting
	const showFriendsCount = isRegistered && (canteenVisitsVisibility === 'all' || canteenVisitsVisibility === 'friends_only');
	const showTotalCount = canteenVisitsVisibility === 'all' || canteenVisitsVisibility === 'public_only';

	return (
		<View style={rowStyles.visitButtonWrapper}>
			{isRegistered && (
				<>
					<TouchableOpacity
						style={[rowStyles.visitJoinButton, { backgroundColor: joinButtonBg }]}
						onPress={handleToggle}
						activeOpacity={0.7}
						disabled={toggling}
					>
						{toggling ? (
							<ActivityIndicator size="small" color={joinTextColor} />
						) : (
							<MaterialCommunityIcons name="silverware-fork-knife" size={18} color={joinTextColor} />
						)}
					</TouchableOpacity>
					<View style={[rowStyles.visitSeparator, { backgroundColor: theme.screen.text, opacity: 0.2 }]} />
				</>
			)}
			<TouchableOpacity
				style={[rowStyles.visitCountsButton, { backgroundColor: countsBg }]}
				onPress={openDetailsModal}
				activeOpacity={0.7}
			>
				{showFriendsCount && (
					<View style={rowStyles.visitCountRow}>
						<MaterialCommunityIcons name="account-heart" size={18} color={countsTextColor} />
						{toggling ? (
							<ActivityIndicator size="small" color={countsTextColor} />
						) : (
							<Text style={[rowStyles.visitCountText, { color: countsTextColor }]}>{NumberHelper.formatCompact(counts.friends)}</Text>
						)}
					</View>
				)}
				{showTotalCount && (
					<View style={rowStyles.visitCountRow}>
						<MaterialCommunityIcons name="account-group" size={18} color={countsTextColor} />
						{toggling ? (
							<ActivityIndicator size="small" color={countsTextColor} />
						) : (
							<Text style={[rowStyles.visitCountText, { color: countsTextColor }]}>{NumberHelper.formatCompact(counts.total)}</Text>
						)}
					</View>
				)}
			</TouchableOpacity>
		</View>
	);
};

const rowStyles = StyleSheet.create({
	visitButtonWrapper: {
		flexDirection: 'row',
		alignItems: 'stretch',
		borderRadius: 8,
		overflow: 'hidden',
	},
	visitJoinButton: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		justifyContent: 'center',
		alignItems: 'center',
	},
	visitSeparator: {
		width: 1,
		alignSelf: 'stretch',
	},
	visitCountsButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 6,
		gap: 10,
	},
	visitCountRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
	},
	visitCountText: {
		fontSize: 18,
	},
});
