import { Platform } from 'react-native';
import { MyCardReaderInterface } from './MyCardReader';
import { isRunningInExpoGo } from 'expo';
import CardResponse from '@/helper/nfcCardReaderHelper/CardResponse';
import CardReader from '@/helper/nfcCardReaderHelper/CardReader';

const isExpoGo = isRunningInExpoGo();

let NfcManager: any;
let NfcTech: any;

if (!isExpoGo) {
	// Expo Go does not have this module boundled by default, therefore we need to lazy load it to prevent errors
	import('react-native-nfc-manager').then(nfcManager => {
		NfcManager = nfcManager.default;
		NfcTech = nfcManager.NfcTech;
	});
}

export default class MyNativeCardReader implements MyCardReaderInterface {
	async isNfcEnabled(): Promise<boolean> {
		if (isExpoGo || !NfcManager) return false;
		return await NfcManager.isEnabled();
	}

	async isNfcSupported(): Promise<boolean> {
		if (isExpoGo || !NfcManager) return false;
		return await NfcManager.isSupported();
	}

	async readCard(
		callBack: (answer: CardResponse | undefined) => Promise<void>,
		showInstruction: () => void,
		hideInstruction: () => void,
		nfcInstruction: string
	): Promise<void> {
		if (isExpoGo || !NfcManager) {
			console.error('NFC operations are not supported in this environment.');
			return;
		}

		if (Platform.OS === 'android') {
			// only show instruction on android since ios has a built in instruction
			showInstruction();
		}

		const reader = new CardReader(NfcManager, NfcTech, Platform);
		try {
			console.log('DEBUG: start reading card');
			const newAnswer = await reader.readCard(nfcInstruction);
			console.log('Answer');
			console.log(newAnswer);
			await callBack(newAnswer);
			hideInstruction();
		} catch (e: any) {
			throw e;
		}
	}
}
