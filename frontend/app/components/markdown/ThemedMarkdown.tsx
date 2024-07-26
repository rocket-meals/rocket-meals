import React, {FunctionComponent} from 'react';
import RenderHtml from 'react-native-render-html';
import {getFontSizeInPixelBySize, Text, useTextContrastColor, View} from '@/components/Themed';

import {useWindowDimensions} from 'react-native';

import MarkdownIt from 'markdown-it';
import {IconNames} from "@/constants/IconNames";
import {MyButton} from "@/components/buttons/MyButton";
import {
	CustomBlockRenderer,
	CustomMixedRenderer,
	CustomTextualRenderer
} from "react-native-render-html/src/render/render-types";

export const MARKDOWN_EXAMPLE = `## Markdown Example

Here comes some more ***important*** information in a rich text format. Lorem markdownum iura! Unda quid, quid iuro viscera nec terras undis illa tectis
belloque vigil et educere Boote. Cum ubi aut bracchiaque quod: Iuppiter quaque.
Haec tuta libratus perstant levat stant imperat nitore abductas captat iacet
dignissima virgine posse coniectum suspiria, scilicet caelestia, cape.

## Links
[Rocket Meals](https://rocket-meals.de)
`

export const replaceLinebreaks = (sourceContent: string) => {
	const option_find_linebreaks = true;
	if (option_find_linebreaks) {
		sourceContent = sourceContent.replaceAll('<br/>', '\n');
		sourceContent = sourceContent.replaceAll('</br>', '\n');
		sourceContent = sourceContent.replaceAll('<br>', '\n');
		sourceContent = sourceContent.replaceAll('<p/>', '\n');
		sourceContent = sourceContent.replaceAll('</p>', '\n');
		sourceContent = sourceContent.replaceAll('<p>', '\n');
	}
	return sourceContent;
}

interface AppState {
    darkmode?: boolean,
    hideSkeleton?: boolean,
    debug?: boolean,
    markdown?: string,
    color?: string,
	buttonAndLinkColor?: string,
    children?: string
}
export const ThemedMarkdown: FunctionComponent<AppState> = (props) => {
	let sourceContent: string = props?.markdown || props.children as string;
	const buttonAndLinkColor = props.buttonAndLinkColor

	const themedTextColor = useTextContrastColor();
	const textColor = props?.color || themedTextColor

	if (sourceContent===undefined && !props.hideSkeleton) {
		return <Text>{'Loading'}</Text>
	}

	/**
    let fontSize = theme["fontSizes"]["lg"]
    const emToPixel = (em: number) => {
        return em * fontSize;
    }
        */

	/**
    const fontWeightNormal = theme["fontWeights"]?.normal;
    const lineHeightNormalInEm = theme["lineHeights"]?.lg;
    const lineHeightNormal = emToPixel(parseFloat(lineHeightNormalInEm)) || 0;
        */

	const md = new MarkdownIt();

	const option_find_linebreaks = true;
	if (option_find_linebreaks) {
		sourceContent = replaceLinebreaks(sourceContent);
	}


	const result = md.render(sourceContent);

	const source = {
		html: result || ''
	};

	const { width } = useWindowDimensions();

	const tagsStyles = {
		'blockquote': {
			fontStyle: 'italic',
		},
		'td': {
			borderColor: 'gray',
			borderWidth: 1,
		},
		'th': {
			borderColor: 'gray',
			borderWidth: 1,
		},
		'a': {
			color: textColor
		}
	}

	const fontSize = getFontSizeInPixelBySize('md');

	const defaultTextProps = {
		selectable: true,
		color: textColor,
		fontSize: fontSize+'px',
		fontStyle: 'normal',
		//fontWeight: fontWeightNormal+"px", // as string because of iOS: NSNumber cannot be converted NSString
		//lineHeight: lineHeightNormal+"px", // as string because of iOS: NSNumber cannot be converted NSString
	};

	const customRenderers: Record<
		string,
		CustomBlockRenderer | CustomTextualRenderer | CustomMixedRenderer
	> = {
		"a": (props: any) => {

			const {href, ...restProps} = props.tnode.attributes;
			// get the "data" attribute from the node
			const {data} = props.tnode;
			const text = data || props.children[0]?.data;
			let icon = IconNames.open_link_icon
			if (href?.startsWith('tel:')) {
				icon = IconNames.phone_icon
			} else if (href?.startsWith('mailto:')) {
				icon = IconNames.mail_icon
			}
			// Return default renderer or your custom component
			return <View>
				<MyButton backgroundColor={buttonAndLinkColor} accessibilityLabel={text} text={text} href={href} useOnlyNecessarySpace={true} leftIcon={icon} leftIconColoredBox={true} />
			</View>

			/**
			const { href } = htmlAttribs;
			if (href.startsWith('tel:')) {
				// Handle phone links
				return (
					<TouchableOpacity onPress={() => Linking.openURL(href)}>
						<Icon name={"phone"} />
						<Text style={[{ color: textColor }]}>{children}</Text>
					</TouchableOpacity>
				);
			} else if (href.startsWith('mailto:')) {
				// Handle mail links
				return (
					<TouchableOpacity onPress={() => Linking.openURL(href)}>
						<MailIcon />
						<Text style={[{ color: textColor }]}>{children}</Text>
					</TouchableOpacity>
				);
			} else {
				// Handle regular links
				return (
					<TouchableOpacity onPress={() => Linking.openURL(href)} >
						<ExternalLinkIcon />
						<Text style={[{ color: textColor }]}>{children}</Text>
					</TouchableOpacity>
				);
			}
			*/
		}
	};

	if (props?.debug) {
		return (
		// @ts-ignore
			<Text selectable={true}>
				{result}
			</Text>
		)
	} else {
		return (
			<View>
				<RenderHtml
					contentWidth={width}
					// @ts-ignore
					baseStyle={defaultTextProps}
					renderers={customRenderers}
					defaultTextProps={defaultTextProps}
					key={source+""+buttonAndLinkColor}
					source={source}
				/>
			</View>
		)
	}
}
