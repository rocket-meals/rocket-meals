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
import { useRouter } from 'expo-router';
import useAskUserToRateApp from '@/hooks/useAskUserToRateApp';

const canteenVisitsHelper = new CanteenVisitsHelper();

/* ─────────────────── CanteenVisitDetailsModalContent ─────────────────── */

export interface CanteenVisitDetailsModalContentProps {
	canteenId: string;
	date: string;
	counts: { total: number; friends: number };
	primaryColor: string;
	foods_area_color: string;
	isRegistered: boolean;
	friendProfileIds: string[];
	friendsDict: Record<string, DatabaseTypes.Profiles>;
	profileId: string | undefined;
	translate: (key: TranslationKeys) => string;
	theme: any;
	closeModal: () => void;
	showFriendsModal: () => void;
	showLoginModal: () => void;
	onOwnVisitChanged?: (date: string, visit: DatabaseTypes.CanteenVisits | null) => void;
	askUserToRateApp?: (featureId: string) => void;
}

export const CanteenVisitDetailsModalContent: React.FC<CanteenVisitDetailsModalContentProps> = ({
	canteenId,
	date,
	counts: initialCounts,
	primaryColor,
	foods_area_color,
	isRegistered,
	friendProfileIds,
	friendsDict,
	profileId,
	translate,
	theme,
	closeModal,
	showFriendsModal,
	showLoginModal,
	onOwnVisitChanged,
	askUserToRateApp: askUserToRateAppProp,
}) => {
	const [ownVisit, setOwnVisit] = useState<DatabaseTypes.CanteenVisits | null | undefined>(undefined);
	const [toggling, setToggling] = useState(false);
	const [counts, setCounts] = useState(initialCounts);

	const [debugOwnVisits, setDebugOwnVisits] = useState<DatabaseTypes.CanteenVisits[] | undefined>(undefined);
	const [debugFriendVisits, setDebugFriendVisits] = useState<DatabaseTypes.CanteenVisits[] | undefined>(undefined);
	const [debugAllVisits, setDebugAllVisits] = useState<DatabaseTypes.CanteenVisits[] | undefined>(undefined);

	const fetchCounts = useCallback(async () => {
		try {
			const [total, friends] = await Promise.all([
				canteenVisitsHelper.fetchVisitCountForDate(canteenId, date),
				friendProfileIds.length > 0
					? canteenVisitsHelper.fetchFriendVisitCountForDate(canteenId, date, friendProfileIds)
					: Promise.resolve(0),
			]);
			setCounts({ total, friends });
		} catch (error) {
			console.error('Error fetching canteen visit counts:', error);
		}
	}, [canteenId, date, friendProfileIds]);

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
		if (!isRegistered || !profileId) return;
		canteenVisitsHelper.fetchOwnVisitForDate(canteenId, date, profileId).then(visit => {
			setOwnVisit(visit);
		});
	}, [canteenId, date, isRegistered, profileId]);

	useEffect(() => {
		fetchDebugData();
	}, [fetchDebugData]);

	const handleToggle = useCallback(async () => {
		if (!isRegistered || !profileId) {
			closeModal();
			showLoginModal();
			return;
		}
		if (toggling) return;
		const wasCreating = !ownVisit;
		setToggling(true);
		try {
			if (ownVisit) {
				await canteenVisitsHelper.deleteOwnVisitsForDate(canteenId, date, profileId);
			} else {
				await canteenVisitsHelper.createVisitForDate(canteenId, date, profileId);
			}
			const updatedVisit = await canteenVisitsHelper.fetchOwnVisitForDate(canteenId, date, profileId);
			setOwnVisit(updatedVisit);
			onOwnVisitChanged?.(date, updatedVisit);
			fetchCounts();
			fetchDebugData();
			// Ask for a rating when the user just joined and friends are already visiting
			if (wasCreating && counts.friends > 0) {
				askUserToRateAppProp?.('canteen_visits');
			}
		} catch (e) {
			console.error('Error toggling own canteen visit:', e);
		} finally {
			setToggling(false);
		}
	}, [isRegistered, profileId, toggling, ownVisit, canteenId, date, closeModal, showLoginModal, onOwnVisitChanged, fetchCounts, fetchDebugData, counts.friends, askUserToRateAppProp]);

	return (
		<View>
			{isRegistered && (
				<>
					<SettingsListGroupTitle title={translate(TranslationKeys.canteen_visits_my_visit_group)} />
					<SettingsListBoolean
						leftIcon={<MaterialCommunityIcons name="silverware-fork-knife" size={24} color={theme.screen.icon} />}
						iconBgColor={ownVisit ? foods_area_color : primaryColor}
						label={translate(TranslationKeys.canteen_visits_i_will_be_there)}
						isEnabled={!!ownVisit}
						onToggle={handleToggle}
						disabled={toggling || ownVisit === undefined}
						groupPosition="single"
					/>
				</>
			)}
			<SettingsListGroupTitle title={translate(TranslationKeys.canteen_visits_friends_group)} />
			{isRegistered ? (
				<>
					<SettingsList
						leftIcon={<MaterialCommunityIcons name="account-multiple-plus" size={24} color={theme.screen.icon} />}
						iconBgColor={primaryColor}
						label={translate(TranslationKeys.canteen_visits_manage_friends)}
						value={NumberHelper.formatCompact(counts.friends)}
						rightIcon={<Entypo name="chevron-small-right" color={theme.screen.icon} size={24} />}
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
						onAccountRequired={() => {
							closeModal();
							showLoginModal();
						}}
						groupPosition="top"
					/>
					<SettingsList
						leftIcon={<MaterialCommunityIcons name="login" size={24} color={theme.screen.icon} />}
						iconBgColor={primaryColor}
						label={translate(TranslationKeys.canteen_visits_login_hint)}
						rightIcon={<Entypo name="chevron-small-right" color={theme.screen.icon} size={24} />}
						handleFunction={() => {
							closeModal();
							showLoginModal();
						}}
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
	const router = useRouter();
	const { primaryColor, appSettings, selectedTheme: mode } = useAppSelector((state) => state.settings);
	const canteenVisitsVisibility = useAppSelector((state) => (state.settings as any).canteenVisits?.visibility ?? 'all') as 'all' | 'friends_only' | 'public_only' | 'off';
	const { profile, user, isDevMode } = useAppSelector((state) => state.authReducer);
	const { friendships } = useAppSelector((state) => state.friendships);
	const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
	const { askUserToRateApp } = useAskUserToRateApp();

	const isRegistered = UserHelper.isRegisteredUser(user);
	const foods_area_color = appSettings?.foods_area_color || primaryColor;
	const canteenContrastColor = useMyContrastColor(foods_area_color, theme, mode === 'dark');

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

	const [counts, setCounts] = useState({ total: 0, friends: 0 });
	const [ownVisit, setOwnVisit] = useState<DatabaseTypes.CanteenVisits | null | undefined>(undefined);
	const [toggling, setToggling] = useState(false);

	// Check if the component should be rendered
	const showCanteenVisits = appSettings?.friends_enabled || isDevMode;

	const fetchData = useCallback(async () => {
		if (!canteenId || !showCanteenVisits || canteenVisitsVisibility === 'off') return;
		
		// Determine what data to fetch based on visibility
		const shouldFetchTotal = canteenVisitsVisibility === 'all' || canteenVisitsVisibility === 'public_only';
		const shouldFetchFriends = (canteenVisitsVisibility === 'all' || canteenVisitsVisibility === 'friends_only') && friendProfileIds.length > 0;
		const shouldFetchOwn = canteenVisitsVisibility !== 'off' && isRegistered && profile?.id;
		
		const totalP = shouldFetchTotal 
			? canteenVisitsHelper.fetchVisitCountForDate(canteenId, date)
			: Promise.resolve(0);
		const friendsP = shouldFetchFriends
			? canteenVisitsHelper.fetchFriendVisitCountForDate(canteenId, date, friendProfileIds)
			: Promise.resolve(0);
		const ownP = shouldFetchOwn
			? canteenVisitsHelper.fetchOwnVisitForDate(canteenId, date, profile.id)
			: Promise.resolve(null);
		
		const [total, friends, own] = await Promise.all([totalP, friendsP, ownP]);
		setCounts({ total, friends });
		setOwnVisit(own);
	}, [canteenId, date, friendProfileIds, isRegistered, profile?.id, canteenVisitsVisibility, showCanteenVisits]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const handleToggle = useCallback(async () => {
		if (!isRegistered) {
			router.navigate('/(auth)/login');
			return;
		}
		if (!profile?.id || toggling) return;
		setToggling(true);
		const wasCreating = !ownVisit;
		try {
			if (ownVisit) {
				await canteenVisitsHelper.deleteOwnVisitsForDate(canteenId, date, profile.id);
			} else {
				await canteenVisitsHelper.createVisitForDate(canteenId, date, profile.id);
			}
			await fetchData();
		} catch (e) {
			console.error('Error toggling canteen visit:', e);
		} finally {
			setToggling(false);
		}
		// Ask for a rating when the user just joined and friends are already visiting
		if (wasCreating && counts.friends > 0) {
			askUserToRateApp('canteen_visits');
		}
	}, [isRegistered, profile?.id, toggling, ownVisit, canteenId, date, router, fetchData, counts.friends, askUserToRateApp]);

	const openDetailsModal = useCallback(() => {
		showScrollViewModal({
			title: translate(TranslationKeys.canteen_visits_details),
			children: (
				<CanteenVisitDetailsModalContent
					canteenId={canteenId}
					date={date}
					counts={counts}
					primaryColor={primaryColor}
					foods_area_color={foods_area_color}
					isRegistered={isRegistered}
					friendProfileIds={friendProfileIds}
					friendsDict={friendsDict}
					profileId={profile?.id}
					translate={translate}
					theme={theme}
					closeModal={closeScrollViewModal}
					showFriendsModal={() => {
						showScrollViewModal({
							title: translate(TranslationKeys.friendships),
							children: <FriendsContent showHeading={false} />,
							disableHorizontalPadding: true,
						});
					}}
					showLoginModal={() => router.navigate('/(auth)/login')}
					onOwnVisitChanged={(_, visit) => {
						setOwnVisit(visit);
						fetchData();
					}}
					askUserToRateApp={askUserToRateApp}
				/>
			),
		});
	}, [counts, canteenId, date, primaryColor, foods_area_color, isRegistered, friendProfileIds, friendsDict, profile?.id, translate, theme, showScrollViewModal, closeScrollViewModal, router, fetchData, askUserToRateApp]);

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
