import React, {useEffect} from 'react';
import {MySafeAreaView} from '@/components/MySafeAreaView';
import {ScrollViewWithGradient} from '@/components/scrollview/ScrollViewWithGradient';
import {IconNames} from '@/constants/IconNames';
import {SettingsRowGroup} from '@/components/settings/SettingsRowGroup';
import {SettingsRowSpacer} from '@/components/settings/SettingsRowSpacer';
import {TranslationKeys, useTranslation, useTranslationSupportAndFeedback} from "@/helper/translations/Translation";
import {CollectionHelper} from "@/helper/database/server/CollectionHelper";
import {AppFeedbacks} from "@/helper/database/databaseTypes/types";
import {useSynchedProfile} from "@/states/SynchedProfile";
import {useCurrentRoleIsAdmin, useIsCurrentUserAnonymous} from "@/states/User";
import {ListRenderItemInfo} from "react-native";
import {MyGridFlatList} from "@/components/grid/MyGridFlatList";
import {SettingsRowNavigateWithText} from "@/components/settings/SettingsRowNavigate";
import {useSynchedAppSettings} from "@/states/SynchedAppSettings";
import {SettingsRow} from "@/components/settings/SettingsRow";
import {MyLinkCustom} from "@/components/link/MyLinkCustom";
import {View} from "@/components/Themed";
import {AnimationSupport} from "@/compositions/animations/AnimationSupport";
import {SEARCH_PARAM_APPFEEDBACK_ID} from "@/app/(app)/support/app_feedbacks";
import {DeveloperInformation} from "@/constants/DeveloperInformation";
import {HrefHelper} from "@/helper/device/CommonSystemActionHelper";
import {DateHelper} from "@/helper/date/DateHelper";

export const TABLE_NAME_APP_FEEDBACKS = 'app_feedbacks';

