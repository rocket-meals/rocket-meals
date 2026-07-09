import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, NativeScrollEvent, NativeSyntheticEvent, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, Octicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useAppSelector } from '@/redux/hooks';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import CanteenSelection from '@/components/CanteenSelection/CanteenSelection';
import SettingsListMarkingLabelsFast from '@/components/SettingsListMarkingLabelsFast';
import PriceGroupSettingsList from '@/components/PriceGroupSettingsList';
import { SET_SELECTED_CANTEEN, SET_BUILDINGS_DICT, SET_CANTEENS, SET_FOODOFFERS_SHOW_SEPARATED_MARKINGS_BREAKDOWN, UPDATE_PROFILE } from '@/redux/Types/types';
import { AppScreens, DatabaseTypes } from 'repo-depkit-common';
import { CanteenHelper } from '@/redux/actions';
import { BuildingsHelper } from '@/redux/actions/Buildings/Buildings';
import { excerpt, getImageUrl } from '@/constants/HelperFunctions';
import { myContrastColor } from '@/helper/ColorHelper';
import { CollectionHelper } from '@/helper/collectionHelper';
import LottieView from 'lottie-react-native';
import animation from '@/assets/animations/priceGroup.json';
import { replaceLottieColors } from '@/helper/animationHelper';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { AvatarConfig, AvatarStyle, MICAH_PRESETS, MyAvatar, presetToConfig, AvatarSize } from 'repo-depkit-common-ui';
import { parseProfileAvatar, AVATAR_BACKGROUND } from '@/hooks/useAvatarProfileEditor';
import { ProfileHelper } from '@/redux/actions/Profile/Profile';
import FoodLabelingInfo from '@/components/FoodLabelingInfo';
import SettingsList from '@/components/SettingsList';
import SettingsGroupTitle from '@/components/SettingsGroupTitle';
import MarkingBottomSheet from '@/components/MarkingBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import useSeperatedMarkingsForFood from '@/hooks/useSeperatedMarkingsForFood';
import useCustomerConfigSeperateMarkingsForFood from '@/hooks/useCustomerConfigSeperateMarkingsForFood';
import ProjectButton from '@/components/ProjectButton';
import SettingsListSelectOption from '@/components/SettingsListSelectOption/SettingsListSelectOption';
import { UserHelper } from '@/helper/UserHelper';

const STEPS = ['welcome', 'canteen', 'pricegroup', 'preferences'] as const;
// Avatar size: 80% bigger than original 44px
const AVATAR_CAROUSEL_SIZE = 80;
const AVATARS_PER_ROW = 4;
const AVATARS_TOTAL = AVATARS_PER_ROW * 2;
// Avatar fade: 300ms (50% slower than before); pause between swaps shortened to 800ms
const AVATAR_FADE_DURATION = 300;
const AVATAR_SLOT_INTERVAL = 800;
// Padding inside the welcome step's ScrollView contentContainerStyle – used to break the
// carousel out to the full screen edge via negative margin.
const STEP_CONTENT_PADDING = 20;
// User count animation constants
const COUNT_PLACEHOLDER_TARGET = 999;
const COUNT_INITIAL_TICK_MS = 30;        // tick rate for 0→999 phase
const COUNT_INITIAL_STEP = 10;           // 10/tick * 100 ticks * 30ms ≈ 3s
const COUNT_FALLBACK_DELAY_MS = 3000;    // show "viele andere" after 3s without server response
const COUNT_FAST_TICK_MS = 30;           // tick rate for fast phase (approaching server count)
const COUNT_SLOW_TICK_MS = 100;          // tick rate for slow phase (last 5 units)
const COUNT_SLOW_THRESHOLD = 5;          // last N units use slow phase
const COUNT_REFRESH_INTERVAL_MS = 5000; // re-fetch count every 5 seconds
const COUNT_BADGE_WIDTH = '70%' as const;
const profileHelper = new ProfileHelper();

// Precomputed quickstart configs – AvatarSize.SMALL is stored in the config, but the
// carousel renders with an explicit size={AVATAR_CAROUSEL_SIZE} prop so there is no layout jump.
const QUICKSTART_AVATAR_CONFIGS: AvatarConfig[] = MICAH_PRESETS.map(
	(p) => presetToConfig(p, AvatarStyle.MICAH, AvatarSize.SMALL),
);

