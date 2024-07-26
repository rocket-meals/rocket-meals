import {
	Foodoffers,
	Foods,
	FoodsFeedbacks,
	FoodsFeedbacksFoodsFeedbacksLabels
} from '@/helper/database/databaseTypes/types';
import {Heading, Text, TextInput, View} from '@/components/Themed';
import React, {useEffect, useState} from 'react';
import {loadFood, loadFoodOffer} from '@/states/SynchedFoodOfferStates';
import {MyButton} from '@/components/buttons/MyButton';
import {IconNames} from '@/constants/IconNames';
import {useProfileLanguageCode} from '@/states/SynchedProfile';
import {Dimensions} from 'react-native';
import NutritionList from '@/components/food/NutritionList';
import {useBreakPointValue} from '@/helper/device/DeviceHelper';
import {TranslationKeys, useTranslation} from '@/helper/translations/Translation';
import {MarkingListSelective} from '@/components/food/MarkingList';
import {useIsDemo} from "@/states/SynchedDemo";
import {useIsDebug} from "@/states/Debug";
import {useFoodsAreaColor, useSynchedAppSettings} from "@/states/SynchedAppSettings";
import {FoodFeedbackRating} from "@/components/foodfeedback/FoodRatingDisplay";
import {useServerInfo} from "@/states/SyncStateServerInfo";
import {DETAILS_COMPONENT_MARGIN_HORIZONTAL, DetailsComponent} from "@/components/detailsComponent/DetailsComponent";
import {FoodNotifyButton} from "@/components/foodfeedback/FoodNotifyButton";
import {useSynchedFoodsFeedbacksLabelsDict} from "@/states/SynchedFoodsFeedbacksLabels";
import {getDirectusTranslation, TranslationEntry} from "@/helper/translations/DirectusTranslationUseFunction";
import {AccountRequiredTouchableOpacity} from "@/components/buttons/AccountRequiredTouchableOpacity";
import {
	getDictFoodFeedbackLabelsIdToAmount,
	loadFoodsFeedbacksForFoodWithFeedbackLabelsIds
} from "@/states/SynchedFoods";
import {useSynchedOwnFoodFeedback} from "@/states/SynchedFoodFeedbacks";
import {SettingsRow} from "@/components/settings/SettingsRow";
import {MyGridFlatList} from "@/components/grid/MyGridFlatList";
import {DateHelper} from "@/helper/date/DateHelper";
import {ReturnKeyType} from "@/helper/input/ReturnKeyType";
import {SettingsRowTriStateLikeDislike} from "@/components/settings/SettingsRowTriStateLikeDislike";
import DirectusImageOrIconComponent from "@/components/image/DirectusImageOrIconComponent";
import {ThemedMarkdown} from "@/components/markdown/ThemedMarkdown";

export enum FeedbackCommentType {
	disabled='disabled',
	write='write',
	read='read',
	readAndWrite='readAndWrite'
}


export const useFeedbackCommentType = (): FeedbackCommentType => {
	const [appSettings] = useSynchedAppSettings();
	const commentType = appSettings?.foods_feedbacks_comments_type;
	let feedbackCommentType: FeedbackCommentType = FeedbackCommentType.disabled
	if(commentType === 'write'){
		feedbackCommentType = FeedbackCommentType.write
	} else if(commentType === 'read'){
		feedbackCommentType = FeedbackCommentType.read
	} else if(commentType === 'readAndWrite'){
		feedbackCommentType = FeedbackCommentType.readAndWrite
	}
	return feedbackCommentType
}

export enum FeedbackLabelsType {
	disabled='disabled',
	use='use',
	useAndRead='useAndRead'
}

export const useFeedbackLabelsType = (): FeedbackLabelsType => {
	const [appSettings] = useSynchedAppSettings();
	const labelsType = appSettings?.foods_feedbacks_labels_type;
	let feedbackLabelsType: FeedbackLabelsType = FeedbackLabelsType.disabled
	if(labelsType === 'use'){
		feedbackLabelsType = FeedbackLabelsType.use
	} else if(labelsType === 'useAndRead'){
		feedbackLabelsType = FeedbackLabelsType.useAndRead
	}
	return feedbackLabelsType
}

