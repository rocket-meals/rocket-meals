import React from 'react';
import {Icon, View} from '@/components/Themed';
import {useProjectColor} from '@/states/ProjectInfo';
import {useMyContrastColor} from '@/helper/color/MyContrastColor';

/**
 * Defines the required properties for any drawer icon.
 *
 * @prop {string} color - The color of the icon.
 * @prop {number} size - The size of the icon.
 * @prop {boolean} focused - Whether the associated drawer item is currently focused.
 */
export type RequiredDrawerIconProps = {
	color: string,
    size: number,
    focused: boolean
}

/**
 * Extends RequiredDrawerIconProps with a custom property for specifying the icon name.
 *
 * @prop {string | undefined} iconName - The name of the icon to be used. Can be undefined.
 */
export type MyCustomDrawerIconProps = {
    iconName: string | undefined | null,
} & RequiredDrawerIconProps

/**
 * Factory function that creates a React component for rendering a custom drawer icon.
 *
 * @param {string | undefined} iconName - The name of the icon. Can be undefined to allow for dynamic icon names.
 * @returns A function that takes RequiredDrawerIconProps and returns a JSX.Element representing the custom drawer icon.
 */
export const getMyDrawerItemIcon: (iconName: (string | undefined | null)) => (props: RequiredDrawerIconProps) => React.JSX.Element = (iconName: string | undefined | null) => {
	return (props: RequiredDrawerIconProps) => (
		<MyDrawerItemIcon iconName={iconName} {...props} />
	);
}

/**
 * Component for rendering a custom drawer item icon.
 * Utilizes project color and contrast color logic to dynamically adjust icon appearance based on focus state.
 *
 * @param {MyCustomDrawerIconProps} props - The combined props including iconName and required icon properties.
 * @returns A JSX.Element representing the custom drawer icon within a potentially adjusted view for layout correction.
 */
export const MyDrawerItemIcon: ({iconName, focused, color, size}: MyCustomDrawerIconProps) => React.JSX.Element = ({iconName, focused, color, size }: MyCustomDrawerIconProps) => {

	// A View wrapper is used to adjust the icon's layout, specifically to correct spacing issues.
	// The Icon component is customized based on focus state, using the contrast color for focused items.
	return (
		<View style={{marginRight: -20}}>
			<Icon name={iconName} size={size} color={color} />
		</View>
	);
}
