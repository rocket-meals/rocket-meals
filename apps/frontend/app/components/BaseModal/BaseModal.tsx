import React, {PropsWithChildren, useEffect, useState} from 'react';
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import { AntDesign } from '@expo/vector-icons';
import { styles } from './styles';
import { useTheme } from '@/hooks/useTheme';

type BaseModalOwnProps = {
	isVisible: boolean;
	title?: string;
	onClose: () => void;
};

export type BaseModalProps = PropsWithChildren<BaseModalOwnProps>;

const BaseModal: React.FC<BaseModalProps> = ({ isVisible, title, onClose, children }) => {
	const { theme } = useTheme();

	const getModalWidth = (windowWidth: number) => {
		if (windowWidth < 800) return '100%';
		if (windowWidth >= 800 && windowWidth <= 1200) return 700;
		return 600;
	};

	const [modalWidth, setModalWidth] = useState(() => getModalWidth(Dimensions.get('window').width));

	useEffect(() => {
		const handleResize = () => {
			const windowWidth = Dimensions.get('window').width;
			setModalWidth(getModalWidth(windowWidth));
		};

		const subscription = Dimensions.addEventListener('change', handleResize);
		return () => subscription.remove();
	}, []);

	return (
		<Modal isVisible={isVisible} style={styles.modalContainer} onBackdropPress={onClose}>
			<View style={[styles.modalView, { backgroundColor: theme.modal.modalBg, width: modalWidth }]}>
				<View style={styles.modalHeader}>
					<TouchableOpacity style={[styles.closeButton, { backgroundColor: theme.modal.closeBg }]} onPress={onClose}>
						<AntDesign name="close" size={28} color={theme.modal.closeIcon} />
					</TouchableOpacity>
				</View>
				{title && (
					<Text
						style={{
							...styles.modalHeading,
							color: theme.modal.text,
							fontSize: Dimensions.get('window').width < 500 ? 26 : 36,
						}}
					>
						{title}
					</Text>
				)}
				<ScrollView style={styles.scrollView} nestedScrollEnabled contentContainerStyle={{ flexGrow: 1 }}>
					{children}
				</ScrollView>
			</View>
		</Modal>
	);
};

export default BaseModal;
