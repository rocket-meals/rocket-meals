import React, {FunctionComponent, useState} from 'react';
import {getFontSizeInPixelBySize, Icon, Text, useTextContrastColor, View} from '@/components/Themed';
import {Pressable, TouchableOpacity, useWindowDimensions} from 'react-native';
import MarkdownIt from 'markdown-it';
import {IconNames} from "@/constants/IconNames";
import {replaceLinebreaks, ThemedMarkdown} from "@/components/markdown/ThemedMarkdown";
import {useProjectColor, useProjectColorContrast} from "@/states/ProjectInfo";
import {MyButtonCustomContentPadder} from "@/components/buttons/MyButtonCustom";
import {MyButton} from "@/components/buttons/MyButton";
import {useMyContrastColor} from "@/helper/color/MyContrastColor";

const BORDER_RADIUS = 8;

interface AppState {
	darkmode?: boolean,
	hideSkeleton?: boolean,
	debug?: boolean,
	markdown?: string,
	color?: string,
	buttonAndLinkColor?: string,
	children?: string
}

const CollapsibleCard: FunctionComponent<{ titleSource: string, children: React.ReactNode, initiallyOpen: boolean, buttonAndLinkColor?: string }> = ({buttonAndLinkColor, titleSource, initiallyOpen, children}) => {
	const [collapsed, setCollapsed] = useState(!initiallyOpen);
	const toggleCollapse = () => setCollapsed(!collapsed);
	const iconLeft = collapsed ? IconNames.expand_icon : IconNames.collapse_icon;

	const projectColor = useProjectColor()

	let outerBorderColor = buttonAndLinkColor || projectColor;
	const contrastOuterBorderColor = useMyContrastColor(outerBorderColor);

	return (
		<View style={{marginVertical: 10, borderWidth: 1, borderColor: outerBorderColor, borderRadius: BORDER_RADIUS, overflow: "hidden"}}>
			<MyButton backgroundColor={buttonAndLinkColor} leftIconColoredBox={true} leftIcon={iconLeft} isActive={!collapsed} onPress={toggleCollapse} accessibilityLabel={""} renderedText={
				<MyButtonCustomContentPadder>
					<ThemedMarkdown buttonAndLinkColor={buttonAndLinkColor} markdown={titleSource} color={contrastOuterBorderColor} />
				</MyButtonCustomContentPadder>
			} />
			{!collapsed && <View style={{padding: 10}}>{children}</View>}
		</View>
	);
};

type TokenOrSection = { token: any, section: { titleTokens: any[], contentTokenOrSections: TokenOrSection[] } | undefined };

const extractTokenOrSections = (md: MarkdownIt, content: string): TokenOrSection[] => {
	let tokens = md.parse(content, {});
	let tokenOrSections = extractSectionsFromTokens(tokens, 1);
	return tokenOrSections
};


const extractSectionsFromTokens = (tokens: any[], level: number): TokenOrSection[] => {
	/**
	 * Structure: TokenOrSection[] =
	 * [
	 *     {
	 *         token: token
	 *     },
	 *     {
	 *         section: {
	 *         		titleTokens: [],
	 *         		contentTokenOrSections: [],
	 *         }
	 *     }
	 * ]
	 */
	let result: TokenOrSection[] = [];
	let titleTokens = [];
	let headingOpen = false;
	let headingJustClosed = false;
	let possibleSection = false;
	let possibleSectionTokens = [];

	for(let i = 0; i < tokens.length; i++) {
		let resetSection = false;
		let token = tokens[i];
		if (token.type === 'heading_open') {
			headingOpen = true;
			headingJustClosed = false;
			possibleSection = true;
			titleTokens = [];
			possibleSectionTokens = [];
		}
		if (headingOpen) {
			if (token.type === 'inline') {
				titleTokens.push(token);
			}
		}
		if (headingJustClosed) {
			headingJustClosed = false;
			// code block is just an intention to create a new section
			// for example:
			// # Title
			// 		This is a code block
			//
			if (token.type === 'code_block') {
				// add all tokens from possibleSectionTokens to the section
				let contentForSection = token.content;
				let md = new MarkdownIt();
				let tokensForSection = md.parse(contentForSection, {});

				let section = {
					titleTokens: titleTokens,
					contentTokenOrSections: extractSectionsFromTokens(tokensForSection, level + 1)
				};
				result.push({
					token: undefined,
					section: section
				});
				possibleSectionTokens = [];
				resetSection = true;
			} else {
				// add all tokens from possibleSectionTokens to the section

				for(let i = 0; i < possibleSectionTokens.length; i++) {
					let token = possibleSectionTokens[i];
					result.push({
						token: token,
						section: undefined
					});
				}
				possibleSection = false;
			}
		}
		if (token.type === 'heading_close') {
			headingOpen = false;
			headingJustClosed = true;
		}
		if (possibleSection) {
			possibleSectionTokens.push(token);
		} else {
			result.push({
				token: token,
				section: undefined
			});
		}
		if(resetSection) {
			possibleSection = false;
		}
	}
	return result;
};

