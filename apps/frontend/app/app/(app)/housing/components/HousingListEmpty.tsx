import React, { memo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import AppEmptyState from '@/components/AppEmptyState';
import AppLoadingView from '@/components/AppLoadingView';

interface HousingListEmptyProps {
	loading: boolean;
	theme: any;
}

const HousingListEmpty: React.FC<HousingListEmptyProps> = ({ loading, theme }) => {
	const { translate } = useLanguage();

	if (loading) {
		return <AppLoadingView color={theme.screen.text} height={200} />;
	}

	return (
		<AppEmptyState
			iconName={null}
			message={translate(TranslationKeys.noApartmentFound)}
			style={{ height: 200, justifyContent: 'center', paddingVertical: 0 }}
		/>
	);
};

export default memo(HousingListEmpty);
