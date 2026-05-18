import React, { memo } from 'react';
import { TranslationKeys } from '@/locales/keys';
import AppEmptyState from '@/components/AppEmptyState';
import AppLoadingView from '@/components/AppLoadingView';

interface CampusEmptyStateProps {
	loading: boolean;
	theme: any;
	translate: (key: string) => string;
}

const CampusEmptyState: React.FC<CampusEmptyStateProps> = ({ loading, theme, translate }) => {
	if (loading) {
		return <AppLoadingView color={theme.screen.text} height={200} />;
	}

	return (
		<AppEmptyState
			iconName={null}
			message={translate(TranslationKeys.no_campus_found)}
			style={{ height: 200, justifyContent: 'center', paddingVertical: 0 }}
		/>
	);
};

export default memo(CampusEmptyState);
