import React, { ReactNode } from 'react';
import { ExpoUpdateChecker as ExpoUpdateCheckerCommon, useExpoUpdateChecker } from 'repo-depkit-common-ui';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { isInExpoGo } from '@/helper/DeviceRuntimeHelper';

export { useExpoUpdateChecker };

interface ExpoUpdateCheckerProps {
	children?: ReactNode;
}

const ExpoUpdateChecker: React.FC<ExpoUpdateCheckerProps> = ({ children }) => {
	const { translate } = useLanguage();

	return (
		<ExpoUpdateCheckerCommon
			isExpoGo={isInExpoGo()}
			texts={{
				updateAvailableTitle: translate(TranslationKeys.update_available),
				updateAvailableMessage: translate(TranslationKeys.update_available_message),
				noUpdatesTitle: translate(TranslationKeys.updates),
				noUpdatesMessage: translate(TranslationKeys.no_updates_available),
				cancelLabel: translate(TranslationKeys.cancel),
				okayLabel: translate(TranslationKeys.okay),
				updateLabel: translate(TranslationKeys.to_update),
			}}
		>
			{children}
		</ExpoUpdateCheckerCommon>
	);
};

export default ExpoUpdateChecker;

