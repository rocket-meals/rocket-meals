import React from 'react';
import { ExpoUpdateLoader as ExpoUpdateLoaderCommon } from 'repo-depkit-common-ui';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { isInExpoGo } from '@/helper/DeviceRuntimeHelper';
import { getCompanyLogoLocalSaved } from '@/config';

interface ExpoUpdateLoaderProps {
	children?: React.ReactNode;
}

const ExpoUpdateLoader: React.FC<ExpoUpdateLoaderProps> = ({ children }) => {
	const { translate } = useLanguage();

	return (
		<ExpoUpdateLoaderCommon
			logoSource={getCompanyLogoLocalSaved()}
			isExpoGo={isInExpoGo()}
			texts={{
				checkingForUpdates: translate(TranslationKeys.CHECK_FOR_APP_UPDATES),
				downloadingUpdate: translate(TranslationKeys.DOWNLOAD_NEW_APP_UPDATE),
				cancelLabel: translate(TranslationKeys.cancel),
			}}
		>
			{children}
		</ExpoUpdateLoaderCommon>
	);
};

export default ExpoUpdateLoader;

