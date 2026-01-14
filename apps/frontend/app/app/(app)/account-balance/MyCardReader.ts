import {isRunningInExpoGo} from 'expo';
import {Platform} from 'react-native';
import MyNativeCardReader from './MyNativeCardReader';
import MyUnsupportedCardReader from './MyUnsupportedCardReader';
import {MyCardReaderInterface} from "@/app/(app)/account-balance/MyCardReaderInterface";

export default function useMyCardReader(): MyCardReaderInterface {
	const isExpoGo = isRunningInExpoGo();

	if ((Platform.OS === 'android' || Platform.OS === 'ios') && !isExpoGo) {
		return new MyNativeCardReader();
	}

	return new MyUnsupportedCardReader();
}
