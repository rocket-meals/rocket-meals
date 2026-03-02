import { DimensionValue, Image, Linking, Text, View } from 'react-native';
import React, { useState } from 'react';
import CustomCollapsible from '../CustomCollapsible/CustomCollapsible';
import RedirectButton from '../RedirectButton';
import styles from './styles';
import { CustomMarkdownProps } from './types';
import { myContrastColor } from '@/helper/ColorHelper';
import { useSelector } from 'react-redux';
import { useTheme } from '@/hooks/useTheme';
import { RootState } from '@/redux/reducer';

const CustomMarkdown: React.FC<CustomMarkdownProps> = ({ content, backgroundColor, imageWidth, imageHeight }) => {
	const { theme } = useTheme();
	const { primaryColor, selectedTheme: mode } = useSelector((state: RootState) => state.settings);

	const getContent = () => {
		// Regex patterns for different content types
		const contentPatterns = {
			email: /\[([^\]]+)]\((mailto:[^\)]+)\)/,
			link: /\[([^\]]+)]\((https?:\/\/[^\)]+)\)/,
			image: /!\[([^\]]*)]\(([^)]+)\)/,
			heading: /^#{1,3}\s*(.*)$/,
		};

		if (content) {
			const rawText = content;
			const lines = rawText.split('\n');

			const contrastColor = myContrastColor(backgroundColor || primaryColor, theme, mode === 'dark');
			// Process content into a structured format
			const processContent = (lines: string[]) => {
				const result: any[] = [];
				const stack: Array<{ level: number; items: any[] }> = [{ level: 0, items: result }];
				let currentParagraph: Array<{ text: string; indent: number }> = [];

				const flushTextContent = () => {
					if (currentParagraph.length) {
						const minIndent = Math.min(...currentParagraph.map(item => item.indent));
						const textContent = currentParagraph.map(item => item.text).join('\n');
						stack[stack.length - 1].items.push({
							type: 'text',
							content: textContent,
							indent: Number.isFinite(minIndent) ? minIndent : 0,
						});
						currentParagraph = [];
					}
				};

				for (let i = 0; i < lines.length; i += 1) {
					const line = lines[i];
					const normalizedLine = line.replace(/\t/g, '    ');
					const indentLength = normalizedLine.match(/^\s*/)?.[0].length ?? 0;
					const trimmedLine = line.trim();

					const headingMatch = trimmedLine.match(contentPatterns.heading);
					if (headingMatch) {
						flushTextContent();

						const level = headingMatch[0].match(/#/g)?.length || 1;
						const headerText = headingMatch[1].trim();

						if (level === 1) {
							while (stack.length > 1) {
								stack.pop();
							}

							stack[stack.length - 1].items.push({
								type: 'heading',
								content: headerText,
								level,
							});
							continue;
						}

						while (stack.length > 1 && stack[stack.length - 1].level >= level) {
							stack.pop();
						}

						let startCollapsed = false;
						for (let lookahead = i + 1; lookahead < lines.length; lookahead += 1) {
							const lookLine = lines[lookahead];
							if (lookLine.trim() === '') {
								continue;
							}
							const lookNormalized = lookLine.replace(/\t/g, '    ');
							const lookIndent = lookNormalized.match(/^\s*/)?.[0].length ?? 0;
							startCollapsed = lookIndent > 0;
							break;
						}

						const newSection = {
							type: 'collapsible',
							header: headerText,
							items: [],
							level,
							startCollapsed,
						};

						stack[stack.length - 1].items.push(newSection);
						stack.push({ level, items: newSection.items });
						continue;
					}

					if (trimmedLine === '') {
						flushTextContent();
						stack[stack.length - 1].items.push({ type: 'emptyLine' });
						continue;
					}

					const trimmedForMatch = trimmedLine;

					if (contentPatterns.image.test(trimmedForMatch)) {
						flushTextContent();
						const match = trimmedForMatch.match(contentPatterns.image);
						stack[stack.length - 1].items.push({
							type: 'image',
							altText: match?.[1] || '',
							url: match?.[2] || '',
							indent: indentLength,
						});
						continue;
					}

					if (contentPatterns.email.test(trimmedForMatch)) {
						flushTextContent();
						const match = trimmedForMatch.match(contentPatterns.email);
						stack[stack.length - 1].items.push({
							type: 'email',
							displayText: match?.[1],
							email: match?.[2],
							indent: indentLength,
						});
						continue;
					}

					if (contentPatterns.link.test(trimmedForMatch)) {
						flushTextContent();
						const match = trimmedForMatch.match(contentPatterns.link);
						stack[stack.length - 1].items.push({
							type: 'link',
							displayText: match?.[1],
							url: match?.[2],
							indent: indentLength,
						});
						continue;
					}

					currentParagraph.push({
						text: trimmedLine,
						indent: indentLength,
					});
				}

				flushTextContent();
				return result;
			};

			const calculateMarginLeft = (level: number, indent = 0) => level * 16 + indent * 4;

			// Component for rendering text with proper formatting
			const TextContent = ({ text, level, indent }: { text: string; level: number; indent: number }) => (
				<Text
					style={{
						fontSize: 16,
						fontFamily: 'Poppins_400Regular',
						color: theme.screen.text,
						marginLeft: calculateMarginLeft(level, indent),
						lineHeight: 24,
					}}
				>
					{text}
				</Text>
			);

			// Component for rendering images
			const ImageContent = ({ url, altText, level, indent }: { url: string; altText: string; level: number; indent: number }) => {
				const [error, setError] = useState(false);

				return (
					<View
						style={{
							width: '100%',
							alignItems: 'center',
							marginLeft: calculateMarginLeft(level, indent),
							marginVertical: 10,
							borderRadius: 8,
							overflow: 'hidden',
							marginTop: 20,
						}}
					>
						{error ? (
							<View
								style={{
									borderWidth: 1,
									borderColor: theme.screen.text,
									justifyContent: 'center',
									alignItems: 'center',
									padding: 10,
								}}
							>
								<Text
									style={{
										fontSize: 12,
										color: theme.screen.text,
										fontFamily: 'Poppins_400Regular',
										textAlign: 'center',
										fontStyle: 'italic',
									}}
								>
									{altText}
								</Text>
							</View>
						) : (
							<View
								style={{
									width: (imageWidth ? imageWidth : '100%') as DimensionValue,
									height: (imageHeight ? imageHeight : 400) as DimensionValue,
									justifyContent: 'center',
									alignItems: 'center',
									padding: 10,
								}}
							>
								<Image
									source={{ uri: url }}
									style={{
										width: (imageWidth ? imageWidth : '100%') as DimensionValue,
										height: (imageHeight ? imageHeight : 400) as DimensionValue,
										resizeMode: 'cover',
									}}
									onError={() => setError(true)}
								/>
							</View>
						)}
					</View>
				);
			};

			// Main renderer for content items
			const renderContentItem = (item: any, level: number, index: number) => {
				switch (item.type) {
					case 'heading':
						return (
							<Text
								key={`heading-${level}-${index}`}
								style={{
									fontSize: 24,
									fontFamily: 'Poppins_600SemiBold',
									color: theme.screen.text,
									marginTop: level === 0 ? 0 : 12,
									marginBottom: 12,
									marginLeft: calculateMarginLeft(level, 0),
								}}
							>
								{item.content}
							</Text>
						);

					case 'emptyLine':
						return <View key={`empty-${level}-${index}`} style={{ height: 16 }} />;

					case 'text':
						return <TextContent key={`text-${level}-${index}`} text={item.content} level={level} indent={item.indent || 0} />;

					case 'email':
						return (
							<View key={`email-${level}-${index}`} style={{ marginLeft: calculateMarginLeft(level, item.indent || 0), marginBottom: 10 }}>
								<RedirectButton type="email" label={item.displayText} onClick={() => Linking.openURL(`mailto:${item.email}`)} backgroundColor={backgroundColor || ''} color={contrastColor} />
							</View>
						);

					case 'link':
						return (
							<View key={`link-${level}-${index}`} style={{ marginLeft: calculateMarginLeft(level, item.indent || 0), marginBottom: 10 }}>
								<RedirectButton type="link" label={item.displayText} onClick={() => Linking.openURL(item.url)} backgroundColor={backgroundColor || ''} color={contrastColor} />
							</View>
						);

					case 'image':
						return <ImageContent key={`image-${level}-${index}`} url={item.url} altText={item.altText} level={level} indent={item.indent || 0} />;

					case 'collapsible':
						return (
							<View key={`collapsible-${level}-${index}`} style={{ marginTop: level > 0 ? 5 : 10 }}>
								<CustomCollapsible headerText={item.header} customColor={backgroundColor || ''} startCollapsed={item.startCollapsed}>
									{renderContent(item.items, level + 1)}
								</CustomCollapsible>
							</View>
						);

					default:
						return null;
				}
			};

			// Recursive content renderer
			const renderContent = (items: any[], level = 0) => {
				return items.map((item, index) => renderContentItem(item, level, index));
			};

			const hierarchicalContent = processContent(lines);
			return <View style={{ paddingBottom: 20 }}>{renderContent(hierarchicalContent)}</View>;
		}

		return null;
	};
	return <View style={styles.container}>{getContent()}</View>;
};

export default CustomMarkdown;
