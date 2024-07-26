import {Icon, Text, View} from '@/components/Themed';
import {MyGridFlatList} from '@/components/grid/MyGridFlatList';
import {TranslationKeys, useTranslations} from '@/helper/translations/Translation';
import {IconNames} from '@/constants/IconNames';

export type NutritionListProps = {
	columnAmount?: number;
  calories_kcal?: number | null;
  carbohydrate_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
  protein_g?: number | null;
  saturated_fat_g?: number | null;
  sodium_g?: number | null;
  sugar_g?: number | null;
}

export function NutritionListElement(props: {renderedIcon: any, label: string, value?: number | null}) {
	return (
		<View style={{ flex: 1, flexDirection: 'row', paddingBottom: 12 }}>
			<View style={{ flexDirection: 'column' }}>
				{props.renderedIcon}
			</View>
			<View style={{ marginLeft: 4, flex: 1}}>
				<Text>
					{props.value ? props.value + 'g' : 'N/A'}
				</Text>
				<View style={{
					flex: 1
				}}>
					<Text>
						{props.label}
					</Text>
				</View>
			</View>
		</View>
	);
}

export default function NutritionList(props: NutritionListProps) {
	const [
		translation_calories,
		translation_protein,
		translation_fat,
		translation_carbohydrate,
		translation_fiber,
		translation_sugar,
		translation_sodium,
		translation_saturated_fat
	] = useTranslations([
		TranslationKeys.nutrition_calories,
		TranslationKeys.nutrition_protein,
		TranslationKeys.nutrition_fat,
		TranslationKeys.nutrition_carbohydrate,
		TranslationKeys.nutrition_fiber,
		TranslationKeys.nutrition_sugar,
		TranslationKeys.nutrition_sodium,
		TranslationKeys.nutrition_saturated_fat
	])

	const data: {
    key: string;
    data: {icon: string, label: string, value?: number | null}
  }[] = [
  	{ key: 'calories', data: {icon: IconNames.nutrition_calories_icon, label: translation_calories, value: props.calories_kcal} },
  	{ key: 'carbohydrates', data: {icon: IconNames.nutrition_carbohydrate_icon, label: translation_carbohydrate, value: props.carbohydrate_g} },
  	{ key: 'fiber', data: {icon: IconNames.nutrition_fiber_icon, label: translation_fiber, value: props.fiber_g} },
  	{ key: 'protein', data: {icon: IconNames.nutrition_protein_icon, label: translation_protein, value: props.protein_g} },
  	{ key: 'sodium', data: {icon: IconNames.nutirtion_sodium_icon, label: translation_sodium, value: props.sodium_g} },
  	{ key: 'fat', data: {icon: IconNames.nutrition_fat_icon, label: translation_fat, value: props.fat_g} },
  	{ key: 'sugar', data: {icon: IconNames.nutrition_sugar_icon, label: translation_sugar, value: props.sugar_g} },
  	{ key: 'saturatedFat', data: {icon: IconNames.nutrition_saturated_fat_icon, label: translation_saturated_fat, value: props.saturated_fat_g} },
  ]

	const amountColumns = props.columnAmount || 2;

	return (
		<View style={{
			width: "100%",
		}}>
			<MyGridFlatList amountColumns={amountColumns}
				data={data}
				renderItem={(item) => {
					let renderedIcon = <Icon name={item.item.data.icon}/>
					return <NutritionListElement renderedIcon={renderedIcon} {...item.item.data}/>
				}}
			/>
		</View>
	)
}