import React, {createContext, useContext, useState} from 'react';
import {ThemeProvider} from '@react-navigation/native';
import {StatusBar} from 'expo-status-bar';
import {View, Text, useViewBackgroundColor, Icon} from '@/components/Themed'; // Import View from your themed components
import {RootFabHolder} from '@/components/rootLayout/RootFabHolder';
import {useIsDarkTheme, useThemeDetermined} from '@/states/ColorScheme';
import {useSyncState} from "@/helper/syncState/SyncState";
import {NonPersistentStore} from "@/helper/syncState/NonPersistentStore";
import {MyModalActionSheetGlobal} from "@/components/modal/MyModalActionSheetGlobal";
import {MyModalActionSheetItem, MyModalActionSheetProps} from "@/components/modal/MyModalActionSheet";
import {IconNames} from "@/constants/IconNames";
import {useIconWithInPixel} from "@/components/shapes/Rectangle";
import {Dimensions, DimensionValue} from "react-native";
import {DimensionType} from "@/types/DimensionType";
import RootTextAndIconDimensions from "@/components/rootLayout/RootTextAndIconDimensions";
import InaccessibleAndHidden from "@/helper/accessibility/InaccessableAndHidden";

// Create a Context for the modal
const ModalContext = createContext<{
	modalValue: MyModalActionSheetItem | null;
	setModalValue: React.Dispatch<React.SetStateAction<MyModalActionSheetItem | null>>;
} | undefined>(undefined);

// Provider component
export const ModalProvider = ({ children }: {children: React.ReactNode | React.ReactNode[]}) => {
	const [modalValue, setModalValue] = useState<MyModalActionSheetItem | null>(null); // Initially empty object

	return (
		<ModalContext.Provider value={{ modalValue, setModalValue }}>
			{Array.isArray(children) ? children : [children]}
		</ModalContext.Provider>
	);
};

// Custom hook to use the modal context
export const useModalGlobalContext: () => [MyModalActionSheetItem | null, React.Dispatch<React.SetStateAction<MyModalActionSheetItem | null>>] = () => {
	const context = useContext(ModalContext);
	if (context === undefined) {
		throw new Error('useModalContext must be used within a ModalProvider');
	}
	return [context?.modalValue, context?.setModalValue];
};

const WrappedModalProvider = ({ children }: {children: React.ReactNode | React.ReactNode[]}) => {
	const backgroundColor = useViewBackgroundColor();
	const isDarkTheme = useIsDarkTheme();
	const [modalConfig] = useModalGlobalContext();
	const statusbarTextColorStyle = isDarkTheme ? 'light' : 'dark';
	const appIsAccessible = !modalConfig

	return (
		<>
			<StatusBar style={statusbarTextColorStyle} />

			{/* Set View to occupy all available space and control accessibility based on action sheet visibility */}
			<RootTextAndIconDimensions />
            <InaccessibleAndHidden style={{height: '100%', width: '100%', backgroundColor: backgroundColor}} accessible={appIsAccessible} accessibilityElementsHidden={!appIsAccessible}>
				{/* Render the children respecting the action sheet's visibility */}
				{children}
			</InaccessibleAndHidden>
			<RootFabHolder/>

			<MyModalActionSheetGlobal />
		</>
	)
}

export const RootThemeProvider = (props: { children: ReactNode }) => {
	const theme = useThemeDetermined();


	return (
		<ThemeProvider value={theme}>
			<ModalProvider>
				<WrappedModalProvider>
					{props.children}
				</WrappedModalProvider>
			</ModalProvider>
		</ThemeProvider>
	);
}