type FoodFeedbackSettingsRowDataProps = {food_id: string, feedback_label_id: string, translation: string, amount_likes: number|undefined|null, amount_dislikes: number|undefined|null}
type FoodFeedbackSettingsRowProps = {refresh: () => void} & FoodFeedbackSettingsRowDataProps
const FoodFeedbackSettingsRow = ({food_id, feedback_label_id, translation, amount_likes, amount_dislikes, refresh}: FoodFeedbackSettingsRowProps) => {
	const [foodFeedback, setOwnRating, setOwnComment, setOwnNotify, setOwnLabels] = useSynchedOwnFoodFeedback(food_id);
	const [foodFeedbackLabelsDict] = useSynchedFoodsFeedbacksLabelsDict();
	const foodFeedbackLabel = foodFeedbackLabelsDict?.[feedback_label_id];

	const foodsAreaColor = useFoodsAreaColor()

	const translationSetRating = useTranslation(TranslationKeys.set_rating);

	let ownFoodFeedbackLabels: FoodsFeedbacksFoodsFeedbacksLabels[] = foodFeedback?.labels || [];
	let ownFoodFeedbackLabel: FoodsFeedbacksFoodsFeedbacksLabels | undefined |null = ownFoodFeedbackLabels.find((value) => value.foods_feedbacks_labels_id === feedback_label_id);
	let dislikesRaw: boolean | undefined | null = ownFoodFeedbackLabel?.dislikes
	let statusSet = dislikesRaw === true || dislikesRaw === false;
	const likes = statusSet ? !dislikesRaw : undefined;

	let iconLeftCustom = <DirectusImageOrIconComponent resource={foodFeedbackLabel} />

	return <SettingsRowTriStateLikeDislike
		color={foodsAreaColor}
		iconLeftCustom={iconLeftCustom}
		renderRightContentWrapper={(rightContent) => {
			return <AccountRequiredTouchableOpacity translationOfDesiredAction={translationSetRating}>
					{rightContent}
			</AccountRequiredTouchableOpacity>
		}}
		onSetState={async (nextLike: boolean | undefined) => {
		let ownFoodFeedbackLabelsWithoutThisLabel = ownFoodFeedbackLabels.filter((value) => value.foods_feedbacks_labels_id !== feedback_label_id)

		if(nextLike === undefined){
			await setOwnLabels(ownFoodFeedbackLabelsWithoutThisLabel)
		} else {
			let newLabel: FoodsFeedbacksFoodsFeedbacksLabels = {
				foods_feedbacks_labels_id: feedback_label_id,
				foods_feedbacks_id: foodFeedback?.id,
				dislikes: !nextLike
			}
			ownFoodFeedbackLabelsWithoutThisLabel.push(newLabel)
			await setOwnLabels(ownFoodFeedbackLabelsWithoutThisLabel)
		}
		await refresh()
	}} value={likes} labelLeft={translation} accessibilityLabel={translation} amount_likes={amount_likes} amount_dislikes={amount_dislikes} />
}

