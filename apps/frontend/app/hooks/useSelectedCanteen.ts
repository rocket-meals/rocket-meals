import { useGlobalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { RootState } from '@/redux/reducer';

export default function useSelectedCanteen() {
  const { kioskMode, canteens_id } = useGlobalSearchParams<{
    kioskMode?: string;
    canteens_id?: string;
  }>();
  const { canteens, selectedCanteen } = useSelector(
    (state: RootState) => state.canteenReducer,
  );

  return useMemo(() => {
    if (kioskMode === 'true') {
      if (canteens_id) {
        const found = canteens.find(
          (c) => String(c.id) === String(canteens_id),
        );
        if (found) {
          return found;
        }
      }
      if (selectedCanteen) {
        return selectedCanteen;
      }
    }
    return selectedCanteen;
  }, [kioskMode, canteens_id, canteens, selectedCanteen]);
}
