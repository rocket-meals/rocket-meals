import {View, Text, Icon} from '@/components/Themed';
import {getDirectusTranslation, TranslationEntry} from '@/helper/translations/DirectusTranslationUseFunction';
import {useProfileLanguageCode, useSynchedProfileMarking, useSynchedProfileMarkingsDict} from '@/states/SynchedProfile';
import React, {useEffect, useMemo} from 'react';
import {SettingsRowTriStateLikeDislike} from '@/components/settings/SettingsRowTriStateLikeDislike';
import {TranslationKeys, useTranslation} from "@/helper/translations/Translation";
import {Markings} from "@/helper/database/databaseTypes/types";
import {useSynchedMarkingsDict} from "@/states/SynchedMarkings";
import DirectusImage from "@/components/project/DirectusImage";
import DirectusImageOrIconComponent from "@/components/image/DirectusImageOrIconComponent";
import {useFoodsAreaColor} from "@/states/SynchedAppSettings";

export default function MarkingListItem({ markingId }: { markingId: string }) {
	// Memoize the MarkingListItemReal component
	const memoizedComponent = useMemo(() => {
		// This will only re-render if `markingId` changes
		return <MarkingListItemReal markingId={markingId} />;
	}, [markingId]); // Dependency array, re-render the component when `markingId` changes

	return memoizedComponent;
}

export function getMarkingName(marking: Markings, languageCode: string): string {
	const translations = marking.translations as TranslationEntry[]
	let name = getDirectusTranslation(languageCode, translations, 'name') || marking.alias || marking.id;
	let finalName = name
	if(marking.external_identifier){
		finalName +=  " (" + marking.external_identifier + ")";
	}
	return finalName;
}

function MarkingListItemReal({ markingId }: { markingId: string}) {
	const [markingsDict, setMarkingsDict] = useSynchedMarkingsDict();
	const marking: Markings | undefined | null = markingsDict?.[markingId];
	const [status, setProfileMarking, removeProfileMarking] = useSynchedProfileMarking(markingId)
	const [languageCode, setLanguageCode] = useProfileLanguageCode()
	let statusSet = status === true || status === false;
	const likes = statusSet ? !status : undefined;
	const translation_marking = useTranslation(TranslationKeys.markings);

	const foodsAreaColor = useFoodsAreaColor();

	return useMemo(() => {

		console.log("Rendering MarkingListItemReal", markingId, status)

		if(!marking){
			return null;
		}

		const translated_name = getMarkingName(marking, languageCode);
		const text = translated_name || marking.alias || marking.id;
		const accessibilityLabel = translation_marking+": "+text;

		let iconLeftCustom = <DirectusImageOrIconComponent resource={marking} />

		const onPress = (like: boolean | undefined) => {
			const removeMarking = like === undefined;
			if(removeMarking){
				removeProfileMarking()
			} else {
				const dislikes = like === false;
				setProfileMarking(dislikes)
			}
		}

		return(
			<View key={marking.id}>
				<SettingsRowTriStateLikeDislike color={foodsAreaColor} iconLeftCustom={iconLeftCustom} onSetState={onPress} accessibilityLabel={accessibilityLabel} labelLeft={text} value={likes}/>
			</View>
		)
	}, [status, translation_marking, languageCode])


}