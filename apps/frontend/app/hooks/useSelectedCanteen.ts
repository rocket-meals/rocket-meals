import { useGlobalSearchParams } from 'expo-router';
import useKioskMode from './useKioskMode';
import { useAppSelector } from '@/redux/hooks';
import { useMemo } from 'react';
import { shallowEqual } from 'react-redux';

export default function useSelectedCanteen() {
	const kioskMode = useKioskMode();
	const { canteens_id } = useGlobalSearchParams<{ canteens_id?: string }>();
	const { canteensDict, selectedCanteen } = useAppSelector((state) => ({
		canteensDict: state.canteenReducer.canteensDict || {},
		selectedCanteen: state.canteenReducer.selectedCanteen
	}), shallowEqual);

	return useMemo(() => {
		if (canteens_id) {
			const found = canteensDict[String(canteens_id)];
			if (found) {
				return found;
			}
		}

		if (kioskMode) {
			const firstPublished = Object.values(canteensDict).find(c => c.status === 'published');
			if (firstPublished) {
				return firstPublished;
			}
		}

		if (selectedCanteen) {
			const exists = canteensDict[String(selectedCanteen.id)];
			if (exists) {
				return exists;
			}
		}

		return null;
	}, [kioskMode, canteens_id, canteensDict, selectedCanteen]);
}
