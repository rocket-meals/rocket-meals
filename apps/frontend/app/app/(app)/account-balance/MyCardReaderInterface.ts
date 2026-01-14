import CardResponse from '@/helper/nfcCardReaderHelper/CardResponse';

export type MyCardReaderResponseSupport = {
	result: boolean;
	message?: string;
	error?: any;
};

export interface MyCardReaderInterface {
	isNfcSupported: () => Promise<MyCardReaderResponseSupport>;
	isNfcEnabled: () => Promise<MyCardReaderResponseSupport>;
	readCard: (callBack: (answer: CardResponse | undefined) => Promise<void>, showInstruction: () => void, hideInstruction: () => void, nfcInstruction: string) => Promise<void>;
}