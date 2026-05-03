import React from 'react';
import { ImageStyle, StyleProp } from 'react-native';
import MyImage from '@/components/MyImage';
import { getCompanyLogoLocalSaved } from '@/config';
import { getImageUrl } from '@/constants/HelperFunctions';
import { DatabaseTypes } from 'repo-depkit-common';

type SupportedResizeMode = 'contain' | 'cover' | 'stretch' | 'center' | 'repeat';

interface CompanyImageProps {
	appSettings?: DatabaseTypes.AppSettings | null;
	style?: StyleProp<ImageStyle>;
	resizeMode?: SupportedResizeMode;
}

const CompanyImage: React.FC<CompanyImageProps> = ({ appSettings, style, resizeMode = 'contain' }) => {
	const imageUri = appSettings?.company_image && getImageUrl(String(appSettings.company_image))?.split('?')[0];

	if (imageUri) {
		return <MyImage remote_image_url={imageUri} style={style} resizeMode={resizeMode} />;
	}

	return <MyImage defaultImage={getCompanyLogoLocalSaved()} style={style} resizeMode={resizeMode} />;
};

export default CompanyImage;
