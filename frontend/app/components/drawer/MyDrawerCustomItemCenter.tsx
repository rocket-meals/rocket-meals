import React from 'react';
import {DrawerItem} from '@react-navigation/drawer';
import {TranslationKeys, useTranslation} from '@/helper/translations/Translation';
import {router} from 'expo-router';
import {CommonSystemActionHelper} from '@/helper/device/CommonSystemActionHelper';
import {getMyDrawerItemIcon} from '@/components/drawer/MyDrawerItemIcon';
import {getMyDrawerItemLabel} from '@/components/drawer/MyDrawerItemLabel';
import {useProjectColor} from '@/states/ProjectInfo';
import {Text, useViewBackgroundColor, View} from "@/components/Themed";
import {PlatformPressable} from "@react-navigation/elements";
import {Platform, StyleProp, ViewStyle} from "react-native";
import {Link} from "@react-navigation/native";
import {MyLinkCustom, MyLinkDefault} from "@/components/link/MyLinkCustom";
import {useMyContrastColor} from "@/helper/color/MyContrastColor";

export type MyDrawerCustomItemProps = {
    label: string,
    innerKey?: string | number,
    isFocused?: boolean,
    onPress?: () => void,
    onPressInternalRouteTo?: string, // TODO: check if we can use StaticRoutes or something like that?
    onPressExternalRouteTo?: string | undefined | null,
    drawerIcon?: (props: {focused: boolean, size: number, color: string}) => React.ReactNode,
	drawerActiveBackgroundColor?: string,
    icon?: string,
    position?: number,
	visibleInDrawer?: boolean | null | undefined,
	visibleInBottomDrawer?: boolean | null | undefined,
}

const LinkPressable = ({
						   children,
						   style,
						   onPress,
						   onLongPress,
						   onPressIn,
						   onPressOut,
						   to,
						   accessibilityRole,
						   ...rest
					   }: Omit<React.ComponentProps<typeof PlatformPressable>, 'style'> & {
	style: StyleProp<ViewStyle>;
} & {
	to?: string;
	children: React.ReactNode;
	onPress?: () => void;
}) => {
	if (Platform.OS === 'web' && to) {
		// React Native Web doesn't forward `onClick` if we use `TouchableWithoutFeedback`.
		// We need to use `onClick` to be able to prevent default browser handling of links.
		return (
			<Link
				{...rest}
				to={to}
				style={[style]}
				onPress={(e: any) => {
					if (
						!(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) && // ignore clicks with modifier keys
						(e.button == null || e.button === 0) // ignore everything but left clicks
					) {
						e.preventDefault();
						onPress?.(e);
					}
				}}
				// types for PressableProps and TextProps are incompatible with each other by `null` so we
				// can't use {...rest} for these 3 props
				onLongPress={onLongPress ?? undefined}
				onPressIn={onPressIn ?? undefined}
				onPressOut={onPressOut ?? undefined}
			>
				{children}
			</Link>
		);
	} else {
		return (
			<PlatformPressable
				{...rest}
				accessibilityRole={accessibilityRole}
				onPress={onPress}
			>
				<View style={style}>{children}</View>
			</PlatformPressable>
		);
	}
};

export const MyDrawerCustomItemBottom = (customItem: MyDrawerCustomItemProps) => {
	const translation_navigate_to = useTranslation(TranslationKeys.navigate_to)

	let label = customItem.label
	const drawer_item_accessibility_label = translation_navigate_to + ' ' + customItem.label

	let onPress: any = undefined;
	if (customItem.onPress) {
		onPress = customItem.onPress;
	}

	return <View key={label.toLowerCase()} style={{flexDirection: 'row', justifyContent: 'center', padding: 5 }}>
		<MyLinkDefault
			hrefExternal={customItem.onPressExternalRouteTo}
			routeInternal={customItem.onPressInternalRouteTo}
			accessibilityLabel={drawer_item_accessibility_label}
			onPress={onPress}
			label={label}
		/>
	</View>
}

export const getMyDrawerCustomItemCenter = (customItem: MyDrawerCustomItemProps) => {
	return <MyDrawerCustomItemCenter {...customItem} />
}

export const MyDrawerCustomItemCenter = (customItem: MyDrawerCustomItemProps) => {
	const translation_navigate_to = useTranslation(TranslationKeys.navigate_to)

	const projectColor = useProjectColor()
	let drawerActiveBackgroundColor = customItem.drawerActiveBackgroundColor || projectColor

	const viewBackgroundColor = useViewBackgroundColor();

	const drawer_item_accessibility_label = translation_navigate_to + ' ' + customItem.label
	const key = customItem?.label
	const isFocused = customItem.isFocused;

	const inactiveBackgroundColor = (viewBackgroundColor || drawerActiveBackgroundColor)
	const backgroundColor = isFocused ? drawerActiveBackgroundColor : inactiveBackgroundColor
	const backgroundContrastColor = useMyContrastColor(backgroundColor);
	const inactiveTextColor = useMyContrastColor(inactiveBackgroundColor)

	let label = getMyDrawerItemLabel(customItem.label, backgroundColor);

	let onPress: any = undefined;
	if (customItem.onPress) {
		onPress = customItem.onPress;
	}

	let to = undefined

	if (!onPress) {
		if (customItem.onPressInternalRouteTo) {
			onPress = () => {
				// @ts-ignore TODO: test if Href if working here
				router.navigate(customItem.onPressInternalRouteTo)
			};
		}

		const externalHref = customItem.onPressExternalRouteTo
		if (externalHref) {
			to = externalHref
			onPress = () => {
				CommonSystemActionHelper.openExternalURL(externalHref, true);
			};
		}
	}

	let renderIcon: (props: {focused: boolean, size: number, color: string}) => React.ReactNode = getMyDrawerItemIcon(customItem.icon)
	if (!customItem.icon && !!customItem.drawerIcon) {
		renderIcon = customItem.drawerIcon
	}

	return (
		<DrawerItem
			activeTintColor={backgroundContrastColor}
			activeBackgroundColor={backgroundColor}
			inactiveBackgroundColor={inactiveBackgroundColor}
			inactiveTintColor={inactiveTextColor}
			to={to}
			accessibilityLabel={drawer_item_accessibility_label}
			label={label}
			key={key}
			focused={isFocused}
			onPress={onPress}
			//style={{backgroundColor: backgroundColor}}
			icon={renderIcon}
		/>
	);
}