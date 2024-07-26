import {
	action,
	Actions,
	createStore,
	EasyPeasyConfig,
	FilterActionTypes,
	StateMapper,
	Store,
	thunk,
	useStoreActions,
	useStoreState
} from 'easy-peasy';
import {AfterHookType, BeforeHookType, SynchedVariableInterface} from '@/helper/syncState/SynchedVariableInterface';
import {NonPersistentStore, NonPersistentStoreValues} from '@/helper/syncState/NonPersistentStore';
import {PersistentStore, PersistentStoreValues} from '@/helper/syncState/PersistentStore';
import {StorageHelper} from '@/helper/storage/StorageHelper';
import {PersistentSecureStore, PersistentSecureStoreValues} from '@/helper/syncState/PersistentSecureStore';
import {SecureStorageHelper} from '@/helper/storage/SecureStorageHelper';
import {SecureStorageHelperAbstractClass} from '@/helper/storage/SecureStorageHelperAbstractClass';
import {useCallback} from "react";

export type SyncStateKeys = PersistentStoreValues | NonPersistentStoreValues | PersistentSecureStoreValues;

export function useSyncStateRaw<T>(storageKey: SyncStateKeys): [value: T, setValue: (value: T | ((currentValue: T) => T)) => void] {
	const value = useStoreState((state) => {
		// @ts-ignore TODO: fix this for correct type
		return state?.[storageKey]?.value
	});

	// setValue is a function which either takes a value of Type T or a function which takes the current value and returns a new value of Type T
	type setValueType = (value: T | ((currentValue: T) => T)) => void;

	// @ts-ignore TODO: fix this for correct type
	const setValue: setValueType = useStoreActions((actions) => {
		// @ts-ignore TODO: fix this for correct type
		return actions?.[storageKey]?.setValue;
	});
	return [
		value,
		setValue
	]
}

export function useSyncStateSetter<T>(storageKey: SyncStateKeys): (value: T | ((currentValue: T) => T)) => void {
	const setValue: (value: T | ((currentValue: T) => T)) => void = useStoreActions((actions) => {
		// @ts-ignore TODO: fix this for correct type
		return actions?.[storageKey]?.setValue;
	});
	return setValue;
}

export function useSyncStateValue<T, K>(storageKey: SyncStateKeys, selectorMethod?: (value: T |null | undefined) => K |null | undefined): K |null | undefined {
	/**
	const equalityFunction = (prev: K |null | undefined, next: K |null | undefined) => {
		// make a deep comparison of the previous and next value using JSON.stringify
		return JSON.stringify(prev) === JSON.stringify(next);
	}
		*/
	const equalityFunction = undefined;

	const value: K |null | undefined = useStoreState((state) => {
		// @ts-ignore
		let value: T |null | undefined = state?.[storageKey]?.value as T |null | undefined
		if (!selectorMethod) {
			return value as K |null | undefined;
		} else {
			return selectorMethod(value);
		}
	}, equalityFunction)

	return value;
}

/**
 * This function reads from the global store. In order to get the desired value please provide a selectorMethod which takes the value of the store and returns the desired value.
 * This helps to avoid unnecessary re-renders.
 * If no selectorMethod is provided the raw value from the store is returned.
 * @param storageKey
 * @param selectorMethod
 * (value: T | ((currentValue: T) => T)) => void
 */
export function useSyncState<T, K>(storageKey: SyncStateKeys, selectorMethod?: (value: T |null | undefined) => K |null | undefined): [K |null | undefined,	setValue: (value: T | ((currentValue: T) => T)) => void] {
	const value = useSyncStateValue(storageKey, selectorMethod);
	const setValue = useSyncStateSetter(storageKey);

	return [
		value,
		setValue
	]
}