export default function AppfeedbackScreen() {
	const translation_create = useTranslation(TranslationKeys.create);
	const translation_support_and_feedback = useTranslationSupportAndFeedback()
	const translation_navigate_to = useTranslation(TranslationKeys.navigate_to)

	const translation_email = useTranslation(TranslationKeys.email)
	const translation_developer = useTranslation(TranslationKeys.developer)
	const translation_developer_homepage = useTranslation(TranslationKeys.developer_homepage)
	const translation_software_homepage = useTranslation(TranslationKeys.software_homepage)
	const translation_software_name = useTranslation(TranslationKeys.software_name)

	const [appSettings, setAppSettings] = useSynchedAppSettings();
	const app_url_to_apple_store = appSettings?.app_url_to_apple_store
	const app_url_to_google_store = appSettings?.app_url_to_google_store

	const isAdmin = useCurrentRoleIsAdmin();
	const isAnonymous = useIsCurrentUserAnonymous()
	const [profile, setProfile, cacheHelperTypeProfile] = useSynchedProfile();
	const [appfeedbacks, setAppfeedbacks] = React.useState<AppFeedbacks[]>([]);

	async function fetchAppfeedbacks() {
		if(isAnonymous) return [];

		let filter_for_profile = {
			profile_id: profile.id,
		}

		let filter_for_admin = {

		}

		let filter = isAdmin ? filter_for_admin : filter_for_profile;

		const collectionHelper = new CollectionHelper<AppFeedbacks>(TABLE_NAME_APP_FEEDBACKS)
		let feedbacks_remote = await collectionHelper.readItems({
			fields: ['*'],
			filters: filter,
			limit: 100,
		})
		return feedbacks_remote;
	}

	async function loadAppfeedbacks() {
		let feedbacks = await fetchAppfeedbacks();
		setAppfeedbacks(feedbacks);
	}

	useEffect(() => {
		loadAppfeedbacks()
	}, []);


	type DataItem = { key: string; data: AppFeedbacks}
	const data: DataItem[] = []
	if (appfeedbacks) {
		for (let i=0; i<appfeedbacks.length; i++) {
			const appfeedback = appfeedbacks[i];
			if(!!appfeedback){
				data.push({key: appfeedback?.id, data: appfeedback})
			}
		}
	}

	// sort by date, latest first
	data.sort((a, b) => {
		let Adate_created = a.data.date_created;
		let Bdate_created = b.data.date_created;
		let Adate = new Date(Adate_created || 0);
		let Bdate = new Date(Bdate_created || 0);
		return Bdate.getTime() - Adate.getTime();
	});

	const renderResource = (info: ListRenderItemInfo<DataItem>) => {
		const {item, index} = info;
		const resource = item.data;
		const resource_id = resource.id
		const title = resource.title || resource_id

		let iconLeft = IconNames.message_send_icon;
		if(resource.response){
			iconLeft = IconNames.message_support_responded_icon
		}
		if(resource.response_read_by_user){
			iconLeft = IconNames.message_response_read_by_user_icon
		}
		let now = new Date();
		let labelRight = undefined
		const usedDate = resource.date_updated || resource.date_created;
		if(usedDate){
			labelRight = DateHelper.formatOfferDateToReadable(new Date(usedDate), true, true);
		}

		return (
			<SettingsRowNavigateWithText labelRight={labelRight} labelLeft={title} leftIcon={iconLeft} route={"/(app)/support/app_feedbacks?"+SEARCH_PARAM_APPFEEDBACK_ID+"="+resource_id} />
		);

	}

	let accessibilityLabelDeveloperWebsite = translation_navigate_to+": "+translation_developer_homepage+" "+DeveloperInformation.companyWebsite;
	let accessibilityLabelSoftwareWebsite = translation_navigate_to+": "+translation_software_homepage+" "+DeveloperInformation.softwareWebsite;

	let renderedDeveloperInformation = <>
		<View style={{
			width: "100%",
		}}>
			<SettingsRow leftIcon={IconNames.developer_icon} labelLeft={translation_developer} labelRight={DeveloperInformation.companyName} accessibilityLabel={translation_developer+": "+DeveloperInformation.companyName} />
			<MyLinkCustom hrefExternal={DeveloperInformation.companyWebsite} accessibilityLabel={accessibilityLabelDeveloperWebsite}>
				<SettingsRow leftIcon={IconNames.mail_icon} labelLeft={translation_developer_homepage} labelRight={DeveloperInformation.companyWebsite} accessibilityLabel={DeveloperInformation.companyWebsite} rightIcon={IconNames.open_link_icon} />
			</MyLinkCustom>
			<SettingsRow leftIcon={IconNames.software_icon} labelLeft={translation_software_name} labelRight={DeveloperInformation.softwareName} accessibilityLabel={translation_software_name+": "+DeveloperInformation.softwareName} />
			<MyLinkCustom hrefExternal={DeveloperInformation.softwareWebsite} accessibilityLabel={accessibilityLabelSoftwareWebsite}>
				<SettingsRow leftIcon={IconNames.mail_icon} labelRight={DeveloperInformation.softwareWebsite} labelLeft={translation_software_homepage} accessibilityLabel={accessibilityLabelSoftwareWebsite} rightIcon={IconNames.open_link_icon} />
			</MyLinkCustom>
		</View>
	</>


	let renderedIosAppStoreLink: any = null;
	if(app_url_to_apple_store){
		let labelLeft = "Apple Store";
		let accessibilityLabel = translation_navigate_to+": "+labelLeft;
		renderedIosAppStoreLink =
			<View style={{
				width: "100%",
			}}>
				<MyLinkCustom hrefExternal={app_url_to_apple_store} accessibilityLabel={accessibilityLabel}>
					<SettingsRow leftIcon={IconNames.brand_apple_icon} labelLeft={labelLeft} accessibilityLabel={accessibilityLabel} rightIcon={IconNames.open_link_icon} />
				</MyLinkCustom>
			</View>
	}

	let renderedGooglePlayStoreLink: any = null;
	if(!!app_url_to_google_store){
		let labelLeft = "Google Play Store";
		let accessibilityLabel = translation_navigate_to+": "+labelLeft;
		renderedGooglePlayStoreLink =
			<View style={{
				width: "100%",
			}}>
				<MyLinkCustom hrefExternal={app_url_to_google_store} accessibilityLabel={accessibilityLabel}>
					<SettingsRow leftIcon={IconNames.brand_google_play_icon} labelLeft={labelLeft} accessibilityLabel={accessibilityLabel} rightIcon={IconNames.open_link_icon} />
				</MyLinkCustom>
			</View>
	}

	let accessibilityLabelMailToDeveloper = translation_navigate_to+": "+DeveloperInformation.email;
	let renderedDeveloperEmailLink = <View style={{
		width: "100%",
	}}>
		<MyLinkCustom hrefExternal={HrefHelper.MAILTO+DeveloperInformation.email} accessibilityLabel={accessibilityLabelMailToDeveloper}>
			<SettingsRow leftIcon={IconNames.mail_icon} labelLeft={translation_email} labelRight={DeveloperInformation.email} accessibilityLabel={accessibilityLabelMailToDeveloper} rightIcon={IconNames.open_link_icon} />
		</MyLinkCustom>
	</View>

	return (
		<MySafeAreaView>
			<ScrollViewWithGradient>
				<AnimationSupport />
				<SettingsRowGroup>
					<SettingsRowNavigateWithText labelLeft={translation_support_and_feedback} leftIcon={IconNames.support_icon} route={"/(app)/support/app_feedbacks"} />
				</SettingsRowGroup>
				<SettingsRowGroup>
					{renderedIosAppStoreLink}
					{renderedGooglePlayStoreLink}
					{renderedDeveloperEmailLink}
				</SettingsRowGroup>
				<SettingsRowSpacer />
				<SettingsRowGroup>
					<MyGridFlatList
						data={data} renderItem={renderResource} amountColumns={1}
					/>
				</SettingsRowGroup>
				<SettingsRowGroup>
					{renderedDeveloperInformation}
				</SettingsRowGroup>
			</ScrollViewWithGradient>
		</MySafeAreaView>
	);
}