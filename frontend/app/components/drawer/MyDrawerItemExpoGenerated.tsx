import {DrawerNavigationOptions} from '@react-navigation/drawer';
import {MyDrawerCustomItemCenter} from '@/components/drawer/MyDrawerCustomItemCenter';
import React from 'react';
import {DrawerContentComponentProps} from '@react-navigation/drawer/src/types';
import {useIsDebug} from '@/states/Debug';

/**
 * Dynamically generates a custom drawer item for the navigation drawer.
 * It takes into consideration the visibility option set in the drawer's descriptor
 * and a global debug state to conditionally render drawer items.
 *
 * @param {any} route - The route object for the current drawer item. Expected to have a 'key' property.
 * @param {number} index - The index of the current route in the navigation state's routes array.
 * @param {DrawerContentComponentProps} props - Properties passed down from the drawer's content component.
 * @returns {JSX.Element | null} - A React element for the custom drawer item, or null if the item should not be rendered.
 */
export const getMyDrawerItemExpoGenerated = (route: any, index: number, props: DrawerContentComponentProps) => {
	const isDebug = useIsDebug(); // Determines if the application is in debug mode.

	const descriptor = props.descriptors[route.key]; // Retrieves the navigation descriptor for the current route.
	const options: DrawerNavigationOptions = descriptor.options; // Extracts navigation options from the descriptor.

	// Custom option to control the visibility of the drawer item. Uses a ts-ignore comment to bypass TypeScript errors.
	// @ts-ignore
	const visible = options.visible;

	// By default, hide all items not explicitly defined, unless in debug mode.
	const hide_all_not_especially_defined_drawer_items = !isDebug;

	// If the item is not marked as visible and we're hiding undefined items, return null to skip rendering.
	if (!visible && hide_all_not_especially_defined_drawer_items) {
		return null;
	}

	// Determine the label for the drawer item, falling back to the route's name if no explicit label or title is set.
	const label: string =
        options.drawerLabel !== undefined
        	? options.drawerLabel
        	: options.title !== undefined
        		? options.title
        		: route.name;

	// Check if the current route is focused.
	const isFocused = props.state.index === index;

	// Define the onPress handler to navigate to the associated route.
	const onPress = () => {
		props.navigation.navigate(route.name);
	};

	// Return a custom drawer item component with the determined properties.
	return <MyDrawerCustomItemCenter label={label} innerKey={index} isFocused={isFocused} drawerIcon={options.drawerIcon} drawerActiveBackgroundColor={options.drawerActiveBackgroundColor} onPress={onPress} />;
}
