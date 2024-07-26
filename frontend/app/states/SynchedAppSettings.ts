import {PersistentStore} from '@/helper/syncState/PersistentStore';
import {AppSettings} from '@/helper/database/databaseTypes/types';
import {useSynchedResourceSingleRaw} from '@/states/SynchedResource';
import {useIsDemo} from '@/states/SynchedDemo';
import {CollectionHelper} from '@/helper/database/server/CollectionHelper';
import {RatingType} from "@/components/buttons/MyRatingButton";
import {FeedbackCommentType, FeedbackLabelsType} from "@/compositions/fooddetails/FoodDetails";
import {MyCacheHelperDependencyEnum, MyCacheHelperType} from "@/helper/cache/MyCacheHelper";
import {useProjectColor} from "@/states/ProjectInfo";
import {AppAreaColors} from "@/constants/Colors";

export const TABLE_NAME_APP_SETTINGS = 'app_settings';
async function loadAppSettingsFromServer(): Promise<AppSettings> {
	const collectionHelper = new CollectionHelper<AppSettings>(TABLE_NAME_APP_SETTINGS);
	const query = CollectionHelper.getQueryWithRelatedFields(['*', "housing_translations.*"]);
	return await collectionHelper.readSingletonItem(query);
}

export function useSynchedAppSettings(): [( AppSettings | null | undefined), ((newValue: (currentValue: (AppSettings | null | undefined)) => (AppSettings | null | undefined), ) => void), cacheHelperObj: MyCacheHelperType]
{
	const [resourceOnly, setResourceOnly, resourceRaw, setResourceRaw] = useSynchedResourceSingleRaw<AppSettings>(PersistentStore.app_settings);
	const demo = useIsDemo()
	let usedResources = resourceOnly;
	if (demo) {
		usedResources = getDemoAppSettings()
	}
	let lastUpdate = resourceRaw?.sync_cache_composed_key_local

	async function updateFromServer(sync_cache_composed_key_local?: string) {
		const resource = await loadAppSettingsFromServer();
		setResourceOnly((currentSettings) => {
			return resource;
		}, sync_cache_composed_key_local);
	}

	const cacheHelperObj: MyCacheHelperType = {
		sync_cache_composed_key_local: resourceRaw?.sync_cache_composed_key_local,
		updateFromServer: updateFromServer,
		dependencies: {
			collections: [],
			update_always: true,
		}
	}

	return [usedResources, setResourceOnly, cacheHelperObj]
}

export function useFoodImagePlaceholderAssetId(): string | null | undefined {
	const [appSettings] = useSynchedAppSettings();
	return appSettings?.foods_placeholder_image as string | null | undefined;
}

export function useIsFoodsEnabled(): boolean {
	const [appSettings] = useSynchedAppSettings();
	return appSettings?.foods_enabled || false;
}

export function useFoodsAreaColor(): string | undefined {
	const projectColor = useProjectColor();
	return AppAreaColors.FOODS_COLOR || projectColor;
}

export function useCampusAreaColor(): string | undefined {
	const projectColor = useProjectColor();
	return AppAreaColors.CAMPUS_COLOR || projectColor;
}

export function useNewsAreaColor(): string | undefined {
	const projectColor = useProjectColor();
	return AppAreaColors.NEWS_COLOR || projectColor;
}

export function useHousingAreaColor(): string | undefined {
	const projectColor = useProjectColor();
	return AppAreaColors.HOUSING_COLOR || projectColor;
}

export function useIsHousingEnabled(): boolean {
	const [appSettings] = useSynchedAppSettings();
	return appSettings?.housing_enabled || false;
}

export function useIsMapEnabled(): boolean {
	const [appSettings] = useSynchedAppSettings();
	return appSettings?.map_enabled || false;
}

export function useIsBuildingsEnabled(): boolean {
	const [appSettings] = useSynchedAppSettings();
	return appSettings?.campus_enabled || false;
}

export function useIsNewsEnabled(): boolean {
	const [appSettings] = useSynchedAppSettings();
	return appSettings?.news_enabled || false;
}

export function useIsCourseTimetableEnabled(): boolean {
	const [appSettings] = useSynchedAppSettings();
	return appSettings?.course_timetable_enabled || false;
}

export function useIsAccountBalanceEnabled(): boolean {
	const [appSettings] = useSynchedAppSettings();
	return appSettings?.balance_enabled || false;
}

export function useIsUtilizationForecastEnabled(): boolean {
	const [appSettings] = useSynchedAppSettings();
	return appSettings?.utilization_forecast_calculation_enabled || false;
}

function getDemoAppSettings(): AppSettings {
	const demoResource: AppSettings = {
		app_stores: '',
		app_url_to_apple_store: '',
		app_url_to_google_store: '',
		api_version: '',
		balance_enabled: true,
		balance_settings: '',
		campus_enabled: true,
		buildings_parsing_enabled: false,
		buildings_parsing_last_date: '',
		buildings_parsing_status: '',
		buildings_settings: '',
		cashregisters_parsing_enabled: false,
		cashregisters_parsing_last_date: '',
		cashregisters_parsing_status: '',
		cashregisters_settings: '',
		course_timetable_enabled: true,
		course_timetable_settings: '',
		date_created: '',
		date_privacy_policy_updated: '',
		date_updated: '',
		foods_enabled: true,
		foods_parsing_enabled: false,
		foods_parsing_last_date: '',
		foods_parsing_status: '',
		foods_placeholder_image: null,
		foods_placeholder_image_thumb_hash: '',
		foods_ratings_amount_display: true,
		foods_ratings_average_display: true,
		foods_ratings_type: RatingType.stars,
		foods_feedbacks_comments_type: FeedbackCommentType.readAndWrite,
		foods_feedbacks_labels_type: FeedbackLabelsType.useAndRead,
		foods_settings: '',
		housing_enabled: true,
		housing_maps_enabled: false,
		housing_parsing_enabled: false,
		housing_parsing_last_date: '',
		housing_parsing_status: '',
		housing_settings: '',
		housing_translations: [],
		id: 0,
		maintenance_end: '',
		maintenance_settings: '',
		maintenance_start: '',
		news_enabled: true,
		news_parsing_enabled: false,
		news_parsing_last_date: '',
		news_parsing_status: '',
		news_settings: '',
		notifications_android_enabled: true,
		notifications_email_enabled: true,
		notifications_ios_enabled: true,
		notifications_settings: '',
		status: '',
		user_created: '',
		user_updated: '',
		utilization_forecast_enabled: true,
		utilization_forecast_calculation_enabled: false,
		utilization_forecast_calculation_last_date: '',
		utilization_forecast_calculation_status: '',
		utilization_settings: ''
	}

	return demoResource
}