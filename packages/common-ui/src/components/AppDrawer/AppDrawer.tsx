import React, { useRef, useState } from 'react';
import { Image, LayoutChangeEvent, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { myContrastColor } from '../../helpers/ColorHelper';
import { AppDrawerProps, DrawerItem } from './types';

const AppDrawer: React.FC<AppDrawerProps> = ({
	logoSource,
	renderLogo,
	title,
	onLogoPress,
	items,
	bottomItems,
	activeKey,
	primaryColor,
	footerContent,
}) => {
	const { theme, isDark } = useTheme();
	const resolvedPrimaryColor = primaryColor ?? theme.primary;
	const [iconMinWidth, setIconMinWidth] = useState(0);
	const iconMinWidthRef = useRef(0);

	const handleIconInnerLayout = (event: LayoutChangeEvent) => {
		const { width } = event.nativeEvent.layout;
		if (width > iconMinWidthRef.current) {
			iconMinWidthRef.current = width;
			setIconMinWidth(width);
		}
	};

	const isActive = (key: string) => activeKey === key;

	const getItemBgColor = (key: string, itemActiveColor?: string) => {
		if (!isActive(key)) return 'transparent';
		return itemActiveColor ?? resolvedPrimaryColor;
	};

	const getItemTextColor = (key: string, itemActiveColor?: string) => {
		if (!isActive(key)) return theme.inactiveText;
		const bg = itemActiveColor ?? resolvedPrimaryColor;
		return myContrastColor(bg, theme, isDark);
	};

	const getIconColor = (key: string, itemActiveColor?: string) => {
		if (!isActive(key)) return theme.inactiveIcon;
		const bg = itemActiveColor ?? resolvedPrimaryColor;
		return myContrastColor(bg, theme, isDark);
	};

	const renderItem = (item: DrawerItem, index: number) => {
		const active = isActive(item.key);
		const bgColor = getItemBgColor(item.key, item.activeColor);
		const textColor = getItemTextColor(item.key, item.activeColor);
		const iconColor = getIconColor(item.key, item.activeColor);

		return (
			<TouchableOpacity
				key={item.key ?? index}
				style={[styles.menuItem, { backgroundColor: bgColor }]}
				onPress={item.onPress}
			>
				<View style={[styles.menuIconOuter, { minWidth: iconMinWidth }]}>
					<View style={styles.menuIconInner} onLayout={handleIconInnerLayout}>
						{item.renderIcon(active, iconColor)}
						{item.hasUnread ? (
							<View
								style={[
									styles.notificationDot,
									{ backgroundColor: theme.accent, borderColor: theme.drawerBg },
								]}
							/>
						) : null}
					</View>
				</View>
				<Text style={[styles.menuLabel, { color: textColor }]}>{item.label}</Text>
			</TouchableOpacity>
		);
	};

	const headerContent = (
		<>
			{renderLogo ? (
				renderLogo()
			) : logoSource ? (
				<View style={[styles.logoContainer, { backgroundColor: theme.drawer.logoBg }]}>
					<Image source={logoSource} style={styles.logo} />
				</View>
			) : null}
			{title ? (
				<Text style={[styles.heading, { color: theme.drawerHeading }]}>{title}</Text>
			) : null}
		</>
	);

	return (
		<SafeAreaView style={[styles.safeArea, { backgroundColor: theme.screen.iconBg }]}>
			<ScrollView
				style={[styles.scrollView, { backgroundColor: theme.drawerBg }]}
				contentContainerStyle={styles.contentContainer}
			>
				<View style={styles.content}>
					<TouchableOpacity style={styles.header} onPress={onLogoPress}>
						{headerContent}
					</TouchableOpacity>
					<View style={styles.menuContainer}>
						{items.map(renderItem)}
						{bottomItems && bottomItems.length > 0 ? (
							<>
								<View style={[styles.divider, { backgroundColor: theme.drawer.divider }]} />
								{bottomItems.map(renderItem)}
							</>
						) : null}
					</View>
				</View>
				{footerContent ? (
					<View style={styles.footer}>{footerContent}</View>
				) : null}
			</ScrollView>
		</SafeAreaView>
	);
};

export default AppDrawer;

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
	},
	scrollView: {
		flex: 1,
	},
	contentContainer: {
		borderTopRightRadius: 12,
		borderBottomRightRadius: 12,
		paddingTop: 20,
		paddingBottom: 20,
		justifyContent: 'space-between',
	},
	content: {
		paddingHorizontal: 15,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	logoContainer: {
		width: 80,
		height: 80,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 15,
	},
	logo: {
		width: 72,
		height: 72,
	},
	heading: {
		fontSize: 28,
	},
	menuContainer: {
		flex: 1,
		paddingVertical: 10,
		marginTop: 10,
	},
	menuItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-start',
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 10,
		marginBottom: 5,
		width: '100%',
		gap: 12,
	},
	menuIconOuter: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	menuIconInner: {
		alignSelf: 'center',
		alignItems: 'center',
		justifyContent: 'center',
		position: 'relative',
	},
	menuLabel: {
		flex: 1,
		fontSize: 16,
		marginTop: 4,
		textAlign: 'left',
	},
	notificationDot: {
		position: 'absolute',
		top: -2,
		right: -2,
		width: 10,
		height: 10,
		borderRadius: 5,
		borderWidth: 1,
	},
	divider: {
		width: '100%',
		height: 1,
		marginVertical: 20,
	},
	footer: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'center',
		flexWrap: 'wrap',
		marginTop: 10,
		paddingHorizontal: 15,
	},
});