export const FoodFeedbacksLabelsComponent = ({food, remoteFoodFeedbacks, refresh}: {food: Foods, remoteFoodFeedbacks: FoodsFeedbacks[] | null | undefined, refresh: () => void}) => {
	const foods_feedbacks_labels_type = useFeedbackLabelsType()
	const [foodFeedbackLabelsDict] = useSynchedFoodsFeedbacksLabelsDict();
	const [ownFoodFeedback, setOwnRating, setOwnComment, setOwnNotify, setOwnLabels] = useSynchedOwnFoodFeedback(food.id);
	const [language, setLanguage] = useProfileLanguageCode()



	const isDebug = useIsDebug()

	const translation_feedback_labels = useTranslation(TranslationKeys.feedback_labels);

	const feedbackLabelIdToTranslation: Record<string, string> = {}
	if(!!foodFeedbackLabelsDict){
		Object.keys(foodFeedbackLabelsDict).forEach((key) => {
			let label = foodFeedbackLabelsDict[key];
			let id = label.id;
			let labelTranslations = label.translations as TranslationEntry[];
			let translation = getDirectusTranslation(language, labelTranslations, 'text');
			if(translation){
				feedbackLabelIdToTranslation[id] = translation;
			}
		})
	}

	if(foods_feedbacks_labels_type === FeedbackLabelsType.disabled){
		return null
	}

	const food_id = food.id;

	let dictFoodFeedbackLabelsIdToAmount = getDictFoodFeedbackLabelsIdToAmount(remoteFoodFeedbacks);

	type DataItem = { key: string; sort: number | undefined | null, data: FoodFeedbackSettingsRowDataProps}
	const data: DataItem[] = []

	Object.keys(feedbackLabelIdToTranslation).forEach((key) => {
		let translation = feedbackLabelIdToTranslation[key];
		if(foodFeedbackLabelsDict){
			let label = foodFeedbackLabelsDict[key];
			let sort = label?.sort
			let visible = label?.visible || isDebug
			let amount_information = dictFoodFeedbackLabelsIdToAmount[key];
			let amount_likes = amount_information?.amount_likes ?? null;
			let amount_dislikes = amount_information?.amount_dislikes ?? null;

			if(visible){
				data.push({key: key,
					sort: sort,
					data: {
						food_id: food_id,
						feedback_label_id: key,
						translation: translation,
						amount_likes: amount_likes,
						amount_dislikes: amount_dislikes
					}})
			}
		}
	});

	// sort labels by sort value. If a sort value is set, it will be before the ones without a sort value
	data.sort((a, b) => {
		let sort_a = a.sort;
		let sort_b = b.sort;
		if(sort_a && sort_b){
			return sort_a - sort_b;
		} else if(sort_a){
			return -1;
		} else if(sort_b){
			return 1;
		} else {
			return 0;
		}
	});

	let listOfFeedbackLabels = <MyGridFlatList data={data} renderItem={(listitem) => {
		let item: FoodFeedbackSettingsRowDataProps = listitem.item.data;
		return <FoodFeedbackSettingsRow {...item} refresh={refresh} />
	}} amountColumns={1} />

	let debugContent = null;
	if (isDebug) {
		debugContent = <View>
			<Text>{"ownFoodFeedback"}</Text>
			<Text>{JSON.stringify(ownFoodFeedback, null, 2)}</Text>
		</View>

	}

	return(
		<View style={{width: "100%", paddingTop: 10}}>
			<Heading>{translation_feedback_labels}</Heading>
			<View style={{width: "100%", height: 10}} />
			<View style={{width: "100%", height: 10}} />
			<View style={{width: "100%", flexDirection: "row", flexWrap: "wrap"}}>
				{listOfFeedbackLabels}
				{debugContent}
			</View>
		</View>
	)
}

export const FoodFeedbackCommentSingle = ({foodFeedback}: {foodFeedback: FoodsFeedbacks}) => {
	let comment = foodFeedback.comment+"";
	let date_updated = foodFeedback.date_updated
	let date_human_readable: string | undefined = undefined;
	if(date_updated){
		date_human_readable = DateHelper.formatOfferDateToReadable(new Date(date_updated), true, true);
	}

	return (
		<View>
			<SettingsRow labelLeft={comment} accessibilityLabel={comment} />
			<View style={{
				width: "100%",
				justifyContent: "flex-end",
			}}>
				<Text size={"sm"} italic={true} style={{
					textAlign: "right",
				}}>{date_human_readable}</Text>
			</View>
		</View>
	)
}

