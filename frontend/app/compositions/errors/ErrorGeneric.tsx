import {Heading, Text, View} from '@/components/Themed';
import {TranslationKeys, useTranslation} from '@/helper/translations/Translation';
import {AnimationThinking} from "@/compositions/animations/AnimationThinking";
import React, {ReactNode} from "react";


interface ErrorGenericProps {
	text?: string,
	color?: string,
	children?: ReactNode;
}
export const ErrorGeneric = ({children,text,...props}: ErrorGenericProps) => {
	const translation_error = useTranslation(TranslationKeys.error);

	return (
		<View style={{width: '100%', justifyContent: 'center', alignItems: 'center', marginTop: 30}}>
			<Heading>{translation_error}</Heading>
			<AnimationThinking color={props.color} />
			<Text>{text}</Text>
			{children}
		</View>
	)
}
