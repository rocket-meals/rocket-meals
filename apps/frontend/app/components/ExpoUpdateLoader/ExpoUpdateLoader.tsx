import React from 'react';
import { ExpoUpdateLoader as CommonExpoUpdateLoader } from 'repo-depkit-common-ui';
import usePlatformHelper from '@/helper/platformHelper';
import { TranslationKeys } from '@/locales/keys';
import { useLanguage } from '@/hooks/useLanguage';
import { isInExpoGo } from '@/helper/DeviceRuntimeHelper';

interface ExpoUpdateLoaderProps {
	children?: React.ReactNode;
}

const ExpoUpdateLoader: React.FC<ExpoUpdateLoaderProps> = ({ children }) => {
	const { isSmartPhone } = usePlatformHelper();
	const { translate } = useLanguage();

	if (!isSmartPhone()) {
		return <>{children}</>;
	}

	return (
		<CommonExpoUpdateLoader
			logoSource={require('@/assets/images/company.png')}
			labels={{
				checkForUpdate: translate(TranslationKeys.CHECK_FOR_APP_UPDATES),
				downloadUpdate: translate(TranslationKeys.DOWNLOAD_NEW_APP_UPDATE),
				cancel: translate(TranslationKeys.cancel),
			}}
			disabled={isInExpoGo()}
		>
			{children}
		</CommonExpoUpdateLoader>
	);
};

export default ExpoUpdateLoader;

