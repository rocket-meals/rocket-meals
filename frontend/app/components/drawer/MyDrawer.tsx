import React, {ReactNode} from 'react';
import {useViewBackgroundColor, View} from '@/components/Themed';
import {useInsets, useIsLargeDevice} from '@/helper/device/DeviceHelper';
import {Drawer} from 'expo-router/drawer';
import {ProjectBanner} from '@/components/project/ProjectBanner';
import {MyTouchableOpacity} from '@/components/buttons/MyTouchableOpacity';
import {useProjectColor} from '@/states/ProjectInfo';
import {DimensionValue} from 'react-native';
import {useThemeDetermined} from '@/states/ColorScheme';
import {TranslationKeys, useTranslation} from '@/helper/translations/Translation';
import {
	DrawerConfigPosition,
	useDrawerPosition,
	useIsFullscreenModeFromSearchParam,
	useIsDrawerPermanentVisible
} from '@/states/DrawerSyncConfig';
import {DrawerContentComponentProps} from '@react-navigation/drawer/src/types';
import {getMyDrawerItemIcon} from '@/components/drawer/MyDrawerItemIcon';
import {MyDrawerCustomItemProps} from '@/components/drawer/MyDrawerCustomItemCenter';
import {getMyScreenHeader} from '@/components/drawer/MyScreenHeader';
import {getMyDrawerItemsBottom, getMyDrawerItemsCenter} from '@/components/drawer/MyDrawerItems';
import {MyDrawerSafeAreaView} from '@/components/drawer/MyDrawerSafeAreaView';
import {DrawerHeaderProps} from '@react-navigation/drawer';
import {IconNames} from '@/constants/IconNames';
import {ProjectBackgroundImage} from '@/components/project/ProjectForegroundImage';
import {MyScrollView} from "@/components/scrollview/MyScrollView";

export type MyDrawerItemProps = {
    routeName: string;
    label: string;
    title: string;
    icon: string | undefined | null;
    visibleInDrawer?: boolean | null | undefined;
	showBackButton?: boolean | null | undefined;
    getHeader?: ((props: DrawerHeaderProps) => ReactNode) | undefined | null;
    params?: any
};

export function useDrawerActiveBackgroundColor(): string {
	return useProjectColor();
}

// Function to render individual screens within the Drawer navigation.
// It dynamically sets the drawer's appearance based on the current project color.
export function useRenderMyDrawerScreen({...props}: MyDrawerItemProps) {
	const drawerActiveBackgroundColor = useDrawerActiveBackgroundColor(); // Fetch the current project color for use in styling.
	return renderMyDrawerScreen({...props}, drawerActiveBackgroundColor); // Render the drawer screen with the current project color.
}

// Function to render individual screens within the Drawer navigation.
// It dynamically sets the drawer's appearance based on the current project color.
export function renderMyDrawerScreen({routeName, label, title, icon, showBackButton, visibleInDrawer, getHeader, params}: MyDrawerItemProps, drawerActiveBackgroundColor: string) {
	const fullscreen = useIsFullscreenModeFromSearchParam()
	let usedVisible = true;
	if (visibleInDrawer!==undefined) {
		usedVisible = !!visibleInDrawer;
	}

	let usedHeader: any = getHeader
	if(usedHeader===undefined) {
		usedHeader = getMyScreenHeader();
	}
	if(usedHeader===null || fullscreen){
		usedHeader = () => null
	}

	return (
		<Drawer.Screen
			key={routeName}
			name={routeName} // The route name must match the URL from the root for navigation.
			options={{
				unmountOnBlur: true, // This will unmount the page in order to free up memory but at the cost of loading time
				// @ts-ignore - Expo's TypeScript definitions might not recognize 'visible' as a valid option.
				visible: usedVisible, // This custom property is used to conditionally render drawer items.
				label: label,
				showBackButton: showBackButton,
				title: title,
				drawerIcon: getMyDrawerItemIcon(icon),
				drawerActiveBackgroundColor: drawerActiveBackgroundColor, // Customize the background color of the active drawer item.
				header: usedHeader, // Render a custom header for the drawer.
				params: params
			}}
		/>
	);
}

/**
 * Custom hook to calculate and provide the appropriate width for the drawer.
 */
