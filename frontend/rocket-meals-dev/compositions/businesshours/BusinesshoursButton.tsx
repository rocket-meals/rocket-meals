import React, {FunctionComponent} from 'react';
import {IconNames} from '@/constants/IconNames';
import {MyButton} from '@/components/buttons/MyButton';
import {Businesshours} from '@/helper/database/databaseTypes/types';
import {TranslationKeys, useTranslation} from '@/helper/translations/Translation';
import {MyScrollView} from "@/components/scrollview/MyScrollView";
import {BusinesshoursTable} from "@/compositions/businesshours/BusinesshoursTable";
import {useModalGlobalContext} from "@/components/rootLayout/RootThemeProvider";
import {Heading, View} from "@/components/Themed";

interface AppState {
	businesshours?: Businesshours[] | undefined,
	foodservicehours?: Businesshours[] | undefined,
}
export const BusinesshoursButton: FunctionComponent<AppState> = ({businesshours, foodservicehours, ...props}) => {
	const translation_businesshours = useTranslation(TranslationKeys.businesshours)
	const translation_foodservicehours = useTranslation(TranslationKeys.foodservicehours)

	const [modalConfig, setModalConfig] = useModalGlobalContext();

	const accessibilityLabel = translation_businesshours;
	const tooltip = accessibilityLabel
	const title = translation_businesshours;

	let businesshoursInformation: any = undefined
	if(businesshours){
		businesshoursInformation = <>
			<View style={{width: '100%', paddingLeft: 20, paddingRight: 20}}>
				<Heading>{translation_businesshours}</Heading>
			</View>
			<BusinesshoursTable businesshours={businesshours} />
		</>
	}

	let foodservicehoursInformation: any = undefined
	if(businesshours){
		foodservicehoursInformation = <>
			<View style={{width: '100%', paddingLeft: 20, paddingRight: 20}}>
				<Heading>{translation_foodservicehours}</Heading>
			</View>
			<BusinesshoursTable businesshours={foodservicehours} />
		</>
	}

	const onPress = () => {
		setModalConfig({
			title: title,
			accessibilityLabel: accessibilityLabel,
			label: translation_businesshours,
			key: 'businesshours',
			renderAsContentInsteadItems: (key: string, hide: () => void) => {
				return(
					<MyScrollView>
						{businesshoursInformation}
						<View style={{height: 20}} />
						{foodservicehoursInformation}
					</MyScrollView>
				)
			}
		})
	}

	return (
		<MyButton
			useOnlyNecessarySpace={true}
			tooltip={tooltip}
			accessibilityLabel={accessibilityLabel}
			useTransparentBackgroundColor={true}
			useTransparentBorderColor={true}
			leftIcon={IconNames.businesshours_icon}
			{...props}
			onPress={onPress}
		/>
	)
}