export const FoodFeedbackCommentDetails = ({food, remoteFoodFeedbacks}: {food: Foods, remoteFoodFeedbacks: FoodsFeedbacks[] | null | undefined;}) => {
	const usedFoodId = food.id;
	const [ownFoodFeedback, setOwnRating, setOwnComment, setOwnNotify, setOwnLabels] = useSynchedOwnFoodFeedback(food.id);

	const [language, setLanguage] = useProfileLanguageCode()

	const translation_to_the_forum = useTranslation(TranslationKeys.to_the_forum);
	const translation_your_comment = useTranslation(TranslationKeys.your_comment);
	const translation_comments = useTranslation(TranslationKeys.comments);
	const translation_save_comment = useTranslation(TranslationKeys.save_comment);

	// get app_settings
	const [appSettings] = useSynchedAppSettings();

	const foods_feedbacks_comments_type = useFeedbackCommentType()
	const foods_feedbacks_custom_url = appSettings?.foods_feedbacks_custom_url;

	if(foods_feedbacks_comments_type === FeedbackCommentType.disabled){
		return null
	}

	const [comment, setStateComment] = useState<string | null>(ownFoodFeedback?.comment ?? null);
	const onChangeText = (text: string) => {
		if (text === '') {
			setStateComment(null);
			return;
		}

		setStateComment(text);
	}

	const onSubmit = () => {
		setOwnComment(comment);
	}

	let commentContent = undefined;

	let saved_comment = ownFoodFeedback?.comment ?? null;

	let renderedComments: any[] = [];

	if(!!foods_feedbacks_custom_url){
		commentContent = <MyButton openHrefInNewTab={true} href={foods_feedbacks_custom_url} accessibilityLabel={translation_to_the_forum} tooltip={translation_to_the_forum} text={translation_to_the_forum} leftIcon={IconNames.comment_icon} rightIcon={IconNames.open_link_icon} />
	} else {


		commentContent = (
			<View style={{ width: "100%", paddingBottom: 20}}>
				<AccountRequiredTouchableOpacity>
					<TextInput placeholder={translation_your_comment} value={comment ?? ''} returnKeyType={ReturnKeyType.send} onChangeText={onChangeText} onSubmitEditing={() => {
						onSubmit();
					}} />

					<MyButton disabled={saved_comment === comment} isActive={saved_comment !== comment}
							  borderTopRadius={0}
							  accessibilityLabel={translation_save_comment}
							  text={translation_save_comment}
							  leftIcon={IconNames.comment_send_icon}
							  onPress={() => {
								  onSubmit();
							  }}
					/>
				</AccountRequiredTouchableOpacity>
			</View>
		)
	}

	if(saved_comment && ownFoodFeedback){
		renderedComments.push(
			<View style={{width: "100%", paddingTop: 10}}>
				<Heading>{translation_your_comment}</Heading>
			</View>
		)

		renderedComments.push(
			<FoodFeedbackCommentSingle foodFeedback={ownFoodFeedback} />
		)

	}

	if(foods_feedbacks_comments_type === FeedbackCommentType.read || foods_feedbacks_comments_type === FeedbackCommentType.readAndWrite){
		type DataItem = { key: string; data: FoodsFeedbacks; date_updated:  string | null | undefined}
		const data: DataItem[] = []
		if (remoteFoodFeedbacks) {
			for (let i=0; i<remoteFoodFeedbacks.length; i++) {
				const remoteFeedback = remoteFoodFeedbacks[i];
				if(remoteFeedback.id !== ownFoodFeedback?.id){
					if(remoteFeedback.comment){
						data.push({key: remoteFeedback.id, data: remoteFeedback, date_updated: remoteFeedback.date_updated})
					}
				}
			}
		}

		// sort by date_updated
		data.sort((a, b) => {
			let date_a_as_iso_string = a.date_updated;
			let date_b_as_iso_string = b.date_updated;
			if(date_a_as_iso_string && date_b_as_iso_string){
				let date_a = new Date(date_a_as_iso_string);
				let date_b = new Date(date_b_as_iso_string);
				return date_b.getTime() - date_a.getTime();
			} else {
				return 0;
			}
		});

		renderedComments.push(
			<MyGridFlatList data={data} renderItem={(item) => {
				let feedback: FoodsFeedbacks = item.item.data;
				return <FoodFeedbackCommentSingle foodFeedback={feedback} />
			}} />
		)
	}

	return (
		<View style={{width: "100%", paddingTop: 10}}>
			<Heading>{translation_comments}</Heading>
			<View style={{width: "100%", height: 10}} />
			{commentContent}
			{renderedComments}
		</View>
	)

}

