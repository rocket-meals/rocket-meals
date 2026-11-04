import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { Platform, StatusBar, useColorScheme } from 'react-native';
import { darkTheme, lightTheme } from '@/styles/themes';
import { configureStore } from '@/redux/store';

type ThemeMode = 'light' | 'dark' | 'systematic';

const changeTheme = (mode: ThemeMode) => ({
	type: 'CHANGE_THEME',
	payload: mode,
});

const subscribeToStore = (onChange: () => void) => configureStore.subscribe(onChange);
const getSelectedTheme = (): ThemeMode => configureStore.getState().settings.selectedTheme;

/**
 * The app's color theme. Used by more than 200 components, so it must stay cheap:
 * it only reads the selected mode from the store (works outside the Redux Provider, the
 * root layout uses it there) and follows the system appearance via useColorScheme.
 *
 * It used to dispatch CHANGE_THEME('systematic') in every component that mounted. Each of
 * those created a new settings object, re-rendered every component selecting the settings
 * and rewrote the persisted state, so opening a screen cost seconds on a slow phone.
 */
export const useTheme = () => {
	const selectedTheme = useSyncExternalStore(subscribeToStore, getSelectedTheme, getSelectedTheme);
	const systemScheme = useColorScheme();

	const computedTheme = useMemo(() => {
		const mode = selectedTheme === 'systematic' ? systemScheme : selectedTheme;
		return mode === 'dark' ? darkTheme : lightTheme;
	}, [selectedTheme, systemScheme]);

	const setThemeMode = useCallback((mode: ThemeMode) => {
		configureStore.dispatch(changeTheme(mode));
	}, []);

	return { theme: computedTheme, setThemeMode };
};

/** Keeps the status bar in line with the theme. Called once, in the root layout. */
export const useThemeStatusBar = () => {
	const { theme } = useTheme();
	const isDark = theme === darkTheme;

	useEffect(() => {
		StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
		if (Platform.OS === 'android') {
			StatusBar.setBackgroundColor(theme.header.background);
		}
	}, [isDark, theme]);
};
