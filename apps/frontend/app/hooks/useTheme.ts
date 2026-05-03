import { useEffect, useMemo, useState } from 'react';
import { Appearance, Platform, StatusBar } from 'react-native';
import { darkTheme, lightTheme } from '@/styles/themes';
import { store } from '@/redux/store';

export const useTheme = () => {
	const [theme, setTheme] = useState(store.getState().settings.selectedTheme);

	const changeTheme = (mode: 'light' | 'dark' | 'systematic') => ({
		type: 'CHANGE_THEME',
		payload: mode,
	});

	const setThemeMode = (mode: 'light' | 'dark' | 'systematic') => {
		store.dispatch(changeTheme(mode));
	};

	const computedTheme = useMemo(() => {
		if (theme === 'systematic') {
			const systemTheme = Appearance.getColorScheme();
			return systemTheme === 'dark' ? darkTheme : lightTheme;
		}
		return theme === 'dark' ? darkTheme : lightTheme;
	}, [theme]);

	useEffect(() => {
		const unsubscribe = store.subscribe(() => {
			setTheme(store.getState().settings.selectedTheme);
		});

		if (theme === 'systematic') {
			const systemTheme = Appearance.getColorScheme();
			store.dispatch(changeTheme('systematic'));

			const listener = Appearance.addChangeListener(({ colorScheme }) => {
				if (colorScheme) {
					store.dispatch(changeTheme('systematic'));
				}
			});

			return () => {
				listener.remove();
				unsubscribe();
			};
		}

		return () => unsubscribe();
	}, [theme]);

	useEffect(() => {
		const isDark = theme === 'systematic'
			? Appearance.getColorScheme() === 'dark'
			: theme === 'dark';

		StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');

		if (Platform.OS === 'android') {
			StatusBar.setBackgroundColor(computedTheme.header.background);
		}
	}, [theme, computedTheme]);

	return { theme: computedTheme, setThemeMode };
};