export const FoodFeedbackRatingDetails = ({food}: {food: Foods}) => {
	const [appSettings] = useSynchedAppSettings();
	const foods_ratings_amount_display = appSettings?.foods_ratings_amount_display;
	const foods_ratings_average_display = appSettings?.foods_ratings_average_display;

	const translation_average_rating = useTranslation(TranslationKeys.average_rating);
	const translation_amount_rating = useTranslation(TranslationKeys.amount_ratings);


	let ratingAmount = food.rating_amount;
	let ratingAverage = food.rating_average;

	let details = [];

	if(foods_ratings_amount_display && ratingAmount !== null && ratingAmount !== undefined){
		let borderRadiusRight = foods_ratings_average_display ? 0 : undefined

		details.push(
			<MyButton useTransparentBorderColor={true} useOnlyNecessarySpace={true} accessibilityLabel={translation_amount_rating} tooltip={translation_amount_rating} borderRightRadius={borderRadiusRight} text={ratingAmount+""} leftIcon={IconNames.amount_rating_icon} />
		)
	}

	if(foods_ratings_average_display && ratingAverage !== null && ratingAverage !== undefined){
		let borderRadiusLeft = foods_ratings_amount_display ? 0 : undefined

		details.push(
			<MyButton useTransparentBorderColor={true} useOnlyNecessarySpace={true} accessibilityLabel={translation_average_rating} tooltip={translation_average_rating} text={ratingAverage+""} borderLeftRadius={borderRadiusLeft} leftIcon={IconNames.average_icon} />
		)
	}

	return <View style={{
		width: "100%",
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		flexWrap: "wrap",
	}}>
		<View style={{
			paddingTop: 10,
		}}>
			<FoodFeedbackRating food={food} showQuickAction={false}/>
		</View>
		<View style={{
			paddingTop: 10,
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
		}}>
			{details}
		</View>
	</View>
}

export const FoodFeedbackDetails = ({food}: {food: Foods}) => {
	// get app_settings
	const [usedFood, setUsedFood] = useState<Foods>(food);

	const [remoteFoodFeedbacks, setRemoteFoodFeedbacks] = useState<FoodsFeedbacks[] | null | undefined>(undefined);
	const isDemo = useIsDemo();

	async function loadRemoteFoodsFeedbacksForFood(foodId: string): Promise<FoodsFeedbacks[]> {
		let result = await loadFoodsFeedbacksForFoodWithFeedbackLabelsIds(foodId, isDemo);
		return result;
	}

	async function loadData() {
		console.log("loadData")
		// load the labels from the server for the food
		loadRemoteFoodsFeedbacksForFood(food.id)
			.then(setRemoteFoodFeedbacks)
			.catch(console.error);
		loadFood(isDemo, food.id)
			.then(setUsedFood)
			.catch(console.error);
	}

	async function refresh() {
		// load the labels from the server for the food
		await loadData();
	}
	

	useEffect(() => {
		// load the labels from the server for the food
		loadData();
	}, [food.id]);

	return (
		<View style={{
			width: "100%",
		}}>
			<View style={{
				width: "100%",
				flexDirection: "row",
			}}>
				<FoodFeedbackRatingDetails food={usedFood} />
			</View>
			<FoodFeedbacksLabelsComponent food={usedFood} remoteFoodFeedbacks={remoteFoodFeedbacks} refresh={refresh}/>
			<FoodFeedbackCommentDetails food={usedFood} remoteFoodFeedbacks={remoteFoodFeedbacks}/>
		</View>
	)
}

export const FoodInformationDisclaimer = () => {
	const translation_disclaimer = useTranslation(TranslationKeys.food_information_disclaimer);

	const foodsAreaColor = useFoodsAreaColor()

	const [appSettings] = useSynchedAppSettings();
	// person responsible for the information
	const responsible_person_name = appSettings?.food_responsible_organization_name || "Baumgartner Software UG (haftungsbeschränkt)"
	// email of the person responsible
	const responsible_person_webpage = appSettings?.food_responsible_organization_link || "https://baumgartner-software.de"

	// # ISSUE: https://github.com/rocket-meals/rocket-meals/issues/143
	// Guideline 1.4.1 - Safety - Physical Harm
	// All apps with medical and health information should include links to sources for the information. This helps ensure that users are being provided accurate information.
	const responsible_for_information_markdown_link = `[${responsible_person_name}](${responsible_person_webpage})`

	let responsibleAdditionElement = null;
	if(!!responsible_person_name && !!responsible_person_webpage){
		responsibleAdditionElement = <ThemedMarkdown buttonAndLinkColor={foodsAreaColor} markdown={responsible_for_information_markdown_link} />
	}

	return(
		<View>
			<Text italic={true}>{translation_disclaimer}</Text>
			{responsibleAdditionElement}
		</View>
	)
}

const FoodMarkingDetails = ({foodOfferData}: {foodOfferData: Foodoffers}) => {
	const isDebug = useIsDebug()

	const markingIds: string[] = [];
	let foodOfferMarkings = foodOfferData?.markings || [];
	foodOfferMarkings.forEach((marking) => {
		markingIds.push(marking.markings_id);
	});

	let debugMarkings = undefined
	if(isDebug){
		debugMarkings = <View>
			<Text>{JSON.stringify(foodOfferData?.markings, null, 2)}</Text>
		</View>
	}

	return(
		<>
			<MarkingListSelective markingIds={markingIds}/>
			<FoodInformationDisclaimer />
			{debugMarkings}
		</>
	)
}


