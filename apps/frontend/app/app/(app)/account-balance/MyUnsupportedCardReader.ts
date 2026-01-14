import CardResponse from '@/helper/nfcCardReaderHelper/CardResponse';
import { isRunningInExpoGo } from 'expo';
import {MyCardReaderInterface, MyCardReaderResponseSupport} from "@/app/(app)/account-balance/MyCardReaderInterface";

const isExpoGo = isRunningInExpoGo();

export default class MyUnsupportedCardReader implements MyCardReaderInterface {
	async isNfcEnabled(): Promise<MyCardReaderResponseSupport> {
		if (isExpoGo) {
			return { result: false, message: 'NFC is not supported in Expo Go' };
		}
		return { result: false, message: 'NFC is not supported on this device' };
	}

	async isNfcSupported(): Promise<MyCardReaderResponseSupport> {
		if (isExpoGo) {
			return { result: false, message: 'NFC is not supported in Expo Go' };
		}
		return { result: false, message: 'NFC is not supported on this device' };
	}

	async readCard(callBack: (answer: CardResponse | undefined) => Promise<void>, showInstruction: () => void, hideInstruction: () => void, nfcInstruction: string): Promise<void> {
		throw new Error('NFC is not supported on this device');
	}
}
