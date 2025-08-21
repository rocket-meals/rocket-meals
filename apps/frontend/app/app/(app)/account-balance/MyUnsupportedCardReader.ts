import CardResponse from '@/helper/nfcCardReaderHelper/CardResponse';
import { MyCardReaderInterface } from './MyCardReader';

export default class MyUnsupportedCardReader implements MyCardReaderInterface {
	async isNfcEnabled(): Promise<boolean> {
		return false;
	}

	async isNfcSupported(): Promise<boolean> {
		return false;
	}

	async readCard(
		callBack: (answer: CardResponse | undefined) => Promise<void>,
		showInstruction: () => void,
		hideInstruction: () => void,
		nfcInstruction: string
	): Promise<void> {
		throw new Error('NFC is not supported on this device');
	}
}
