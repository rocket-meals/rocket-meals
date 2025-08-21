import React, { forwardRef } from 'react';
import type BottomSheet from '@gorhom/bottom-sheet';
import BaseBottomSheet from '../BaseBottomSheet';
import MenuSheet from '../MenuSheet/MenuSheet';
import { useTheme } from '@/hooks/useTheme';

export interface MarkingBottomSheetProps {
	onClose: () => void;
}

const MarkingBottomSheet = forwardRef<BottomSheet, MarkingBottomSheetProps>(
	({ onClose }, ref) => {
		const { theme } = useTheme();

		return (
			<BaseBottomSheet
				ref={ref}
				index={-1}
				backgroundStyle={{ backgroundColor: theme.sheet.sheetBg }}
				enablePanDownToClose
				handleComponent={null}
				onClose={onClose}
			>
				<MenuSheet closeSheet={onClose} />
			</BaseBottomSheet>
		);
	}
);

export default MarkingBottomSheet;
