import React from 'react';
import { View } from 'react-native';
import { FeatureWishesScreen } from 'repo-depkit-common-ui';
import { useAppSelector } from '@/redux/hooks';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';

const FeatureWishesRoute = () => {
	useSetPageTitle(TranslationKeys.feature_wishes);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor } = useAppSelector((state) => state.settings);
	const { isManagement } = useAppSelector((state) => state.authReducer);

	return (
		<View style={{ flex: 1, backgroundColor: theme.screen.background }}>
			<FeatureWishesScreen
				isAdmin={isManagement}
				primaryColor={primaryColor}
				texts={{
					introText: translate(TranslationKeys.feature_wishes_intro),
					filterPublishedLabel: translate(TranslationKeys.feature_wishes_filter_published),
					filterDraftLabel: translate(TranslationKeys.feature_wishes_filter_draft),
					approveLabel: translate(TranslationKeys.feature_wishes_approve),
					approvedLabel: translate(TranslationKeys.feature_wishes_approved),
					searchPlaceholder: translate(TranslationKeys.feature_wishes_search_placeholder),
					createButtonLabel: translate(TranslationKeys.feature_wishes_create_button),
					createModalDescriptionPlaceholder: translate(TranslationKeys.feature_wishes_create_description_placeholder),
					createModalConfirmLabel: translate(TranslationKeys.feature_wishes_create_confirm),
					pendingReviewTitle: translate(TranslationKeys.feature_wishes_pending_review_title),
					pendingReviewMessage: translate(TranslationKeys.feature_wishes_pending_review_message),
				}}
			/>
		</View>
	);
};

export default FeatureWishesRoute;
