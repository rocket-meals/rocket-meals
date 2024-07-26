import React from 'react';
import {Text, useViewBackgroundColor} from '@/components/Themed';
import {useProjectColor} from '@/states/ProjectInfo';
import {useMyContrastColor} from '@/helper/color/MyContrastColor';

/**
 * Defines the required properties for a drawer item label component.
 *
 * @prop {string} color - The text color of the label.
 * @prop {boolean} focused - Whether the associated drawer item is currently focused.
 */
export type RequiredDrawerItemLabelProps = {
	backgroundColor: string,
    focused: boolean
}

/**
 * Extends RequiredDrawerItemLabelProps with a custom property for specifying the label text.
 *
 * @prop {string | undefined} label - The text content of the label. Can be undefined to support dynamic label texts.
 */
export type MyCustomDrawerItemLabelProps = {
    label: string | undefined,
} & RequiredDrawerItemLabelProps

/**
 * Factory function to create a React component for rendering a custom drawer item label.
 *
 * @param {string | undefined} label - The text content for the label. Can be undefined for dynamic label assignment.
 * @param color - The color of the label text.
 * @returns A function that takes RequiredDrawerItemLabelProps and returns a JSX.Element representing the custom label.
 */
export const getMyDrawerItemLabel = (label: string | undefined, backgroundColor: string) => {
	return (props: RequiredDrawerItemLabelProps) => {
		return <MyDrawerItemLabel label={label} {...props} backgroundColor={backgroundColor} />
	}
}

/**
 * Component for rendering a custom drawer item label.
 * This component adjusts the label's color based on the item's focus state, using project-specific color schemes.
 *
 * @param {MyCustomDrawerItemLabelProps} props - The combined props including label text and required label properties.
 * @returns A JSX.Element representing the custom label, styled based on focus state.
 */
export const MyDrawerItemLabel = ({ focused, backgroundColor, label }: MyCustomDrawerItemLabelProps) => {
	const contrastColor = useMyContrastColor(backgroundColor); // Calculate a contrasting color based on the project color for better visibility.

	// Render the label within a Text component, dynamically adjusting its color based on the focus state.
	return (
		<Text style={{ color: contrastColor }}>{label}</Text>
	);
}
