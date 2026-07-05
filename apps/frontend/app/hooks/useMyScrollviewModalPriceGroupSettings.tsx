import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import LottieView from 'lottie-react-native';
import animation from '@/assets/animations/priceGroup.json';
import { replaceLottieColors } from '@/helper/animationHelper';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { useAppSelector } from '@/redux/hooks';
import PriceGroupSettingsList from '@/components/PriceGroupSettingsList';

const styles = StyleSheet.create({
	container: {
		width: '100%',
		alignItems: 'center',
	},
	lottieWrapper: {
		width: 220,
		height: 220,
		marginBottom: 16,
	},
	lottie: {
		width: '100%',
		height: '100%',
	},
	listWrapper: {
		width: '100%',
	},
});

const PriceGroupModalContent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const { primaryColor, appSettings } = useAppSelector((state) => state.settings);
	// Lottie animation JSON uses a dynamic structure; any is consistent with project pattern
	const [animationJson, setAnimationJson] = useState<any>(null);
	const animationRef = useRef<LottieView>(null);

	useEffect(() => {
		const json = replaceLottieColors(animation, primaryColor);
		setAnimationJson(json);
	}, [primaryColor]);

	useEffect(() => {
		if (animationJson && appSettings?.animations_auto_start && animationRef.current) {
			animationRef.current.play();
		}
	}, [animationJson, appSettings?.animations_auto_start]);

	return (
		<View style={styles.container}>
			{animationJson && (
				<View style={styles.lottieWrapper}>
					{/* @ts-expect-error LottieView autoPlay prop is missing from the type definitions */}
					<LottieView
						ref={animationRef}
						source={animationJson}
						resizeMode="contain"
						style={styles.lottie}
						autoPlay={appSettings?.animations_auto_start}
						loop={false}
					/>
				</View>
			)}
			<View style={styles.listWrapper}>
				<PriceGroupSettingsList onSelect={onClose} />
			</View>
		</View>
	);
};

export const useMyScrollviewModalPriceGroupSettings = () => {
	const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
	const { translate } = useLanguage();

	const openPriceGroupSettingsModal = useCallback(() => {
		showScrollViewModal({
			title: translate(TranslationKeys.price_group),
			disableHorizontalPadding: true,
			children: <PriceGroupModalContent onClose={closeScrollViewModal} />,
		});
	}, [showScrollViewModal, closeScrollViewModal, translate]);

	return { openPriceGroupSettingsModal };
};

export default useMyScrollviewModalPriceGroupSettings;
