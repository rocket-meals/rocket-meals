import React from 'react';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import VerticalImageScroll from '@/components/VerticalImageScroll';

const VerticalImageScrollScreen = () => {
	useSetPageTitle(TranslationKeys.vertical_image_scroll);
	return <VerticalImageScroll />;
};

export default VerticalImageScrollScreen;