const FoodNutritionDetails = ({foodOfferData}: {foodOfferData: Foodoffers}) => {
	const nutritionColumns = useBreakPointValue<number>({
		sm: 2,
		md: 2,
		lg: 3,
		xl: 3,
	})

	return(
		<>
			<View style={{ justifyContent: 'space-between' }}>
				<View>
					<NutritionList
						columnAmount={nutritionColumns}
						protein_g={foodOfferData.protein_g}
						fat_g={foodOfferData.fat_g}
						carbohydrate_g={foodOfferData.carbohydrate_g}
						fiber_g={foodOfferData.fiber_g}
						sugar_g={foodOfferData.sugar_g}
						sodium_g={foodOfferData.sodium_g}
						calories_kcal={foodOfferData.calories_kcal}
						saturated_fat_g={foodOfferData.saturated_fat_g}
					/>
				</View>
			</View>
			<FoodInformationDisclaimer />
		</>
	)
}

export default function FoodDetails({ foodOfferId }: { foodOfferId: string }) {
	const [foodOfferData, setFoodOfferData] = useState<Foodoffers>();
	const isDemo = useIsDemo()
	const server = useServerInfo();

	useEffect(() => {
		loadFoodOffer(isDemo, foodOfferId)
			.then(setFoodOfferData)
			.catch(console.error);
	}, [foodOfferId+""]);

	const food = foodOfferData?.food;

	if(foodOfferData && food && typeof food === 'object'){
		return <FoodDetailsWithFoodOfferAndFood foodOfferData={foodOfferData} food={food}/>
	}
}

function FoodDetailsWithFoodOfferAndFood({ foodOfferData, food }: { foodOfferData: Foodoffers, food: Foods }) {
	const translations_nutrition = useTranslation(TranslationKeys.nutrition);
	const translations_markings = useTranslation(TranslationKeys.markings);
	const translations_food_feedbacks = useTranslation(TranslationKeys.food_feedbacks);

	const foodsAreaColor = useFoodsAreaColor();

	// get device height
	const screenHeight = Dimensions.get('window').height;
	const detailsMinHeight = screenHeight / 2

	const quickActions = <View style={{
		width: "100%",
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		flexWrap: "wrap",
	}}>
		<View style={{ flexDirection: "row" }}>
			<FoodFeedbackRating food={food} showQuickAction={false}/>
		</View>
		<View>
			<FoodNotifyButton food={food}/>
		</View>
	</View>

	return(

			<DetailsComponent item={food} heading={
				food.alias
			}
							  subHeadingComponent={quickActions}
							  image={{
								  assetId: food.image,
								  image_url: food.image_remote_url,
							  }}
							  tabs={
								  [
									  {
										  iconName: IconNames.nutrition_icon,
										  color: foodsAreaColor,
										  accessibilityLabel: translations_nutrition,
										  text: translations_nutrition,
										  content: <View style={{
											  width: "100%",
											  minHeight: detailsMinHeight // in order to prevent on small devices the jump up when the content is not large enough
										  }}><FoodNutritionDetails foodOfferData={foodOfferData}/></View>
									  },
									  {
										  iconName: IconNames.eating_habit_icon,
										  color: foodsAreaColor,
										  accessibilityLabel: translations_markings,
										  text: translations_markings,
										  content: <View style={{
											  width: "100%",
											  minHeight: detailsMinHeight // in order to prevent on small devices the jump up when the content is not large enough
										  }}><FoodMarkingDetails foodOfferData={foodOfferData}/></View>
									  },
									  {
										  iconName: IconNames.comment_icon,
										  color: foodsAreaColor,
										  accessibilityLabel: translations_food_feedbacks,
										  text: translations_food_feedbacks,
										  content: <View style={{
											  width: "100%",
											  minHeight: detailsMinHeight // in order to prevent on small devices the jump up when the content is not large enough
										  }}><FoodFeedbackDetails food={food} /></View>
									  },
								  ]
							  }
			/>
	)
}