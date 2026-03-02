import { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';

export interface DownloadItemProps {
	label: string;
	/**
	 * Image shown in the middle of the QR code. Previously this image was used
	 * as the card's header background but is now passed directly to the QR code.
	 */
	imageSource: ImageSourcePropType;
	onPress?: () => void;
	containerStyle?: StyleProp<ViewStyle>;
	/**
	 * Optional value for rendering a QR code in the image section above
	 * the label.
	 */
	qrValue?: string;
}
