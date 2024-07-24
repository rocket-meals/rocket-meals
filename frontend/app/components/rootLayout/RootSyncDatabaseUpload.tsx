import {DependencyList, ReactNode, useEffect, useState} from 'react';
import {useIsServerCached, useIsServerOffline, useIsServerOnline} from '@/states/SyncStateServerInfo';
import {useIsDemo} from '@/states/SynchedDemo';
import {useCurrentUser, useIsCurrentUserAnonymous} from '@/states/User';
import {LoadingScreenDatabase} from '@/compositions/loadingScreens/LoadingScreenDatabase';
import {PleaseConnectFirstTimeWithInternet} from '@/compositions/loadingScreens/PleaseConnectFirstTimeWithInternet';
import {useSynchedDevices} from '@/states/SynchedDevices';
import {RootTranslationKey, useRootTranslation} from "@/helper/translations/RootTranslation";

export {
	// Catch any errors thrown by the Layout component.
	ErrorBoundary,
} from 'expo-router';

export interface RootAuthUserFlowLoaderProps {
  children?: ReactNode;
  syncForUserId: string | undefined
}

export interface RootAuthUserFlowLoaderInnerProps {
  children?: ReactNode;
  setSyncComplete: (finished: boolean) => void
}

export const RootSyncDatabaseUploadInner = (props: RootAuthUserFlowLoaderInnerProps) => {
	//console.log("AuthFlowUserCheck")

	const isServerOnline = useIsServerOnline()
	const isServerCached = useIsServerCached();

	const translation_sync_user_settings = useRootTranslation(RootTranslationKey.SYNC_USER_SETTINGS)

	const [currentUser, setUserWithCache] = useCurrentUser();
	const isCurrentUserAnonymous = useIsCurrentUserAnonymous();

	const demo = useIsDemo()
	const [nowInMs, setNowInMs] = useState<number>(new Date().getTime());
	const nowInMsKey = nowInMs.toString();

	const registeredItemsToLoad: any[] = [];

	const [currentDevice, devices, setDevices, cacheHelperObjDevices] = useSynchedDevices()

	const synchedResourcesToDownloadFirst: {[key: string]: {data: any, lastUpdate: string | undefined}} = {}

	function addSynchedResourceToDownloadFirst(label: string, resource: any, lastUpdate: string | undefined) {
		registeredItemsToLoad.push(resource);
		synchedResourcesToDownloadFirst[label] = {
			data: resource,
			lastUpdate: lastUpdate
		}
	}

	/**
   * Needs to be called before the useEffect
   */
	if (!isCurrentUserAnonymous) {
		addSynchedResourceToDownloadFirst('devices', devices, cacheHelperObjDevices.sync_cache_composed_key_local)
	}

	function getDependencies(): DependencyList {
		return registeredItemsToLoad;
	}

	const itemsToLoad = getDependencies();

	function checkSynchedResources() {
		//console.log("--- checkSynchedResources ---");
		const synchedResourceKeys = Object.keys(synchedResourcesToDownloadFirst)
		for (let i = 0; i < synchedResourceKeys.length; i++) {
			let isResourceSynched = false;
			const synchedResourceKey = synchedResourceKeys[i]
			const synchedResourceInformation = synchedResourcesToDownloadFirst[synchedResourceKey]
			const synchedResource = synchedResourceInformation?.data
			const synchedResourceLastUpdate = synchedResourceInformation?.lastUpdate
			//console.log("synchedResourceKey", synchedResourceKey)
			//console.log("synchedResourceInformation: ",synchedResourceInformation);
			if (isServerOnline) { // if server is online, we can check if we are logged in
				//console.log("server is online");
				if (synchedResourceLastUpdate != null) {
					isResourceSynched = !!synchedResource && synchedResourceLastUpdate === nowInMsKey
				} else {
					isResourceSynched = false
				}
			} else if (isServerCached) { // if server is offline, but we have cached data, we can check if we are logged in
				isResourceSynched = !!synchedResource
			}
			if (!isResourceSynched) {
				return false;
			}
		}
		return true
	}

	useEffect(() => {
		(async () => {
			//console.log("AuthFlowUserCheck useEffect")
			//console.log("refreshToken", refreshToken)

			await cacheHelperObjDevices.updateFromServer(nowInMsKey)
		})();
	}, []);

	useEffect(() => {
		//console.log("Check if sync is complete: ")
		const syncComplete = demo || checkSynchedResources()
		//console.log("syncComplete: "+syncComplete);
		if (syncComplete) {
			props.setSyncComplete(true);
		}
	}, itemsToLoad);

	const key = JSON.stringify(synchedResourcesToDownloadFirst);
	// @ts-ignore
	//todo: fix this
	return <LoadingScreenDatabase text={translation_sync_user_settings} nowInMs={nowInMs} key={key} synchedResources={synchedResourcesToDownloadFirst} />
}

export const RootSyncDatabaseUpload = (props: RootAuthUserFlowLoaderProps) => {
	const isServerOffline = useIsServerOffline()

	const syncForUserId = props.syncForUserId;
	const [syncedForUserId, setSyncedForUserId] = useState<any>({
		userId: false
	});
	const setSyncComplete = (bool: boolean) => {
		setSyncedForUserId({
			userId: syncForUserId
		})
	}

	if (isServerOffline) {
		return <PleaseConnectFirstTimeWithInternet />
	}

	const syncComplete = syncedForUserId.userId === syncForUserId;
	if (!syncComplete) {
		return <RootSyncDatabaseUploadInner setSyncComplete={setSyncComplete} />
	}

	return (
		props.children
	)
}