import { useCallback } from 'react';
import Toast from 'react-native-root-toast';

const useToast = () => {
	const showToast = useCallback((message: string, type = 'success') => {
		let backgroundColor;

		switch (type) {
			case 'success':
				backgroundColor = 'green';
				break;
			case 'error':
				backgroundColor = 'red';
				break;
			default:
				backgroundColor = 'gray';
		}

		Toast.show(message, {
			duration: Toast.durations.LONG,
			position: Toast.positions.TOP,
			shadow: true,
			animation: true,
			hideOnPress: true,
			delay: 0,
			backgroundColor,
			textColor: 'white',
			containerStyle: { padding: 15, zIndex: 999999999999 },
			textStyle: { fontSize: 16 },
		});
	}, []);

	return showToast;
};

export default useToast;
