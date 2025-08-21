import { useEffect, useMemo, useState } from 'react';
import { Appearance, StatusBar } from 'react-native';
import { darkTheme, lightTheme } from '@/styles/themes';
import { configureStore } from '@/redux/store';

export const useTheme = () => {
	const [theme, setTheme] = useState(
		configureStore.getState().settings.selectedTheme
	);

	const changeTheme = (mode: 'light' | 'dark' | 'systematic') => ({
		type: 'CHANGE_THEME',
		payload: mode,
	});

	const setThemeMode = (mode: 'light' | 'dark' | 'systematic') => {
		configureStore.dispatch(changeTheme(mode));
	};

	const computedTheme = useMemo(() => {
		if (theme === 'systematic') {
			const systemTheme = Appearance.getColorScheme();
			return systemTheme === 'dark' ? darkTheme : lightTheme;
		}
		return theme === 'dark' ? darkTheme : lightTheme;
	}, [theme]);

	useEffect(() => {
		const unsubscribe = configureStore.subscribe(() => {
			setTheme(configureStore.getState().settings.selectedTheme);
		});

		if (theme === 'systematic') {
			const systemTheme = Appearance.getColorScheme();
			configureStore.dispatch(changeTheme('systematic'));

			const listener = Appearance.addChangeListener(({ colorScheme }) => {
				if (colorScheme) {
					configureStore.dispatch(changeTheme('systematic'));
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
		const isDarkTheme = computedTheme === darkTheme;
		StatusBar.setBarStyle(isDarkTheme ? 'light-content' : 'dark-content');
		StatusBar.setBackgroundColor(computedTheme.header.background);
	}, [computedTheme]);

	return { theme: computedTheme, setThemeMode };
};