const getSourceFromTokens = (tokens: any[] | undefined): string => {
	let source = "";
	if(!!tokens) {
		for(let i = 0; i < tokens.length; i++) {
			let token = tokens[i];
			if(token) {
				// if tag is p, br opening then add \n
				if(token.tag === 'p' || token.tag === 'br') {
					source += '\n';
				}
				source += token.content;
				// if tag is p, br closing then add \n
				if(token.tag === 'p' || token.tag === 'br') {
					source += '\n';
				}
				//source+= ' (((' + token.type + '))) ';
			}
		}
	}
	return source;
}


const renderTokenOrSections = (tokenOrSections: TokenOrSection[], width: number, defaultTextProps: any, initiallyOpenWhenOnlyOneSection: boolean, buttonAndLinkColor?: string) => {
	let output = [];
	let lastTokens = [];
	let sectionCount = 0;
	for(let i = 0; i < tokenOrSections.length; i++) {
		let tokenOrSection = tokenOrSections[i];
		if(tokenOrSection.section) {
			sectionCount++;
		}
	}
	let firstSection = true;
	let moreThanOneSection = sectionCount > 1;

	for(let i = 0; i < tokenOrSections.length; i++) {
		let tokenOrSection = tokenOrSections[i];
		if(tokenOrSection.token) {
			lastTokens.push(tokenOrSection.token);
		} else {
			// render last tokens
			if(lastTokens.length > 0) {
				let source = getSourceFromTokens(lastTokens);

				output.push(
					<ThemedMarkdown buttonAndLinkColor={buttonAndLinkColor} key={i} markdown={source} />
				);
				lastTokens = [];
			}

			let titleSource: string = tokenOrSection.section?.titleTokens.map((token: any) => token.content).join('') || '';

			let initiallyOpenForThisSection = initiallyOpenWhenOnlyOneSection && firstSection && !moreThanOneSection;
			let subSectionsInitialOpen = false

			output.push(
				<CollapsibleCard buttonAndLinkColor={buttonAndLinkColor} key={i} titleSource={titleSource} initiallyOpen={initiallyOpenForThisSection}>
					{renderTokenOrSections(tokenOrSection.section?.contentTokenOrSections || [], width, defaultTextProps, subSectionsInitialOpen, buttonAndLinkColor)}
				</CollapsibleCard>
			);

			firstSection = false;
		}
	}

	// render last tokens
	if(lastTokens.length > 0) {
		let source = getSourceFromTokens(lastTokens);

		output.push(
			<ThemedMarkdown buttonAndLinkColor={buttonAndLinkColor} key={tokenOrSections.length} markdown={source} />
		);
		//lastTokens = [];
	}

	return output;
};

export const ThemedMarkdownWithCards: FunctionComponent<AppState> = (props) => {
	let sourceContent: string = props?.markdown || props.children as string;
	const themedTextColor = useTextContrastColor();
	const textColor = props?.color || themedTextColor;
	const buttonAndLinkColor = props.buttonAndLinkColor;

	if (sourceContent === undefined && !props.hideSkeleton) {
		return <Text>{'Loading'}</Text>
	}

	const md = new MarkdownIt();
	sourceContent = replaceLinebreaks(sourceContent);
	const tokenOrSections = extractTokenOrSections(md, sourceContent);

	const {width} = useWindowDimensions();
	const fontSize = getFontSizeInPixelBySize('md');

	const defaultTextProps = {
		selectable: true,
		color: textColor,
		fontSize: fontSize + 'px',
		fontStyle: 'normal',
	};

	if (props?.debug) {
		return (
			<Text selectable={true}>
				{JSON.stringify(tokenOrSections, null, 2)}
			</Text>
		)
	} else {
		return (
			<View>
				{renderTokenOrSections(tokenOrSections, width, defaultTextProps, true, buttonAndLinkColor)}
			</View>
		)
	}
}
