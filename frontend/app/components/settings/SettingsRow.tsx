import React, {FunctionComponent, useState} from 'react';
import {Icon, Text, View, useTextContrastColor, useViewBackgroundColor} from '@/components/Themed';
import {ActionsheetItem, ActionsheetItemText, Tooltip, TooltipContent, TooltipText} from '@gluestack-ui/themed';
import {AccessibilityRole, Pressable, TouchableOpacity, ViewStyle} from 'react-native';
import {useLighterOrDarkerColorForSelection, useMyContrastColor} from '@/helper/color/MyContrastColor';
import {useProjectColor} from '@/states/ProjectInfo';
import {IconNames} from '@/constants/IconNames';
import {MyActionsheetItem} from "@/components/settings/MyActionsheetItem";
import {StyleProp} from "react-native/Libraries/StyleSheet/StyleSheet";
import {MyAccessibilityRoles} from "@/helper/accessibility/MyAccessibilityRoles";

export interface SettingsRowProps {
    key?: any;
    children?: any;
    labelLeft: string,
    labelRight?: string | null,
    leftContent?: string | any,
    rightContent?: React.ReactNode,
	active?: boolean,
    disabled?: boolean,
    leftIcon?: any | string,
	iconLeftCustom?: React.ReactNode,
    rightIcon?: string,
    onPress?: any,
	padding?: number | undefined
    color?: any
    hideLeftContent?: boolean,
    expandable?: boolean,
    expanded?: boolean,
    customDivider?: any,
	tooltip?: string,
    accessibilityLabel: string,
    accessibilityRole?: AccessibilityRole | undefined,
    accessibilityState?: any,
    flex?: number,
    shadeLevel?: number
}

export const SETTINGS_ROW_DEFAULT_PADDING = 12;
export const SettingsRow: FunctionComponent<SettingsRowProps> = (props) => {
	const viewBackgroundColor = useViewBackgroundColor()
	const textColor = useTextContrastColor()
	const lighterOrDarkerBackgroundColor = useLighterOrDarkerColorForSelection(viewBackgroundColor)
	const lighterOrDarkerTextColor = useMyContrastColor(lighterOrDarkerBackgroundColor)
	const projectColor = useProjectColor()
	const activeColor = props.color || projectColor
	const activeColorContrast = useMyContrastColor(activeColor)
	const isActive = props.active || false;

	const [isHovered, setIsHovered] = useState(false);

	// Function to handle mouse enter event
	const handleMouseEnter = () => {
		setIsHovered(true);
	};

	// Function to handle mouse leave event
	const handleMouseLeave = () => {
		setIsHovered(false);
	};

	const item = {
		key: props?.key,
		icon: props.leftIcon,
		label: props.labelLeft,
		accessibilityLabel: props.accessibilityLabel,
		onSelect: props.onPress,
		leftIcon: props.leftIcon,
	}

	function renderRightContent(showPress: boolean): React.ReactNode {
		const rightIcon = props?.rightIcon
		const rightContent = props?.rightContent
		if (rightContent) {
			return rightContent;
		}

		let content:any = null;

		if (showPress && !rightIcon) {
			content = <Icon style={{color: usedTextColor}} name={IconNames.chevron_right_icon} />;
		}
		if (rightIcon) {
			content = <Icon style={{color: usedTextColor}} name={rightIcon} />
		}

		return (
			<ActionsheetItemText selectable={true}
				sx={{
					color: usedTextColor,
				}}
			>{content}
			</ActionsheetItemText>
		)
	}

	const usedViewBackgroundColor = isActive ? activeColor : viewBackgroundColor;
	const usedTextColor = isActive ? activeColorContrast : textColor;



	let renderedLeftIcon: any = <Icon style={{color: usedTextColor}} name={item.icon} />
	if(props.iconLeftCustom){
		renderedLeftIcon = props.iconLeftCustom
	}

	const expanded = props.expanded;
	const children = props.children;

	let renderedChildren = null;
	if (expanded) {
		renderedChildren = children;
	}

	const contentWithShrinkingSpaceOnlyRight = (
		<View style={{ flexDirection: 'row', justifyContent: 'space-between', flex: 1 }}>
			<View style={{
			}}
			>
				<Text style={{ color: usedTextColor }}>{item.label}</Text>
			</View>
			<View style={{
				flexShrink: 1,
			}}
			>
				<Text style={{ color: usedTextColor, textAlign: 'right' }}>{props.labelRight}</Text>
			</View>
		</View>
	)

	const content = contentWithShrinkingSpaceOnlyRight;

	const isPressable = !!item.onSelect;

	const disabledStyle: StyleProp<ViewStyle> = {
		// @ts-ignore // This is a valid style on web
		cursor: props.disabled ? 'not-allowed' : (isPressable ? 'pointer' : 'default'),
		opacity: props.disabled ? 0.5 : 1,
	}

	const tooltip = props?.tooltip || props.accessibilityLabel;
	return (
		<>
			<Tooltip
				placement="top"
				trigger={(triggerProps) => {
					return (
							<ActionsheetItem
								{...triggerProps}
								padding={props.padding || SETTINGS_ROW_DEFAULT_PADDING}
								disabled={!isPressable || props.disabled}
								accessibilityLabel={item.accessibilityLabel}
								style={[disabledStyle]}
								sx={{
									bg: usedViewBackgroundColor,
									':hover': {
										bg: lighterOrDarkerBackgroundColor,
									},
								}}
								key={item.key}
								onPress={item.onSelect}
							>
								<ActionsheetItemText>{renderedLeftIcon}</ActionsheetItemText>
								{content}
								{renderRightContent(!!item.onSelect)}
							</ActionsheetItem>
					)
				}}
			>
				<TooltipContent>
					<TooltipText>{tooltip}</TooltipText>
				</TooltipContent>
			</Tooltip>
			{renderedChildren}
		</>
	)



}
