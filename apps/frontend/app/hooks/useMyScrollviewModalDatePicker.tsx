import React, { useCallback } from 'react';
import { CalendarSheetContent } from '@/components/CalendarSheet/CalendarSheet';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';

export interface OpenDatePickerModalOptions {
	selectedDateProp?: string;
	onSelect?: (dateString: string) => void;
	updateGlobal?: boolean;
}

const useMyScrollviewModalDatePicker = () => {
	const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
	const { translate } = useLanguage();

	const openDatePickerModal = useCallback(
		(options: OpenDatePickerModalOptions = {}) => {
			showScrollViewModal({
				title: `${translate(TranslationKeys.select)} : ${translate(TranslationKeys.date)}`,
				onClose: closeScrollViewModal,
				children: (
					<CalendarSheetContent
						closeSheet={closeScrollViewModal}
						selectedDateProp={options.selectedDateProp}
						onSelect={options.onSelect}
						updateGlobal={options.updateGlobal}
					/>
				),
			});
		},
		[closeScrollViewModal, showScrollViewModal, translate]
	);

	return { openDatePickerModal, closeDatePickerModal: closeScrollViewModal };
};

export default useMyScrollviewModalDatePicker;