function useDrawerWidth(): number | DimensionValue {
	const insets = useInsets(); // Get safe area insets to adjust drawer width accordingly.
	const [drawerPosition, setDrawerPosition] = useDrawerPosition(); // Fetch and set the current drawer position (left/right).
	const isLargeDevice = useIsLargeDevice(); // Determine if the device has a large screen.

	if (!isLargeDevice) {
		return '80%'; // Use a fixed width for the drawer on small devices.
	} else {
		const baseDrawerWidth = 320; // Define a base width for the drawer.
		let drawerWidth = baseDrawerWidth;

		// Adjust drawer width based on its position and the safe area insets.
		if (drawerPosition === DrawerConfigPosition.Left) {
			drawerWidth += insets.left;
		}
		if (drawerPosition === DrawerConfigPosition.Right) {
			drawerWidth += insets.right;
		}
		return drawerWidth; // Return the calculated drawer width.
	}
}


export type MyDrawerTopProjectContentProps = {
    showProjectLogo?: boolean;
};
export const MyDrawerTopProjectContent = (props: MyDrawerTopProjectContentProps) => {
	if (props.showProjectLogo) {
		return <ProjectBanner/>
	} else {
		return <ProjectBackgroundImage style={{width: '100%', height: 64}}/>
	}
}


// Component type definition for custom drawer items.
export type MyDrawerProps = {
    customDrawerItems?: MyDrawerCustomItemProps[];
    children?: React.ReactNode;
};
// Main drawer component that renders the navigation drawer along with custom items.
export const MyDrawer = (props: MyDrawerProps) => {
	const isDrawerPermanentVisible = useIsDrawerPermanentVisible(); // Determine if the device is considered large.
	const customDrawerItems = props?.customDrawerItems; // Optional custom drawer items.

	const drawerWidth = useDrawerWidth(); // Calculate the dynamic width of the drawer.
	const [drawerPosition, setDrawerPosition] = useDrawerPosition(); // Get and set the current drawer position.

	return (
		<Drawer
			backBehavior={"history"} // in order to have even a history stack in the drawer https://github.com/expo/expo/issues/27889
			drawerContent={(props: DrawerContentComponentProps) => {
				// Render custom drawer content, passing through custom items and props.
				return <DrawerContentWrapper customDrawerItems={customDrawerItems} {...props} />;
			}}
			screenOptions={{
				drawerPosition: drawerPosition, // Set the drawer to appear on the left or right.
				drawerType: isDrawerPermanentVisible ? 'permanent' : 'front', // Use a permanent drawer on large devices.
				drawerStyle: {
					width: drawerWidth, // Apply the dynamically calculated width.
				},
				drawerIcon: getMyDrawerItemIcon(IconNames.chevron_right_icon), // Default icon for the drawer items.
				header: getMyScreenHeader() // Render a custom header for the drawer.
			}}
			{...props}
		/>
	);
};

function renderDrawerContentTop(props: DrawerContentComponentProps) {
	const translation_navigate_to = useTranslation(TranslationKeys.navigate_to);
	const translation_home = useTranslation(TranslationKeys.home);
	const accessibilityLabel_home = translation_navigate_to + ' ' + translation_home;

	const showProjectLogo = true;

	return (
		<MyTouchableOpacity
			accessibilityLabel={accessibilityLabel_home}
			onPress={() => {
				props.navigation.navigate('index'); // Navigate to the home screen when the banner is pressed.
			}}
			style={{
				width: '100%',
				padding: 10,
			}}
		>
			<MyDrawerTopProjectContent showProjectLogo={showProjectLogo}/>
		</MyTouchableOpacity>
	)
}

// Wrapper component for the content inside the drawer.
// It manages the layout of custom drawer items, the project banner, and legal links.
type DrawerContentWrapperProps = {
    customDrawerItems?: MyDrawerCustomItemProps[];
} & DrawerContentComponentProps;

function DrawerContentWrapper(props: DrawerContentWrapperProps) {
	const theme = useThemeDetermined(); // Determine the current theme to apply appropriate styles.
	const gradientBackgroundColor = theme?.colors?.card; // Set a background color for the gradient effect.
	const viewBackgroundColor = useViewBackgroundColor();

	const renderedDrawerItemsWithSeparator = getMyDrawerItemsCenter(props); // Get the list of drawer items to render.

	return (
		<View style={{width: '100%', height: '100%', overflow: 'hidden', backgroundColor: viewBackgroundColor}}>
			<MyDrawerSafeAreaView>
				{renderDrawerContentTop(props)}
				<View style={{
					flex: 1,
					width: '100%',
					height: '100%',
					overflow: 'hidden',
				}}
				>
					<MyScrollView>
						<View style={{width: '100%', height: '100%'}}>
							{renderedDrawerItemsWithSeparator}
						</View>
					</MyScrollView>
				</View>
				{getMyDrawerItemsBottom(props)}
			</MyDrawerSafeAreaView>
		</View>
	);
}
