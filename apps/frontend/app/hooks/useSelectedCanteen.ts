import { useGlobalSearchParams } from 'expo-router';
import useKioskMode from './useKioskMode';
import { useAppSelector } from '@/redux/hooks';
import { useMemo } from 'react';
import { shallowEqual } from 'react-redux';

export default function useSelectedCanteen() {
	const kioskMode = useKioskMode();
	const { canteens_id } = useGlobalSearchParams<{ canteens_id?: string }>();
	const { canteens, selectedCanteen } = useAppSelector((state) => ({
		canteens: state.canteenReducer.canteens,
		selectedCanteen: state.canteenReducer.selectedCanteen
	}), shallowEqual);

	return useMemo(() => {
		if (canteens_id) {
			const found = canteens.find(c => String(c.id) === String(canteens_id));
			if (found) {
				return found;
			}
		}

		if (kioskMode) {
			const firstPublished = canteens.find(c => c.status === 'published');
			if (firstPublished) {
				return firstPublished;
			}
		}

		if (selectedCanteen) {
			const exists = canteens.find(c => String(c.id) === String(selectedCanteen.id));
			if (exists) {
				return exists;
			}
		}

		return null;
	}, [kioskMode, canteens_id, canteens, selectedCanteen]);
}