export function useAllSyncStates(): {[key: string]: {value: any, setValue: any, rawValue: any}}
{
	const persistentStoreKeyValues = Object.values(PersistentStore);
	const nonPersistentStoreKeyValues = Object.values(NonPersistentStore);
	const persistentSecureStoreKeyValues = Object.values(PersistentSecureStore);

	const allKeys = persistentStoreKeyValues.concat(nonPersistentStoreKeyValues).concat(persistentSecureStoreKeyValues);

	const allStates: {[key: string]: any} = {};

	for (let i=0; i<allKeys.length; i++) {
		const key = allKeys[i];
		const [value, setValue] = useSyncState(key);
		allStates[key] = {
			value: value,
			setValue: setValue,
		}
	}

	return allStates;
}

interface Model {
    [key: string]: {
        value: any;
        setValue: any;
        setValueSync: any;
    };
}

export class SyncState {
	private static instance?: SyncState = undefined;
	private storeRetrieved: boolean = false;
	private initialized: boolean = false;

	private globalSynchedStoreModels: {[key: string] : SynchedVariableInterface} = {};

	private setLoadState: ((state: boolean) => void) | undefined = undefined;

	constructor() {

	}

	static getInstance() {
		if (SyncState.instance) {
			return SyncState.instance
		}
		SyncState.instance = new SyncState();
		return SyncState.instance;
	}

	static setLoadState(setStorageLoaded: (state: boolean) => void) {
		SyncState.getInstance().setLoadState = setStorageLoaded
	}

	private setInitFinished() {
		const setLoadState = this.setLoadState
		if (setLoadState) {
			setLoadState(true);
		}
	}

	async reset() {
		SyncState.getInstance().initialized = false;
		SyncState.getInstance().globalSynchedStoreModels = {};
		await SyncState.getInstance().clear();

		const setLoadState = SyncState.getInstance().setLoadState
		if (setLoadState) {
			setLoadState(false);
		}
	}

	async init() {
		await SecureStorageHelperAbstractClass.getInstance().init();

		await this.registerSyncStateVariablesNonPersistentStore();
		await this.registerSyncStateVariablesPersistentStore();
		await this.registerSyncStateVariablesPersistentSecure();

		this.initialized = true;
		this.setInitFinished();
	}

	async clear() {
		await SecureStorageHelperAbstractClass.clear();
		await StorageHelper.clear();
	}

	private async getKeysOfClass(classRef: typeof PersistentStore | typeof NonPersistentStore | typeof PersistentSecureStore ) {
		const additionalClassKeys = Object.keys(classRef) as Array<keyof typeof classRef>;
		const additionalKeys: string[] = [];
		for (const key of additionalClassKeys) {
			const value: any = classRef[key];
			if (typeof value === 'string') {
				additionalKeys.push(value);
			}
		}

		return additionalKeys;
	}

	private async registerSyncStateVariablesPersistentStore() {
		const additionalKeys: string[] = await this.getKeysOfClass(PersistentStore);

		const beforeHook = async (storageKey: string, state: any, payload: Object) => {
			//console.log("beforeHook persistent", storageKey, payload)

			let payloadString = JSON.stringify(payload);
			await StorageHelper.setItem(storageKey, payloadString);
			const valueAsString = await StorageHelper.getItem(storageKey);
			if (valueAsString !== payloadString) {
				console.error('Error setting item', storageKey, payload, valueAsString);
				return true; // cancel action
			}
			return false; // do not cancel action
		}

		for (let i=0; i<additionalKeys.length; i++) {
			const key = additionalKeys[i];
			const valueString = await StorageHelper.getItem(key);
			let value = null;
			try{
				if (valueString) {
					value = JSON.parse(valueString);
				}
			} catch (e) {
				console.error('Error parsing value', key, valueString, e);
			}
			this.registerSyncState(key, value, beforeHook, undefined, undefined);
		}
	}



