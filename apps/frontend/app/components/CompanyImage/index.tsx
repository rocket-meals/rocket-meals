import React from 'react';
import { ImageResizeMode, ImageStyle, StyleProp } from 'react-native';
import MyImage from '@/components/MyImage';
import useCustomerConfig from '@/hooks/useCustomerConfig';
import { getImageUrl } from '@/constants/HelperFunctions';
import { DatabaseTypes } from 'repo-depkit-common';

interface CompanyImageProps {
	appSettings?: DatabaseTypes.AppSettings | null;
	style?: StyleProp<ImageStyle>;
	resizeMode?: Exclude<ImageResizeMode, 'none'>;
}

const CompanyImage: React.FC<CompanyImageProps> = ({ appSettings, style, resizeMode = 'contain' }) => {
	// The tenant chosen in the settings (store variable), not only the one of the build.
	const customerConfig = useCustomerConfig();
	const imageUri = appSettings?.company_image && getImageUrl(String(appSettings.company_image))?.split('?')[0];

	if (imageUri) {
		return <MyImage remote_image_url={imageUri} style={style} resizeMode={resizeMode} />;
	}

	return <MyImage defaultImage={customerConfig.images.company_logo_source_get_for_react_native()} style={style} resizeMode={resizeMode} />;
};

export default CompanyImage;
