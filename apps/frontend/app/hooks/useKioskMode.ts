import { useGlobalSearchParams } from 'expo-router';

export default function useKioskMode(): boolean {
	const { kioskMode } = useGlobalSearchParams<{ kioskMode?: string }>();
	return kioskMode === 'true';
}
