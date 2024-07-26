import {useSyncState} from '@/helper/syncState/SyncState';
import {PersistentStore} from '@/helper/syncState/PersistentStore';
import {AppConfiguration} from "@/constants/AppConfiguration";

export function usePerformanceRaw(): [boolean | null | undefined, (value: (boolean | ((currentValue: boolean) => boolean))) => void] {
	const [resource, setResource] = useSyncState<boolean, boolean>(PersistentStore.performance)
	return [resource, setResource]
}

export function useIsPerformanceMode(): boolean {
	const [resource, setResource] = usePerformanceRaw()
	const defaultValue = AppConfiguration.DEFAULT_PERFORMANCE_MODE_ENABLED
	const resourceNullOrUndefined = resource === null || resource === undefined
	let usedValue = resourceNullOrUndefined ? defaultValue : resource
	return !!usedValue
}