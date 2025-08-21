import React from 'react';
import { Image, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { QrCodeEcl, QrCodeProps } from './types';

const QrCode: React.FC<QrCodeProps> = ({
	value,
	size = 200,
	image,
	imageUrl,
	innerSize = 21,
	ecl,
	backgroundColor = 'white',
	margin = 0,
	quietZone = 5,
}) => {
	const imageSource = image ? image : imageUrl ? { uri: imageUrl } : undefined;

	const clampedInnerSize = Math.max(0, Math.min(30, innerSize));
	const marginSize = size * (margin / 100);
	const innerSizePx = size * (clampedInnerSize / 100);
	const containerSize = innerSizePx + marginSize * 2;

	const calculatedEcl = (() => {
		if (clampedInnerSize <= 7) return QrCodeEcl.L;
		if (clampedInnerSize <= 15) return QrCodeEcl.M;
		if (clampedInnerSize <= 25) return QrCodeEcl.Q;
		return QrCodeEcl.H;
	})();
	const qrEcl = ecl ?? calculatedEcl;

	return (
		<View
			style={{
				width: size,
				height: size,
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<QRCode value={value} size={size} ecl={qrEcl} quietZone={quietZone} />
			{imageSource && (
				<View
					style={{
						position: 'absolute',
						left: (size - containerSize) / 2,
						top: (size - containerSize) / 2,
						width: containerSize,
						height: containerSize,
						backgroundColor,
						alignItems: 'center',
						justifyContent: 'center',
						borderRadius: 2,
					}}
				>
					<Image
						source={imageSource}
						style={{
							width: innerSizePx,
							height: innerSizePx,
							resizeMode: 'contain',
						}}
					/>
				</View>
			)}
		</View>
	);
};

export default QrCode;
