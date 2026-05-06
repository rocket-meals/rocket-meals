import React, { useCallback, useRef, useState } from 'react';
import PopupEventSheet from '@/components/PopupEventSheet/PopupEventSheet';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { PopupEventHelper } from '@/helper/PopupEventHelper';
import { useDispatch, shallowEqual } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { SET_POPUP_EVENTS } from '@/redux/Types/types';
import useKioskMode from '@/hooks/useKioskMode';

const usePopupEventModal = () => {
	const dispatch = useDispatch();
	const kioskMode = useKioskMode();
	const popupEventsDict = useAppSelector((state) => state.food.popupEventsDict || {}, shallowEqual);
	const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
	const popupEventShownIdRef = useRef<string | null>(null);
	const [currentPopupEvent, setCurrentPopupEvent] = useState<any | null>(null);

	const markEventAsOpen = useCallback(
		(event: any) => {
			if (!event) return;
			const updatedEvents = Object.values(popupEventsDict).map((e: any) => (e.id === event.id ? { ...e, isOpen: true } : e));
			dispatch({ type: SET_POPUP_EVENTS, payload: updatedEvents });
		},
		[dispatch, popupEventsDict]
	);

	const closeEventSheet = useCallback(
		(event?: any) => {
			const targetEvent = event || currentPopupEvent;
			closeScrollViewModal();
			if (targetEvent) {
				markEventAsOpen(targetEvent);
			}
			popupEventShownIdRef.current = null;
			setCurrentPopupEvent(null);
		},
		[closeScrollViewModal, currentPopupEvent, markEventAsOpen]
	);

	const closeEventSheetForSession = useCallback(
		(event?: any) => {
			const targetEvent = event || currentPopupEvent;
			closeScrollViewModal();
			if (targetEvent?.id) {
				PopupEventHelper.dismiss(targetEvent.id);
			}
			popupEventShownIdRef.current = null;
			setCurrentPopupEvent(null);
		},
		[closeScrollViewModal, currentPopupEvent]
	);

	const openActiveModal = useCallback(() => {
		if (kioskMode) return;

		const nextEvent = Object.values(popupEventsDict)?.find((e: any) => !e.isOpen && !PopupEventHelper.isDismissed(e.id));
		if (!nextEvent) return;

		const eventId = String(nextEvent.id ?? '');
		if (popupEventShownIdRef.current === eventId) return;
		popupEventShownIdRef.current = eventId;

		setCurrentPopupEvent(nextEvent);

		showScrollViewModal(
			{
				onClose: () => closeEventSheetForSession(nextEvent),
				children: (
					<PopupEventSheet
						closeSheet={() => closeEventSheet(nextEvent)}
						dismissSheet={() => closeEventSheetForSession(nextEvent)}
						eventData={nextEvent}
					/>
				),
			},
			{}
		);
	}, [closeEventSheet, closeEventSheetForSession, kioskMode, popupEventsDict, showScrollViewModal]);

	return { openActiveModal, activePopupEvent: currentPopupEvent, popupEvents: Object.values(popupEventsDict) };
};

export default usePopupEventModal;
