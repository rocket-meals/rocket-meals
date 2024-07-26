import React, {FunctionComponent, useState} from 'react';
import {SettingsRow, SettingsRowProps} from './SettingsRow';
import {TranslationKeys, useTranslation} from '@/helper/translations/Translation';
import {View} from '@/components/Themed';
import {MyButton} from '@/components/buttons/MyButton';

interface AppState {
    value: boolean | undefined | null,
    accessibilityLabel: string,
    labelLeft: string,
	onSetState?: (like: boolean | undefined) => void,
	amount_likes?: number | null,
	renderRightContentWrapper?: (rightContent: any) => any,
	amount_dislikes?: number | null,
	color?: string,
    debug?: boolean,
    disabled?: boolean
}
export const SettingsRowTriStateLikeDislike: FunctionComponent<AppState & SettingsRowProps> = ({accessibilityLabel, labelLeft,...props}) => {
	const debug = props?.debug

	const [isCheckedRaw, setIsChecked] = useState(props?.value)

	const isLikeButtonActive = isCheckedRaw===true;
	const isDislikeButtonActive = isCheckedRaw===false;
	const isStatusUndefined = isCheckedRaw===undefined;

	let isChecked: boolean | undefined = false;
	if (isCheckedRaw===true) {
		isChecked = true
	} else if (isCheckedRaw===false) {
		isChecked = false;
	} else {
		isChecked = undefined
	}

	const translation_i_like_that = useTranslation(TranslationKeys.i_like_that);
	const translation_i_dislike_that = useTranslation(TranslationKeys.i_dislike_that);
	const translation_active = useTranslation(TranslationKeys.active);
	const translation_inactive = useTranslation(TranslationKeys.inactive);

	function onPress(likeButton: boolean) {
		let nextValue: boolean | undefined = !isChecked;

		if (likeButton) {
			if (isLikeButtonActive) {
				nextValue = undefined;
			} else {
				nextValue = true;
			}
		} else {
			if (isDislikeButtonActive) {
				nextValue = undefined
			} else {
				nextValue = false
			}
		}

		setIsChecked(nextValue)
		if (props.onSetState) {
			props.onSetState(nextValue);
		}
	}

	const amount_likes_as_string: string | undefined = props?.amount_likes ? props?.amount_likes+"" : undefined
	const amount_dislikes_as_string: string | undefined = props?.amount_dislikes ? props?.amount_dislikes+"" : undefined

	let accessibilityStateLike = isLikeButtonActive ? translation_active : translation_inactive
	let accessibilityLabel_i_like_that = translation_i_like_that + ": "+accessibilityStateLike+": "+accessibilityLabel

	let accessibilityStateDislike = isDislikeButtonActive ? translation_active : translation_inactive
	let accessibilityLabel_i_dislike_that = translation_i_dislike_that + ": "+accessibilityStateDislike+": "+accessibilityLabel

	let rightButtons: any = <View style={{
		paddingRight: 0,
		justifyContent: 'center',
		alignItems: 'center',
		flexDirection: 'row'
	}}>
		<MyButton
				backgroundColor={props.color}
				  disabled={props.disabled}
			      leftIcon={'thumb-up'}
				  isActive={isLikeButtonActive}
				  borderRightRadius={0}
				  useOnlyNecessarySpace={true}
				  useTransparentBorderColor={false}
				  accessibilityLabel={accessibilityLabel_i_like_that}
				  tooltip={accessibilityLabel_i_like_that}
				  text={amount_likes_as_string}
				  onPress={() => {
					  onPress(true)
				  }}
		/>
		<MyButton
			backgroundColor={props.color}
			      disabled={props.disabled}
			      leftIcon={'thumb-down'}
				  isActive={isDislikeButtonActive}
				  borderLeftRadius={0}
				  useOnlyNecessarySpace={true}
				  useTransparentBorderColor={false}
				  text={amount_dislikes_as_string}
				  accessibilityLabel={accessibilityLabel_i_dislike_that}
				  tooltip={accessibilityLabel_i_dislike_that}
				  onPress={() => {
					  onPress(false)
				  }}
		/>
	</View>

	if(props.renderRightContentWrapper){
		rightButtons = props.renderRightContentWrapper(rightButtons)
	}

	const rightContent: any = rightButtons

	return (
		<SettingsRow labelLeft={labelLeft} accessibilityLabel={accessibilityLabel} {...props} rightContent={rightContent} />
	)
}