	private async registerSyncStateVariablesPersistentSecure() {
		const additionalKeys: string[] = await this.getKeysOfClass(PersistentSecureStore);

		const beforeHook = async (storageKey: string, state: any, payload: Object) => {
			//console.log("beforeHook persistent secure", storageKey, payload)

			const payloadString = JSON.stringify(payload);
			await SecureStorageHelper.setItem(storageKey, payloadString);
			const valueAsString = await SecureStorageHelper.getItem(storageKey);
			if (valueAsString !== payloadString) {
				console.error('Error setting item', storageKey, payload, valueAsString);
				return true; // cancel action
			}
			return false; // do not cancel action
		}

		for (let i=0; i<additionalKeys.length; i++) {
			const key = additionalKeys[i];
			const valueString = await SecureStorageHelper.getItem(key);
			let value = null;
			try{
				if (valueString) {
					value = JSON.parse(valueString);
				}
			} catch (e) {
				console.error('Error parsing value', key, valueString, e);
			}
			this.registerSyncState(key, value, beforeHook, undefined, undefined);
		}
	}

	private async registerSyncStateVariablesNonPersistentStore() {
		const additionalKeys: string[] = await this.getKeysOfClass(NonPersistentStore);

		this.registerSyncStates(additionalKeys);
	}


	private registerSyncState(key: string, defaultValue?: string, beforeHook?: BeforeHookType, afterHook?: AfterHookType, override?: boolean) {
		if (this.storeRetrieved) {
			return new Error('Register State before getStore()');
		}

		const additionalModel = this.globalSynchedStoreModels[key];
		if (!!additionalModel && !override) {
			return new Error('Additional variable for storage already exists for that key: '+key);
		}
		this.globalSynchedStoreModels[key] = new SynchedVariableInterface(key, defaultValue, beforeHook, afterHook);
	}

	private registerSyncStates(listOfKeys: string[] | string, defaultValue?: string, beforeHook?: BeforeHookType, afterHook?: AfterHookType, override?: boolean) {
		if (typeof listOfKeys === 'string') {
			listOfKeys = [listOfKeys];
		}

		for (let i=0; i<listOfKeys.length; i++) {
			const key = listOfKeys[i];
			this.registerSyncState(key, defaultValue, beforeHook, afterHook, override);
		}
	}

	private async handleAction(actions:  Actions<{}>, storageKey: string, state: StateMapper<FilterActionTypes<{}>>, payload: Object, aditionalStoreModel: SynchedVariableInterface) {
		const beforeHook = aditionalStoreModel.beforeHook;
		const afterHook = aditionalStoreModel.afterHook;
		let cancel = false;
		if (beforeHook) {
			cancel = await beforeHook(storageKey, state, payload);
		}
		if (!cancel) {
			//console.log("handleAction", storageKey, payload)
			// @ts-ignore
			actions.setValueSync(payload);

			if (afterHook) {
				await afterHook(storageKey, state, payload);
			}
		}
	}

	private handleActionSync(state: StateMapper<FilterActionTypes<{}>>, payload: Object) {
		// @ts-ignore // TODO fix this for correct type
		state.value = payload;
	}

	getStore(): Store<Model, EasyPeasyConfig<undefined, {}>> {
		if (!this.initialized) {
			throw new Error('SyncState call init() before getStore()');
		}

		const model: Model = {};

		const additionalKeys = Object.keys(this.globalSynchedStoreModels);

		//console.log("GetStore");
		for (let i=0; i<additionalKeys.length; i++) {
			const key = additionalKeys[i];
			const additionalStoreModel: SynchedVariableInterface = this.globalSynchedStoreModels[key];
			const storageKey = additionalStoreModel.key;

			//console.log("storageKey", storageKey, additionalStoreModel.defaultValue)


			model[storageKey] = {
				value: additionalStoreModel.defaultValue,
				setValueSync: action((state, payload) => {
					this.handleActionSync(state, payload);
				}),
				setValue: thunk(async (actions, payload, { getState }) => {
					// Check if payload is a function and call it with current state if it is
					const newValue = typeof payload === 'function' ? await payload(getState().value) : payload;

					// Proceed with the action handling using the resolved newValue
					await this.handleAction(actions, storageKey, actions, newValue, additionalStoreModel);
				})
			};
		}

		return createStore(
			model
		);
	}
}