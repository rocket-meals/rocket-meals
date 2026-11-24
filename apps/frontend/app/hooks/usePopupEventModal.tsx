import React, { useCallback, useEffect, useRef, useState } from 'react';
import PopupEventSheet from '@/components/PopupEventSheet/PopupEventSheet';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { useDispatch, shallowEqual } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { SET_POPUP_EVENTS } from '@/redux/Types/types';
import useKioskMode from '@/hooks/useKioskMode';
import type { ModalCloseReason } from 'repo-depkit-common-ui';
import { DatabaseTypes, isNewsShownAt, NewsDisplayLocations } from 'repo-depkit-common';

const usePopupEventModal = () => {
	const dispatch = useDispatch();
	const kioskMode = useKioskMode();
	const popupEvents = useAppSelector((state) => state.food.popupEvents, shallowEqual);
	const { showAndDiscardOthers: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
	const popupEventShownIdRef = useRef<string | null>(null);
	const [currentPopupEvent, setCurrentPopupEvent] = useState<Partial<DatabaseTypes.News> | null>(null);

	// Events the user closed only via the header X button, backdrop tap or swipe-down
	// in THIS app session. Those closes are deliberately NOT persisted as "seen"
	// (redux isOpen stays false, so the event shows up again next app session) - but
	// they must be remembered in-memory, otherwise the queue logic below would
	// immediately re-open the event the user just closed.
	const sessionClosedIdsRef = useRef<Set<string>>(new Set());
	// Armed right before the sheet's explicit "Schließen und nicht erneut anzeigen"
	// button triggers its close, so handleClosed can tell a permanent dismiss apart
	// from a mere get-me-out-of-here close (X button / backdrop / swipe).
	const permanentDismissEventIdRef = useRef<string | null>(null);

	// The events are news shown outside the news list. One is still eligible for the popup queue if it
	// is meant as popup (display_locations, the food offers cards are NewsFoodoffersHint) and was
	// neither permanently dismissed (persisted isOpen flag) nor closed earlier in this session.
	const isEventPending = (e: any) => Boolean(e) && isNewsShownAt(e, NewsDisplayLocations.popup) && !e.isOpen && !sessionClosedIdsRef.current.has(String(e.id ?? ''));

	// Kept in sync with the redux value below, but also written to directly inside
	// markEventAsOpen so handleClosed can read the just-updated list synchronously,
	// without waiting for a redux round-trip and re-render.
	const popupEventsRef = useRef(popupEvents);
	useEffect(() => {
		popupEventsRef.current = popupEvents;
	}, [popupEvents]);

	const markEventAsOpen = useCallback(
		(event: any) => {
			if (!event) return;
			const updatedEvents = popupEventsRef.current.map((e: any) => (e.id === event.id ? { ...e, isOpen: true } : e));
			popupEventsRef.current = updatedEvents;
			dispatch({ type: SET_POPUP_EVENTS, payload: updatedEvents });
		},
		[dispatch]
	);

	// Always points at the latest showEvent so handleClosed can call it without a
	// circular useCallback dependency (handleClosed -> showEvent -> onClosed -> handleClosed).
	const showEventRef = useRef<(event: any) => void>(() => {});

	// The single place that decides what happens once a popup event's sheet is gone.
	// Driven by the modal stack's onClosed signal (see ModalProvider): for a real close
	// ('closed') it only fires AFTER the sheet's close animation is confirmed finished -
	// a pure signal, never a guessed timeout. Opening the next event from in here is
	// therefore always safe and always happens: there is no close animation left in
	// flight that could tear the next popup down, and no timer that could fire too early
	// or too late.
	const handleClosed = useCallback(
		(event: any, reason: ModalCloseReason) => {
			popupEventShownIdRef.current = null;
			setCurrentPopupEvent(null);
			const eventId = String(event?.id ?? '');
			const wasPermanentDismiss = permanentDismissEventIdRef.current === eventId;
			permanentDismissEventIdRef.current = null;

			if (reason !== 'closed') {
				// The sheet was replaced by some other modal (openAndDiscardOthers), not
				// closed by the user. Don't mark the event as seen - it can be shown again
				// later - and don't chain the next event here: it would immediately replace
				// whatever modal just took over the sheet.
				return;
			}

			if (event) {
				if (wasPermanentDismiss) {
					// "Schließen und nicht erneut anzeigen" - persist the dismissal, the
					// event never shows again.
					markEventAsOpen(event);
				} else {
					// X button / backdrop / swipe: only closed for now. Don't persist
					// isOpen (the event shows again next app session), just keep it from
					// re-opening within the current one.
					sessionClosedIdsRef.current.add(eventId);
				}
			}

			if (kioskMode) return;
			const nextEvent = popupEventsRef.current?.find(isEventPending);
			if (!nextEvent) return;
			showEventRef.current(nextEvent);
		},
		[kioskMode, markEventAsOpen]
	);

	const showEvent = useCallback(
		(event: any) => {
			popupEventShownIdRef.current = String(event.id ?? '');
			setCurrentPopupEvent(event);
			// Only the sheet's own button goes through here - the header X, backdrop and
			// swipe close paths bypass it - so arming the permanent-dismiss marker here is
			// what lets handleClosed distinguish "nicht erneut anzeigen" from a mere close.
			const dismissPermanentlyAndClose = () => {
				permanentDismissEventIdRef.current = String(event.id ?? '');
				closeScrollViewModal();
			};
			showScrollViewModal(
				{
					children: <PopupEventSheet closeSheet={dismissPermanentlyAndClose} eventData={event} />,
				},
				{
					onClosed: (reason: ModalCloseReason) => handleClosed(event, reason),
				}
			);
		},
		[closeScrollViewModal, handleClosed, showScrollViewModal]
	);
	showEventRef.current = showEvent;

	const openActiveModal = useCallback(() => {
		if (kioskMode) return;

		const nextEvent = popupEvents?.find(isEventPending);
		if (!nextEvent) return;

		const eventId = String(nextEvent.id ?? '');
		if (popupEventShownIdRef.current === eventId) return;

		showEvent(nextEvent);
	}, [kioskMode, popupEvents, showEvent]);

	return { openActiveModal, activePopupEvent: currentPopupEvent, popupEvents };
};

export default usePopupEventModal;
