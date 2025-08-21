import { DimensionValue, Linking, Text, View } from 'react-native';
import React, { useState } from 'react';
import CustomCollapsible from '../CustomCollapsible/CustomCollapsible';
import RedirectButton from '../RedirectButton';
import { Image } from 'react-native';
import styles from './styles';
import { CustomMarkdownProps } from './types';
import { myContrastColor } from '@/helper/colorHelper';
import { useSelector } from 'react-redux';
import { useTheme } from '@/hooks/useTheme';
import { RootState } from '@/redux/reducer';

const CustomMarkdown: React.FC<CustomMarkdownProps> = ({
	content,
	backgroundColor,
	imageWidth,
	imageHeight,
}) => {
	const { theme } = useTheme();
	const { primaryColor, selectedTheme: mode } = useSelector(
		(state: RootState) => state.settings
	);

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
			const lines = rawText
				.split('\n')
				.filter((line: string) => line.trim() !== '');

			const contrastColor = myContrastColor(
				backgroundColor || primaryColor,
				theme,
				mode === 'dark'
			);
			// Process content into a structured format
			const processContent = (lines: string[]) => {
				const result: any[] = [];
				const stack = [{ level: 0, items: result }];
				let currentText = '';

				const flushTextContent = () => {
					if (currentText.trim()) {
						stack[stack.length - 1].items.push({
							type: 'text',
							content: currentText.trim(),
						});
						currentText = '';
					}
				};

				lines.forEach(line => {
					// Check for headings first
					const headingMatch = line.match(contentPatterns.heading);
					if (headingMatch) {
						flushTextContent();

						const level = headingMatch[0].match(/#/g)?.length || 1;
						const headerText = headingMatch[1].trim();

						// Close previous sections at this level or higher
						while (stack.length > 1 && stack[stack.length - 1].level >= level) {
							stack.pop();
						}

						const newSection = {
							type: 'collapsible',
							header: headerText,
							items: [],
							level,
						};

						stack[stack.length - 1].items.push(newSection);
						stack.push({ level, items: newSection.items });
						return;
					}

					// Check for other content types
					if (contentPatterns.image.test(line)) {
						flushTextContent();
						const match = line.match(contentPatterns.image);
						stack[stack.length - 1].items.push({
							type: 'image',
							altText: match?.[1] || '',
							url: match?.[2] || '',
						});
					} else if (contentPatterns.email.test(line)) {
						flushTextContent();
						const match = line.match(contentPatterns.email);
						stack[stack.length - 1].items.push({
							type: 'email',
							displayText: match?.[1],
							email: match?.[2],
						});
					} else if (contentPatterns.link.test(line)) {
						flushTextContent();
						const match = line.match(contentPatterns.link);
						stack[stack.length - 1].items.push({
							type: 'link',
							displayText: match?.[1],
							url: match?.[2],
						});
					} else {
						currentText += `${line}\n`;
					}
				});

				flushTextContent();
				return result;
			};

			// Component for rendering text with proper formatting
			const TextContent = ({ text, level }: { text: string; level: number }) => (
				<Text
					style={{
						fontSize: 16,
						fontFamily: 'Poppins_400Regular',
						color: theme.screen.text,
						marginLeft: level * 16,
						lineHeight: 24,
					}}
				>
					{text}
				</Text>
			);

			// Component for rendering images
			const ImageContent = ({
				url,
				altText,
				level,
			}: {
				url: string;
				altText: string;
				level: number;
			}) => {
				const [error, setError] = useState(false);

				return (
					<View
						style={{
							width: '100%',
							alignItems: 'center',
							marginLeft: level * 16,
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
					case 'text':
						return (
							<TextContent
								key={`text-${level}-${index}`}
								text={item.content}
								level={level}
							/>
						);

					case 'email':
						return (
							<View
								key={`email-${level}-${index}`}
								style={{ marginLeft: level * 16, marginBottom: 10 }}
							>
								<RedirectButton
									type="email"
									label={item.displayText}
									onClick={() => Linking.openURL(`mailto:${item.email}`)}
									backgroundColor={backgroundColor || ''}
									color={contrastColor}
								/>
							</View>
						);

					case 'link':
						return (
							<View
								key={`link-${level}-${index}`}
								style={{ marginLeft: level * 16, marginBottom: 10 }}
							>
								<RedirectButton
									type="link"
									label={item.displayText}
									onClick={() => Linking.openURL(item.url)}
									backgroundColor={backgroundColor || ''}
									color={contrastColor}
								/>
							</View>
						);

					case 'image':
						return (
							<ImageContent
								key={`image-${level}-${index}`}
								url={item.url}
								altText={item.altText}
								level={level}
							/>
						);

					case 'collapsible':
						return (
							<View
								key={`collapsible-${level}-${index}`}
								style={{ marginTop: level > 0 ? 5 : 10 }}
							>
								<CustomCollapsible
									headerText={item.header}
									customColor={backgroundColor || ''}
								>
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
			return (
				<View style={{ paddingBottom: 20 }}>
					{renderContent(hierarchicalContent)}
				</View>
			);
		}

		return null;
	};
	return <View style={styles.container}>{getContent()}</View>;
};

export default CustomMarkdown;