const OnboardingScreen = () => {
	useSetPageTitle(TranslationKeys.onboarding);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const { primaryColor, selectedTheme: mode } = useAppSelector((state) => state.settings);
	const { canteens } = useAppSelector((state) => state.canteenReducer);
	const { markings } = useAppSelector((state) => state.food);
	const { isManagement, profile, user } = useAppSelector((state) => state.authReducer);
	const selectedCanteen = useSelectedCanteen();
	const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');
	const seperatedMarkingsValue = useSeperatedMarkingsForFood();
	const customerConfigDefaultBreakdown = useCustomerConfigSeperateMarkingsForFood();
	const { show: showModal, close: closeModal } = useMyScrollViewModal();

	const [currentStepIndex, setCurrentStepIndex] = useState(0);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	// User count display state
	const [displayCount, setDisplayCount] = useState(0);
	const [showVieleAndere, setShowVieleAndere] = useState(false);
	const [isLoadingCanteens, setIsLoadingCanteens] = useState(true);
	// Track which steps have been mounted for lazy loading
	const [mountedSteps, setMountedSteps] = useState<Set<number>>(new Set([0]));
	const scrollViewRef = useRef<ScrollView>(null);
	const priceAnimRef = useRef<LottieView>(null);
	const [priceAnimationJson, setPriceAnimationJson] = useState<any>(null);
	// Eating habits (preferences step) state
	const [readMore, setReadMore] = useState(false);
	const menuSheetRef = useRef<BottomSheet>(null);

	// Count animation refs
	const displayCountRef = useRef(0); // kept in sync with displayCount for animation callbacks
	const serverRespondedRef = useRef(false);
	const countAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Transition overlay state ("Du bist nun startklar")
	const [showReadyOverlay, setShowReadyOverlay] = useState(false);
	const readyOpacity = useRef(new Animated.Value(0)).current;

	// ── Avatar carousel ──────────────────────────────────────────────────────
	// Each slot has its own avatar and opacity – slots swap one at a time.
	// Carousel only starts once server avatars have been loaded.
	const [slotAvatars, setSlotAvatars] = useState<AvatarConfig[]>(
		() => QUICKSTART_AVATAR_CONFIGS.slice(0, AVATARS_TOTAL)
	);
	const slotOpacities = useRef(
		Array.from({ length: AVATARS_TOTAL }, () => new Animated.Value(1))
	).current;
	// Pool ref – updated when server data arrives; safe to read in animation callbacks
	const avatarPoolRef = useRef<AvatarConfig[]>([]);
	const nextPoolIndexRef = useRef(0);
	const nextSlotRef = useRef(0);
	// Trigger to start carousel once server avatars are available
	const [hasServerAvatars, setHasServerAvatars] = useState(false);

	const isFirstStep = currentStepIndex === 0;
	const isLastStep = currentStepIndex === STEPS.length - 1;

	// (app)/index.tsx already redirects straight to food offers when canteen + price_group are
	// both set, so this screen only ever mounts for a genuinely incomplete profile. The one
	// exception is manually navigating here (e.g. the "Experimentell" debug menu) with an
	// already-complete profile - hasCompleteProfile still drives the welcome text for that case.
	const hasCompleteProfile = useMemo(
		() => !!profile?.canteen && !!profile?.price_group,
		[profile?.canteen, profile?.price_group]
	);
	const isReturningUser = hasCompleteProfile;

	const canteenHelper = useMemo(() => new CanteenHelper(), []);
	const buildingsHelper = useMemo(() => new BuildingsHelper(), []);

	useEffect(() => {
		const subscription = Dimensions.addEventListener('change', ({ window }) => {
			setScreenWidth(window.width);
		});
		return () => subscription?.remove();
	}, []);

	useEffect(() => {
		const json = replaceLottieColors(animation, primaryColor);
		setPriceAnimationJson(json);
	}, [primaryColor]);

	useEffect(() => {
		const loadCanteens = async () => {
			setIsLoadingCanteens(true);
			try {
				const buildingsData = (await buildingsHelper.fetchBuildings({})) as DatabaseTypes.Buildings[];
				const buildings = buildingsData || [];
				const buildingsDict = buildings.reduce((acc: Record<string, DatabaseTypes.Buildings>, building: DatabaseTypes.Buildings) => {
					acc[building.id] = building;
					return acc;
				}, {} as Record<string, DatabaseTypes.Buildings>);
				dispatch({ type: SET_BUILDINGS_DICT, payload: buildingsDict });

				const canteensData = (await canteenHelper.fetchCanteens({})) as DatabaseTypes.Canteens[];
				const filteredCanteens = (canteensData || []).filter(canteen => {
					const status = canteen.status || '';
					if (!isManagement) return status === 'published';
					return status === 'published' || status === 'archived';
				});

				const sortedCanteens = filteredCanteens.sort((a, b) => (a.sort || 0) - (b.sort || 0));
				const updatedCanteens = sortedCanteens.map(canteen => {
					const building = buildingsDict[canteen?.building as string];
					return {
						...canteen,
						imageAssetId: building?.image,
						thumbHash: building?.image_thumb_hash,
						image_url: building?.image_remote_url || getImageUrl(building?.image),
					};
				});
				dispatch({ type: SET_CANTEENS, payload: updatedCanteens });
			} catch (error) {
				console.error('Error loading canteens for onboarding:', error);
			} finally {
				setIsLoadingCanteens(false);
			}
		};

		loadCanteens();
	}, [isManagement, canteenHelper, buildingsHelper, dispatch]);

	// Auto-select canteen from profile once canteens are loaded. Deliberately no fallback to
	// the first canteen: selectedCanteen doubles as "the user has completed canteen setup" in
	// (app)/index.tsx's skip check, so it must only ever reflect an actual choice.
	useEffect(() => {
		if (isLoadingCanteens || selectedCanteen || canteens.length === 0) return;
		let profileCanteenId: string | null = null;
		if (profile?.canteen) {
			if (typeof profile.canteen === 'string') {
				profileCanteenId = profile.canteen;
			} else {
				profileCanteenId = (profile.canteen as DatabaseTypes.Canteens)?.id ?? null;
			}
		}
		if (!profileCanteenId) return;
		const canteen = canteens.find((c) => String(c.id) === String(profileCanteenId));
		if (canteen) {
			dispatch({ type: SET_SELECTED_CANTEEN, payload: canteen });
		}
	}, [profile?.canteen, canteens, selectedCanteen, isLoadingCanteens, dispatch]);

	// Load profiles with avatar field for the carousel.
	// When server avatars arrive, reset pool indices and trigger carousel start.
	useEffect(() => {
		const loadProfileAvatars = async () => {
			try {
				const profiles = await profileHelper.readItems({
					filter: { avatar: { _nnull: true } },
					sort: ['-date_updated'],
					limit: 100,
					fields: ['avatar'],
				});
				const configs: AvatarConfig[] = [];
				for (const p of profiles) {
					const cfg = parseProfileAvatar((p as any).avatar);
					if (cfg) configs.push(cfg);
				}
				if (configs.length > 0) {
					avatarPoolRef.current = configs;
					nextPoolIndexRef.current = 0;
					nextSlotRef.current = 0;
					setHasServerAvatars(true);
				}
			} catch (error) {
				console.error('[Onboarding] Failed to load profile avatars:', error);
			}
		};
		loadProfileAvatars();
	}, []);

	// Avatar carousel: one slot swaps at a time, every AVATAR_SLOT_INTERVAL ms.
	// Only starts once server avatars are available. Stops when all server avatars
	// have been shown (wraps around only if the pool is larger than AVATARS_TOTAL).
	useEffect(() => {
		if (!hasServerAvatars) return;
		let timer: ReturnType<typeof setTimeout>;
		const swapNext = () => {
			const pool = avatarPoolRef.current;
			if (pool.length === 0) return;
			// Stop fading once all server avatars have been shown
			if (nextPoolIndexRef.current >= pool.length) return;

			const slot = nextSlotRef.current % AVATARS_TOTAL;
			const poolIdx = nextPoolIndexRef.current;

			Animated.timing(slotOpacities[slot], {
				toValue: 0,
				duration: AVATAR_FADE_DURATION,
				useNativeDriver: true,
			}).start(() => {
				setSlotAvatars(prev => {
					const next = [...prev];
					next[slot] = pool[poolIdx];
					return next;
				});
				nextPoolIndexRef.current += 1;
				nextSlotRef.current += 1;
				Animated.timing(slotOpacities[slot], {
					toValue: 1,
					duration: AVATAR_FADE_DURATION,
					useNativeDriver: true,
				}).start(() => {
					// Only schedule next swap if there are more server avatars to show
					if (nextPoolIndexRef.current < avatarPoolRef.current.length) {
						timer = setTimeout(swapNext, AVATAR_SLOT_INTERVAL);
					}
				});
			});
		};
		timer = setTimeout(swapNext, AVATAR_SLOT_INTERVAL);
		return () => clearTimeout(timer);
	}, [hasServerAvatars, slotOpacities]);

	// ── User count animation ──────────────────────────────────────────────────
	// Smoothly animates to a new target value: fast approach, slow last 5 units.
	const animateToTarget = useCallback((target: number) => {
		if (countAnimTimerRef.current) clearTimeout(countAnimTimerRef.current);
		setShowVieleAndere(false);
		const tick = () => {
			const current = displayCountRef.current;
			const distance = target - current;
			if (distance <= 0) return;
			let step: number;
			let delay: number;
			if (distance > COUNT_SLOW_THRESHOLD) {
				// Fast phase: close the gap in ~5 ticks
				step = Math.max(1, Math.ceil(distance / 5));
				delay = COUNT_FAST_TICK_MS;
			} else {
				// Slow phase: one unit every COUNT_SLOW_TICK_MS for last 5
				step = 1;
				delay = COUNT_SLOW_TICK_MS;
			}
			const next = Math.min(current + step, target);
			displayCountRef.current = next;
			setDisplayCount(next);
			if (next < target) {
				countAnimTimerRef.current = setTimeout(tick, delay);
			}
		};
		tick();
	}, []);

	// Initial count animation: 0 → 999 over ~3 seconds, then "viele andere" fallback.
	// Deps are all refs (never change identity) so the empty array is intentional.
	useEffect(() => {
		const tick = () => {
			if (serverRespondedRef.current) return; // server arrived, hand off to animateToTarget
			const next = Math.min(displayCountRef.current + COUNT_INITIAL_STEP, COUNT_PLACEHOLDER_TARGET);
			displayCountRef.current = next;
			setDisplayCount(next);
			if (next < COUNT_PLACEHOLDER_TARGET) {
				countAnimTimerRef.current = setTimeout(tick, COUNT_INITIAL_TICK_MS);
			}
		};
		// Start immediately so the first increment is visible without delay
		tick();

		// If no server response after COUNT_FALLBACK_DELAY_MS, show "viele andere"
		fallbackTimerRef.current = setTimeout(() => {
			if (!serverRespondedRef.current) {
				if (countAnimTimerRef.current) clearTimeout(countAnimTimerRef.current);
				setShowVieleAndere(true);
			}
		}, COUNT_FALLBACK_DELAY_MS);

		return () => {
			if (countAnimTimerRef.current) clearTimeout(countAnimTimerRef.current);
			if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // deps are all stable refs – intentional empty array

	// Fetch user count from server; on success animate to actual value; refresh every 5 seconds
	const fetchUserCount = useCallback(async () => {
		try {
			const usersHelper = new CollectionHelper<DatabaseTypes.DirectusUsers>('directus_users');
			const result: { count: string | number }[] = await usersHelper.aggregateItems({
				aggregate: { count: '*' },
			}) as { count: string | number }[];
			const rawCount = result?.[0]?.count;
			const count = typeof rawCount === 'number' ? rawCount : parseInt(rawCount as string, 10);
			if (Number.isFinite(count) && !Number.isNaN(count) && count > 0) {
				serverRespondedRef.current = true;
				if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
				animateToTarget(count);
			}
		} catch (error) {
			console.error('Error fetching user count:', error);
			// On error: keep current display value unchanged
		}
	}, [animateToTarget]);

	useEffect(() => {
		fetchUserCount();
		const interval = setInterval(fetchUserCount, COUNT_REFRESH_INTERVAL_MS);
		return () => clearInterval(interval);
	}, [fetchUserCount]);

	const goToStep = useCallback((index: number) => {
		setCurrentStepIndex(index);
		// Lazy-mount the target step (and the one after it for smooth preloading)
		setMountedSteps((prev) => {
			const updatedSteps = new Set(prev);
			updatedSteps.add(index);
			if (index + 1 < STEPS.length) updatedSteps.add(index + 1);
			return updatedSteps;
		});
		scrollViewRef.current?.scrollTo({ x: index * screenWidth, animated: true });
	}, [screenWidth]);

	const handleStart = useCallback(() => {
		setShowReadyOverlay(true);
		// Fade in, then navigate immediately while the overlay is fully opaque.
		// This prevents a flash of the underlying content during navigation.
		Animated.timing(readyOpacity, {
			toValue: 1,
			duration: 400,
			useNativeDriver: true,
		}).start(() => {
			router.replace(('/(app)/' + AppScreens.FOOD_OFFERS) as any);
		});
	}, [readyOpacity]);

	const handleNext = useCallback(() => {
		// The profile can become complete while the user is still on the welcome step: after a
		// fresh login the server profile (with canteen + price_group) arrives async, and by then
		// (app)/index.tsx's skip check has already routed here. In that case "weiter" takes the
		// user straight to food offers instead of through steps that are already configured.
		if (isFirstStep && hasCompleteProfile) {
			handleStart();
			return;
		}
		if (!isLastStep) {
			goToStep(currentStepIndex + 1);
		}
	}, [isFirstStep, hasCompleteProfile, handleStart, isLastStep, currentStepIndex, goToStep]);

	const handleBack = useCallback(() => {
		if (!isFirstStep) {
			goToStep(currentStepIndex - 1);
		}
	}, [isFirstStep, currentStepIndex, goToStep]);

	const handleSelectCanteen = useCallback(async (canteen: DatabaseTypes.Canteens) => {
		dispatch({ type: SET_SELECTED_CANTEEN, payload: canteen });
		// Persist to profile.canteen locally right away (redux-persist keeps this across app
		// restarts). Without this, (app)/index.tsx's "profile already complete" check never sees
		// the selection for anonymous users, or for registered users before their server profile
		// round-trip finishes below - causing onboarding to reappear on every app start.
		dispatch({ type: UPDATE_PROFILE, payload: { ...profile, canteen: canteen.id } });
		const canteenStepIndex = STEPS.indexOf('canteen');
		if (canteenStepIndex < STEPS.length - 1) {
			goToStep(canteenStepIndex + 1);
		}
		// Best-effort: also persist to the online profile for registered users who already
		// have a server profile record.
		if (UserHelper.isRegisteredUser(user) && profile?.id) {
			try {
				const updatedPayload = { ...profile, canteen: canteen.id };
				const result = (await profileHelper.updateProfile(updatedPayload)) as DatabaseTypes.Profiles;
				if (result) {
					dispatch({ type: UPDATE_PROFILE, payload: result });
				}
			} catch (error) {
				console.error('Error saving canteen to profile:', error);
			}
		}
	}, [dispatch, goToStep, user, profile, profileHelper]);

	const handleSelectPriceGroup = useCallback(() => {
		const priceGroupStepIndex = STEPS.indexOf('pricegroup');
		if (priceGroupStepIndex < STEPS.length - 1) {
			goToStep(priceGroupStepIndex + 1);
		}
	}, [goToStep]);

	const handleScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const offsetX = event.nativeEvent.contentOffset.x;
		const newIndex = Math.round(offsetX / screenWidth);
		if (newIndex >= 0 && newIndex < STEPS.length && newIndex !== currentStepIndex) {
			setCurrentStepIndex(newIndex);
		}
	}, [screenWidth, currentStepIndex]);

	const markingIds = useMemo(() => (markings ?? []).map((m: DatabaseTypes.Markings) => m.id), [markings]);

	// Format the animated display count locale-aware
	const formattedCount = useMemo(() => displayCount.toLocaleString(), [displayCount]);

	// ── Eating habits / preferences step helpers ─────────────────────────────
	const customerConfigValueLabel = useMemo(
		() => customerConfigDefaultBreakdown
			? translate(TranslationKeys.foodoffers_show_separated_markings_breakdown_option_enabled)
			: translate(TranslationKeys.foodoffers_show_separated_markings_breakdown_option_disabled),
		[customerConfigDefaultBreakdown, translate]
	);

	const markingsBreakdownOptions = useMemo(() => [
		{
			id: 'true' as const,
			label: translate(TranslationKeys.foodoffers_show_separated_markings_breakdown_option_enabled),
			icon: <MaterialCommunityIcons name="check" size={22} color={theme.screen.icon} />,
		},
		{
			id: 'false' as const,
			label: translate(TranslationKeys.foodoffers_show_separated_markings_breakdown_option_disabled),
			icon: <MaterialCommunityIcons name="close" size={22} color={theme.screen.icon} />,
		},
		{
			id: 'null' as const,
			label: `${translate(TranslationKeys.foodoffers_show_separated_markings_breakdown_option_default)} (${customerConfigValueLabel})`,
			icon: <MaterialCommunityIcons name="cog-outline" size={22} color={theme.screen.icon} />,
		},
	], [translate, theme.screen.icon, customerConfigValueLabel]);

	const currentMarkingsBreakdownId = seperatedMarkingsValue === true ? 'true' : seperatedMarkingsValue === false ? 'false' : 'null';

	const markingsBreakdownLabel = useMemo(
		() => markingsBreakdownOptions.find(o => o.id === currentMarkingsBreakdownId)?.label ?? '',
		[currentMarkingsBreakdownId, markingsBreakdownOptions]
	);

	const openMarkingsBreakdownModal = useCallback(() => {
		showModal(
			{
				title: translate(TranslationKeys.foodoffers_show_separated_markings_breakdown),
				children: (
					<SettingsListSelectOption
						options={markingsBreakdownOptions}
						selectedOption={currentMarkingsBreakdownId}
						onSelect={(option) => {
							const newValue = option.id === 'true' ? true : option.id === 'false' ? false : null;
							dispatch({ type: SET_FOODOFFERS_SHOW_SEPARATED_MARKINGS_BREAKDOWN, payload: newValue });
							closeModal();
						}}
						iconBgColor={primaryColor}
					/>
				),
			},
			{}
		);
	}, [showModal, closeModal, translate, markingsBreakdownOptions, currentMarkingsBreakdownId, dispatch, primaryColor]);

	const handleClearMarkings = useCallback(async () => {
		if (!profile) return;
		const updatedProfile = { ...profile, markings: [] };
		dispatch({ type: UPDATE_PROFILE, payload: updatedProfile });
	}, [dispatch, profile]);

	const handleClearMarkingsWithConfirmation = useCallback(() => {
		showModal(
			{
				children: (
					<View style={{ gap: 12 }}>
						<Text style={{ fontSize: 18, fontWeight: '600', color: theme.screen.text }}>
							{translate(TranslationKeys.clear_markings_selection)}
						</Text>
						<ProjectButton
							text={translate(TranslationKeys.confirm)}
							onPress={() => {
								closeModal();
								void handleClearMarkings();
							}}
							style={{ marginVertical: 0 }}
						/>
						<TouchableOpacity onPress={closeModal} style={{ alignSelf: 'center', paddingVertical: 6 }}>
							<Text style={{ color: theme.screen.text }}>{translate(TranslationKeys.cancel)}</Text>
						</TouchableOpacity>
					</View>
				),
			},
			{}
		);
	}, [showModal, closeModal, translate, theme.screen.text, handleClearMarkings]);

	const openMenuSheet = useCallback(() => {
		menuSheetRef?.current?.expand();
	}, []);

	const closeMenuSheet = useCallback(() => {
		menuSheetRef?.current?.close();
	}, []);

	const renderStepIndicator = () => (
		<>
			{STEPS.map((_, index) => (
				<TouchableOpacity
					key={index}
					onPress={() => goToStep(index)}
					style={[
						styles.stepDot,
						{
							backgroundColor: index === currentStepIndex ? primaryColor : theme.screen.iconBg,
							width: index === currentStepIndex ? 24 : 8,
						},
					]}
				/>
			))}
		</>
	);

	const renderAvatarCarousel = () => {
		const row1 = slotAvatars.slice(0, AVATARS_PER_ROW);
		const row2 = slotAvatars.slice(AVATARS_PER_ROW, AVATARS_TOTAL);
		// Avatar cell width: divide screen evenly across the row
		const cellWidth = screenWidth / AVATARS_PER_ROW;

		// renderSlot renders a single avatar cell with its per-slot opacity
		const renderSlot = (cfg: AvatarConfig, slotIndex: number, keyPrefix: string) => (
			<Animated.View
				key={`${keyPrefix}-${slotIndex}`}
				style={[styles.avatarCarouselCell, { width: cellWidth, opacity: slotOpacities[slotIndex] }]}
			>
				<MyAvatar
					style={cfg.style}
					size={AVATAR_CAROUSEL_SIZE}
					options={cfg.options}
					rounded={true}
					backgroundColor={AVATAR_BACKGROUND}
				/>
			</Animated.View>
		);

		return (
			// Negative marginHorizontal breaks the carousel out of the parent's STEP_CONTENT_PADDING
			// so it occupies the full screen width.
			<View style={[styles.avatarCarouselContainer, { width: screenWidth, marginHorizontal: -STEP_CONTENT_PADDING }]}>
				<View style={styles.avatarCarouselRow}>
					{row1.map((cfg, i) => renderSlot(cfg, i, 'r1'))}
				</View>
				<View style={styles.avatarCarouselRow}>
					{row2.map((cfg, i) => renderSlot(cfg, AVATARS_PER_ROW + i, 'r2'))}
				</View>
			</View>
		);
	};

	const renderWelcomeStep = () => (
		<View style={[styles.stepContent, { width: screenWidth }]}>
			{/*
			  The icon/title/description live in their own flex:1 ScrollView, so however tall that
			  text block is (it differs between new vs. returning users, and while the "loading
			  profile" text is shown), it only scrolls internally instead of pushing anything else
			  around. welcomeBottomSection is a plain sibling below it, sized to its own content and
			  always in the same place – the counter and avatars never jump.
			*/}
			<ScrollView style={styles.welcomeTopScroll} contentContainerStyle={styles.welcomeTopScrollContent}>
				<MaterialCommunityIcons
					name={isReturningUser ? 'hand-wave' : 'check-decagram'}
					size={80}
					color={primaryColor}
				/>
				<Text style={[styles.stepTitle, { color: theme.screen.text }]}>
					{isReturningUser
						? translate(TranslationKeys.onboarding_welcome_back)
						: translate(TranslationKeys.onboarding_welcome)}
				</Text>
				{isReturningUser ? (
					isLoadingCanteens && (
						<>
							<Text style={[styles.stepDescription, { color: theme.screen.text }]}>
								{translate(TranslationKeys.onboarding_loading_profile)}
							</Text>
							<ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 8 }} />
						</>
					)
				) : (
					<Text style={[styles.stepDescription, { color: theme.screen.text }]}>
						{translate(TranslationKeys.onboarding_welcome_description)}
					</Text>
				)}
			</ScrollView>
			<View style={styles.welcomeBottomSection}>
				<View style={styles.userCountContainer}>
					<Text style={[styles.stepDescription, { color: theme.screen.text }]}>
						{translate(TranslationKeys.onboarding_complete_user_count_prefix)}
					</Text>
					<View style={[styles.userCountBadge, { backgroundColor: primaryColor, width: COUNT_BADGE_WIDTH }]}>
						<Text style={[styles.userCountNumber, { color: contrastColor }]}>
							{showVieleAndere ? translate(TranslationKeys.onboarding_many_others) : formattedCount}
						</Text>
					</View>
				</View>
				{renderAvatarCarousel()}
			</View>
		</View>
	);

	const renderCanteenStep = () => (
		<View style={[styles.stepContent, { width: screenWidth }]}>
			<ScrollView contentContainerStyle={styles.stepScrollContentNoHPad}>
				<Text style={[styles.stepTitle, { color: theme.screen.text, paddingHorizontal: 20 }]}>
					{translate(TranslationKeys.onboarding_select_canteen)}
				</Text>
				{canteens.length === 0 ? (
					<View style={styles.emptyStateContainer}>
						<MaterialCommunityIcons name="store-off-outline" size={48} color={theme.screen.icon} />
						<Text style={[styles.emptyStateText, { color: theme.screen.text }]}>
							{translate(TranslationKeys.onboarding_no_canteens_available)}
						</Text>
					</View>
				) : (
					<CanteenSelection onSelectCanteen={handleSelectCanteen} />
				)}
			</ScrollView>
		</View>
	);

	const renderPreferencesStep = () => (
		<View style={[styles.stepContent, { width: screenWidth }]}>
			<ScrollView contentContainerStyle={styles.stepScrollContentNoHPad}>
				<Text style={[styles.stepTitle, { color: theme.screen.text, paddingHorizontal: 20 }]}>
					{translate(TranslationKeys.onboarding_preferences)}
				</Text>
				<View style={[styles.eatingHabitsIntroContainer, { paddingHorizontal: 20 }]}>
					<Text style={[styles.eatingHabitsBody, { color: theme.screen.text }]}>
						{readMore
							? translate(TranslationKeys.eatinghabits_introduction)
							: excerpt(translate(TranslationKeys.eatinghabits_introduction), 120)}
					</Text>
					{readMore && <FoodLabelingInfo textStyle={styles.eatingHabitsBodyItalic} backgroundColor={primaryColor} />}
					<View style={styles.readMoreContainer}>
						<TouchableOpacity
							onPress={() => setReadMore((prev) => !prev)}
							style={[styles.readMoreButton, { backgroundColor: primaryColor }]}
						>
							<Text style={[styles.readMoreText, { color: contrastColor }]}>
								{readMore ? translate(TranslationKeys.read_less) : translate(TranslationKeys.read_more)}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
				<View style={[styles.markingsContainer, { paddingHorizontal: 16 }]}>
					<SettingsGroupTitle>{translate(TranslationKeys.settings)}</SettingsGroupTitle>
					<SettingsList
						iconBgColor={primaryColor}
						leftIcon={<MaterialCommunityIcons name="layers-outline" size={22} color={theme.screen.icon} />}
						label={translate(TranslationKeys.foodoffers_show_separated_markings_breakdown)}
						value={markingsBreakdownLabel}
						rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />}
						handleFunction={openMarkingsBreakdownModal}
						groupPosition="top"
					/>
					<SettingsList
						iconBgColor={primaryColor}
						leftIcon={<MaterialCommunityIcons name="broom" size={22} color={theme.screen.icon} />}
						label={translate(TranslationKeys.clear_markings_selection)}
						handleFunction={handleClearMarkingsWithConfirmation}
						groupPosition="bottom"
					/>
					<View style={{ height: 16 }} />
					<SettingsListMarkingLabelsFast markingIds={markingIds} handleMenuSheet={openMenuSheet} />
				</View>
			</ScrollView>
		</View>
	);

	const renderPriceGroupStep = () => (
		<View style={[styles.stepContent, { width: screenWidth }]}>
			<ScrollView contentContainerStyle={styles.stepScrollContentNoHPad}>
				<Text style={[styles.stepTitle, { color: theme.screen.text, paddingHorizontal: 20 }]}>
					{translate(TranslationKeys.onboarding_price_group)}
				</Text>
				<Text style={[styles.stepDescription, { color: theme.screen.text, paddingHorizontal: 20 }]}>
					{translate(TranslationKeys.onboarding_price_group_description)}
				</Text>
				{priceAnimationJson && (
					<View style={styles.lottieContainer}>
						<LottieView ref={priceAnimRef} source={priceAnimationJson} resizeMode="contain" style={{ width: '100%', height: '100%' }} autoPlay loop={false} />
					</View>
				)}
				<View style={styles.priceGroupContainer}>
					<PriceGroupSettingsList onSelect={handleSelectPriceGroup} />
				</View>
			</ScrollView>
		</View>
	);

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: theme.screen.background }]}>
			<ScrollView
				ref={scrollViewRef}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				onMomentumScrollEnd={handleScrollEnd}
				scrollEventThrottle={16}
				style={styles.horizontalScroll}
			>
				{mountedSteps.has(0) ? renderWelcomeStep() : <View style={[styles.stepContent, { width: screenWidth }]} />}
				{mountedSteps.has(1) ? renderCanteenStep() : <View style={[styles.stepContent, { width: screenWidth }]} />}
				{mountedSteps.has(2) ? renderPriceGroupStep() : <View style={[styles.stepContent, { width: screenWidth }]} />}
				{mountedSteps.has(3) ? renderPreferencesStep() : <View style={[styles.stepContent, { width: screenWidth }]} />}
			</ScrollView>
			<View style={styles.stepIndicatorContainer}>
				{renderStepIndicator()}
			</View>
			<View style={[styles.navigationContainer, { borderTopColor: theme.screen.iconBg }]}>
				{isFirstStep ? (
					// No back button on the first step, so let the next button take the full
					// width instead of a small button next to an invisible spacer.
					<TouchableOpacity
						onPress={handleNext}
						style={[styles.navButtonPrimary, styles.navButtonFullWidth, { backgroundColor: primaryColor }]}
					>
						<Text style={[styles.navButtonPrimaryText, { color: contrastColor }]}>
							{translate(TranslationKeys.onboarding_next)}
						</Text>
						<MaterialCommunityIcons name="chevron-right" size={24} color={contrastColor} />
					</TouchableOpacity>
				) : (
					<>
						<TouchableOpacity
							onPress={handleBack}
							style={[styles.navButtonPrimary, { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.screen.iconBg }]}
						>
							<MaterialCommunityIcons name="chevron-left" size={24} color={theme.screen.text} />
							<Text style={[styles.navButtonPrimaryText, { color: theme.screen.text }]}>
								{translate(TranslationKeys.onboarding_back)}
							</Text>
						</TouchableOpacity>
						{!isLastStep ? (
							<TouchableOpacity
								onPress={handleNext}
								style={[styles.navButtonPrimary, { backgroundColor: primaryColor }]}
							>
								<Text style={[styles.navButtonPrimaryText, { color: contrastColor }]}>
									{translate(TranslationKeys.onboarding_next)}
								</Text>
								<MaterialCommunityIcons name="chevron-right" size={24} color={contrastColor} />
							</TouchableOpacity>
						) : (
							<TouchableOpacity
								onPress={handleStart}
								style={[styles.navButtonPrimary, { backgroundColor: primaryColor }]}
								activeOpacity={0.8}
							>
								<MaterialCommunityIcons name="rocket-launch" size={24} color={contrastColor} />
								<Text style={[styles.navButtonPrimaryText, { color: contrastColor }]}>
									{translate(TranslationKeys.onboarding_start)}
								</Text>
							</TouchableOpacity>
						)}
					</>
				)}
			</View>
			{showReadyOverlay && (
				<Animated.View style={[styles.readyOverlay, { opacity: readyOpacity, backgroundColor: primaryColor }]}>
					<MaterialCommunityIcons name="rocket-launch" size={80} color={contrastColor} />
					<Text style={[styles.readyTitle, { color: contrastColor }]}>
						{translate(TranslationKeys.onboarding_ready)}
					</Text>
				</Animated.View>
			)}
			{currentStepIndex === STEPS.indexOf('preferences') && (
				<MarkingBottomSheet ref={menuSheetRef} onClose={closeMenuSheet} />
			)}
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	horizontalScroll: {
		flex: 1,
	},
	stepIndicatorContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 8,
		marginTop: 8,
		marginBottom: 4,
	},
	stepDot: {
		height: 8,
		borderRadius: 4,
	},
	stepContent: {
		flex: 1,
	},
	// flex:1 makes this ScrollView claim exactly the space left over after welcomeBottomSection,
	// so its content (icon/title/description, which varies in length) scrolls internally instead
	// of ever changing welcomeBottomSection's position.
	welcomeTopScroll: {
		flex: 1,
	},
	welcomeTopScrollContent: {
		flexGrow: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 16,
		paddingHorizontal: 20,
		paddingTop: 20,
	},
	welcomeBottomSection: {
		width: '100%',
		alignItems: 'center',
		gap: 16,
		paddingHorizontal: 20,
		paddingBottom: 20,
	},
	stepScrollContentNoHPad: {
		flexGrow: 1,
		alignItems: 'center',
		gap: 16,
		paddingVertical: 20,
	},
	stepTitle: {
		fontSize: 24,
		fontFamily: 'Poppins_700Bold',
		textAlign: 'center',
	},
	stepDescription: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'center',
		opacity: 0.8,
		paddingHorizontal: 16,
	},
	emptyStateContainer: {
		alignItems: 'center',
		gap: 12,
		paddingVertical: 32,
	},
	emptyStateText: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'center',
		opacity: 0.6,
	},
	markingsContainer: {
		width: '100%',
		marginTop: 8,
	},
	eatingHabitsIntroContainer: {
		width: '100%',
	},
	eatingHabitsBody: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	eatingHabitsBodyItalic: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		fontStyle: 'italic',
		marginTop: 10,
	},
	readMoreContainer: {
		width: '100%',
		alignItems: 'center',
		marginVertical: 10,
	},
	readMoreButton: {
		paddingHorizontal: 20,
		height: 46,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 10,
	},
	readMoreText: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
	},
	priceGroupContainer: {
		width: '100%',
		marginTop: 8,
		paddingHorizontal: 16,
	},
	lottieContainer: {
		width: 180,
		height: 180,
	},
	userCountContainer: {
		alignItems: 'center',
		gap: 12,
		marginTop: 8,
	},
	userCountBadge: {
		borderRadius: 24,
		paddingHorizontal: 32,
		paddingVertical: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	userCountNumber: {
		fontSize: 48,
		fontFamily: 'Poppins_700Bold',
	},
	navigationContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderTopWidth: 1,
	},
	navButtonPrimary: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 24,
		minWidth: 80,
	},
	navButtonPrimaryText: {
		fontSize: 16,
		fontFamily: 'Poppins_700Bold',
	},
	navButtonFullWidth: {
		width: '100%',
		justifyContent: 'center',
	},
	avatarCarouselContainer: {
		gap: 8,
		marginTop: 16,
		overflow: 'hidden',
	},
	avatarCarouselRow: {
		flexDirection: 'row',
	},
	avatarCarouselCell: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 4,
	},
	readyOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 24,
	},
	readyTitle: {
		fontSize: 28,
		fontFamily: 'Poppins_700Bold',
		textAlign: 'center',
		paddingHorizontal: 24,
	},
});

export default OnboardingScreen;

