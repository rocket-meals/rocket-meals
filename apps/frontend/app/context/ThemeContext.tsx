import React, {
	ReactNode,
	createContext,
	useContext,
	useEffect,
	useState,
} from 'react';
import { Appearance } from 'react-native';
import { darkTheme, lightTheme } from '@/styles/themes';

export type Theme = typeof lightTheme;

type ThemeContextType = {
	theme: Theme;
	setThemeMode: (mode: 'light' | 'dark' | 'systematic') => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
	const [theme, setTheme] = useState(lightTheme);

	const setThemeMode = (mode: 'light' | 'dark' | 'systematic') => {
		if (mode === 'systematic') {
			const systemTheme = Appearance.getColorScheme();
			setTheme(systemTheme === 'dark' ? darkTheme : lightTheme);
		} else {
			setTheme(mode === 'dark' ? darkTheme : lightTheme);
		}
	};

	useEffect(() => {
		const systemTheme = Appearance.getColorScheme();
		setTheme(systemTheme === 'dark' ? darkTheme : lightTheme);

		const listener = Appearance.addChangeListener(({ colorScheme }) => {
			if (colorScheme) setTheme(colorScheme === 'dark' ? darkTheme : lightTheme);
		});

		return () => listener.remove();
	}, []);

	return (
		<ThemeContext.Provider value={{ theme, setThemeMode }}>
			{children}
		</ThemeContext.Provider>
	);
};

export const useTheme = () => {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
};
