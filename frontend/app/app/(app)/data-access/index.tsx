import {MySafeAreaView} from "@/components/MySafeAreaView";
import {ScrollViewWithGradient} from "@/components/scrollview/ScrollViewWithGradient";
import {useAllSyncStates} from "@/helper/syncState/SyncState";
import {MyModalActionSheetItem} from "@/components/modal/MyModalActionSheet";
import {MyScrollView} from "@/components/scrollview/MyScrollView";
import {Text, View} from "@/components/Themed";
import {SettingsRowActionsheet} from "@/components/settings/SettingsRowActionsheet";
import {useSynchedProfile} from "@/states/SynchedProfile";
import {SettingsRowGroup} from "@/components/settings/SettingsRowGroup";
import {TranslationKeys, useTranslation} from "@/helper/translations/Translation";
import {AnimationSupport} from "@/compositions/animations/AnimationSupport";
import {useCurrentUser} from "@/states/User";
import {ThemedMarkdown} from "@/components/markdown/ThemedMarkdown";
import {useSynchedOwnFoodIdToFoodFeedbacksDict} from "@/states/SynchedFoodFeedbacks";


export default function DataAccessScreen() {
	const [profile, setProfile] = useSynchedProfile();
	const [currentUser, setUserWithCache] = useCurrentUser();
	const [ownFoodFeedbacksDict, setOwnFoodFeedbacksDict, cacheHelperObjOwnFoodFeedbacks] = useSynchedOwnFoodIdToFoodFeedbacksDict();

	const translation_data_access_introduction = useTranslation(TranslationKeys.data_access_introduction);
	const translation_your_data_which_we_know_if_you_have_a_profile = useTranslation(TranslationKeys.your_data_which_we_know_if_you_have_a_profile);
	const translation_all_on_device_saved_data = useTranslation(TranslationKeys.translation_all_on_device_saved_data);

	const translation_profile = useTranslation(TranslationKeys.profile);
	const translation_account = useTranslation(TranslationKeys.account);
	const translation_food_feedbacks = useTranslation(TranslationKeys.food_feedbacks);


	let renderedSavedData = [];

	function renderDataOfObject(obj: any) {
		return (
			<MySafeAreaView>
				<MyScrollView>
					<View style={{
						width: '100%',
						padding: 20,
					}}
					>
						<Text>
							{JSON.stringify(obj, null, 2)}
						</Text>
					</View>
				</MyScrollView>
			</MySafeAreaView>
		);
	}

	if(currentUser) {
		const config: MyModalActionSheetItem = {
			accessibilityLabel: translation_account,
			key: translation_account,
			label: translation_account,
			title: translation_account,
			renderAsContentInsteadItems: (key: string, hide: () => void) => {
				return renderDataOfObject(currentUser);
			}
		}

		renderedSavedData.push(
			<SettingsRowActionsheet accessibilityLabel={translation_account} config={config} labelLeft={translation_account} />
		);
	}

	if (profile) {
		const config: MyModalActionSheetItem = {
			accessibilityLabel: translation_profile,
			key: translation_profile,
			label: translation_profile,
			title: translation_profile,
			renderAsContentInsteadItems: (key: string, hide: () => void) => {
				return renderDataOfObject(profile);
			}
		}

		renderedSavedData.push(
			<SettingsRowActionsheet accessibilityLabel={translation_profile} config={config} labelLeft={translation_profile} />
		);
	}

	if (ownFoodFeedbacksDict) {
		const config: MyModalActionSheetItem = {
			accessibilityLabel: translation_food_feedbacks,
			key: translation_food_feedbacks,
			label: translation_food_feedbacks,
			title: translation_food_feedbacks,
			renderAsContentInsteadItems: (key: string, hide: () => void) => {
				return renderDataOfObject(ownFoodFeedbacksDict);
			}
		}

		renderedSavedData.push(
			<SettingsRowActionsheet accessibilityLabel={translation_food_feedbacks} config={config} labelLeft={translation_food_feedbacks} />
		);
	}


	const allSyncStates = useAllSyncStates();

	const renderedRows: any[] = [];
	const allSyncStatesKeys = Object.keys(allSyncStates);
	for (let i = 0; i < allSyncStatesKeys.length; i++) {
		const key = allSyncStatesKeys[i];
		const value = allSyncStates[key];

		const config: MyModalActionSheetItem = {
			accessibilityLabel: key,
			key: key,
			label: key,
			title: key,
			renderAsContentInsteadItems: (key: string, hide: () => void) => {
				return (
					<MySafeAreaView>
						<MyScrollView>
							<View style={{
								width: '100%',
								padding: 20,
							}}
							>
								<Text>
									{JSON.stringify(value, null, 2)}
								</Text>
							</View>
						</MyScrollView>
					</MySafeAreaView>
				);
			}
		}

		renderedRows.push(
			<SettingsRowActionsheet accessibilityLabel={key} config={config} labelLeft={key} />
		);
	}

	return (
		<MySafeAreaView>
			<ScrollViewWithGradient>
				<AnimationSupport />
				<View style={{
					width: '100%',
					justifyContent: "flex-start",
					paddingHorizontal: 20,
				}}>
					<ThemedMarkdown markdown={translation_data_access_introduction} />
				</View>
				<View style={{
					height: 50, width: '100%'
				}} />
				<View style={{
					width: '100%',
					justifyContent: "flex-start",
					marginLeft: 20,
				}}>
					<Text>{translation_your_data_which_we_know_if_you_have_a_profile}</Text>
				</View>
				<SettingsRowGroup>
					{renderedSavedData}
				</SettingsRowGroup>
				<View style={{
					width: '100%',
					justifyContent: "flex-start",
					marginLeft: 20,
				}}>
					<Text>{translation_all_on_device_saved_data}</Text>
				</View>
				<SettingsRowGroup>
					{renderedRows}
				</SettingsRowGroup>
			</ScrollViewWithGradient>
		</MySafeAreaView>
	)
}