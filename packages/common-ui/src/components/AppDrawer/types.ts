import { ImageSourcePropType } from 'react-native';

export interface DrawerItem {
	key: string;
	label: string;
	renderIcon: (isActive: boolean, color: string) => React.ReactNode;
	onPress: () => void;
	hasUnread?: boolean;
	activeColor?: string;
}

export interface AppDrawerProps {
	logoSource?: ImageSourcePropType;
	renderLogo?: () => React.ReactNode;
	title?: string;
	onLogoPress?: () => void;
	items: DrawerItem[];
	bottomItems?: DrawerItem[];
	activeKey?: string;
	primaryColor?: string;
	footerContent?: React.ReactNode;
}
