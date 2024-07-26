import {useSyncState} from '@/helper/syncState/SyncState';
import {PersistentStore} from '@/helper/syncState/PersistentStore';
import {useProfileLanguageCode} from '@/states/SynchedProfile';
import {useSynchedLanguageByCode} from '@/states/SynchedLanguages';
import {useIsLargeDevice} from '@/helper/device/DeviceHelper';
import {useEffect, useState} from "react";
import {useGlobalSearchParams} from "expo-router";
import {PlatformHelper} from "@/helper/PlatformHelper";

export enum DrawerConfigPosition {
    Left = 'left',
    Right = 'right',
    System = 'system'
}

export type DrawerConfig = {
    position?: DrawerConfigPosition
}

function useDrawerConfigRaw(): [DrawerConfig | null, (newValue: DrawerConfig) => void] {
	const [drawerConfigRaw, setDrawerConfigRaw] = useSyncState<DrawerConfig>(PersistentStore.drawerConfig)
	return [drawerConfigRaw, setDrawerConfigRaw]
}

function useDrawerPositionByLanguage(): DrawerConfigPosition.Left | DrawerConfigPosition.Right {
	const [languageCode, setLanguageCode] = useProfileLanguageCode()
	const language = useSynchedLanguageByCode(languageCode)
	if (language) {
		if (language.direction === 'rtl') {
			return DrawerConfigPosition.Right
		}
	}

	return DrawerConfigPosition.Left
}

export function useDrawerPositionRaw(): [DrawerConfigPosition | null, (newValue: DrawerConfigPosition) => void] {
	const [drawerConfigRaw, setDrawerConfigRaw] = useDrawerConfigRaw()

	const setPosition = (newValue: DrawerConfigPosition) => {
		const newConfig = {...drawerConfigRaw}
		newConfig.position = newValue

		if (newValue === DrawerConfigPosition.System) {
			delete newConfig.position
		}

		setDrawerConfigRaw(newConfig)
	}

	return [drawerConfigRaw?.position || null, setPosition]
}

export const SEARCH_PARAM_FULLSCREEN = "fullscreen"

export function useIsFullscreenModeFromSearchParam(): boolean {
	const [firstRender, setFirstRender] = useState(true)
	const globalSearchParams = useGlobalSearchParams()
	// globalSearchParams is null in the first render we need to check for that so we will return true in the first render
	useEffect(() => {
		setFirstRender(false)
	}, [])

	if (firstRender) {
		return true
	}

	const paramRaw = globalSearchParams?.[SEARCH_PARAM_FULLSCREEN]
	const param = paramRaw === "true"

	return param
}

export function useIsDrawerPermanentVisible(): boolean {
	const isLargeDevice = useIsLargeDevice(); // Determine if the device has a large screen.
	const isWeb = PlatformHelper.isWeb();

	const fullscreen = useIsFullscreenModeFromSearchParam()
	if(fullscreen){
		return false
	}
	return isLargeDevice && isWeb
}

export function useDrawerPosition(): [DrawerConfigPosition.Left | DrawerConfigPosition.Right, (newValue: DrawerConfigPosition) => void] {
	const [drawerPositionRaw, setPosition] = useDrawerPositionRaw()
	const drawerPositionByLanguage = useDrawerPositionByLanguage()
	let position: DrawerConfigPosition.Left | DrawerConfigPosition.Right = drawerPositionByLanguage

	if (!!drawerPositionRaw && (drawerPositionRaw === DrawerConfigPosition.Left || drawerPositionRaw === DrawerConfigPosition.Right)) {
		position = drawerPositionRaw;
	}

	// Check to only use position left or right
	if (!(position === DrawerConfigPosition.Left || position === DrawerConfigPosition.Right)) { // if position is not left or right
		position = DrawerConfigPosition.Left // set position to left
	}

	return [position, setPosition]
}

export function getDrawerPositionKeyOptions(): DrawerConfigPosition[] {
	return Object.values(DrawerConfigPosition);
}