import React from 'react';
import { View, type ViewProps } from 'react-native';
import { PRINT_HIDDEN_DATA_SET } from '../../constants/print';

export type PrintHiddenProps = ViewProps & {
	children?: React.ReactNode;
};

/**
 * Keeps its children on the screen but off the printed page.
 *
 * Wrap what is only there to be tapped - a chevron, a pencil, a toggle affordance. The wrapper
 * lays out like the icon it holds; on native it is an ordinary `View` and the marker is ignored.
 *
 * The print document has to carry `PRINT_HIDDEN_CSS` for this to have any effect - see
 * `constants/print.ts`.
 */
const PrintHidden: React.FC<PrintHiddenProps> = ({ children, ...viewProps }) => (
	// `dataSet` is a react-native-web prop and missing from React Native's own ViewProps.
	<View {...viewProps} {...({ dataSet: PRINT_HIDDEN_DATA_SET } as object)}>
		{children}
	</View>
);

export default PrintHidden;
