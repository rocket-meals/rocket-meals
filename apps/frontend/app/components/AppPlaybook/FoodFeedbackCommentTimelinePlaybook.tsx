import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FoodFeedbackCommentHistoryHelper, FoodFeedbackCommentUpdate } from 'repo-depkit-common';

import FoodFeedbackCommentTimeline, { FOOD_FEEDBACK_COMMENT_MAX_LENGTH } from '@/components/FoodFeedbackCommentTimeline';
import SettingsListTextInput from '@/components/SettingsListTextInput';
import { useLanguage } from '@/hooks/useLanguage';
import { useAppSelector } from '@/redux/hooks';
import { TranslationKeys } from '@/locales/keys';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A guest who changed their opinion after a recipe change: the newest comment on top. */
function buildSampleFeedback(): FoodFeedbackCommentUpdate {
	const now = Date.now();
	return FoodFeedbackCommentHistoryHelper.buildUpdate([
		{ comment: 'Seit der neuen Soße richtig lecker!', date_created: new Date(now - 10 * 60 * 1000).toISOString() },
		{ comment: 'Heute etwas besser, aber noch zu salzig.', date_created: new Date(now - 6 * DAY_MS).toISOString(), date_updated: new Date(now - 5 * DAY_MS).toISOString() },
		{ comment: 'Viel zu salzig, war doof.', date_created: new Date(now - 13 * DAY_MS).toISOString() },
		{ comment: 'Portion war auch sehr klein.', date_created: new Date(now - 13 * DAY_MS - 60 * 1000).toISOString() },
	]);
}

/**
 * Playbook page of the own comments on a food (`FoodFeedbackCommentTimeline`): the input for a new
 * comment and the timeline below it, with sample data that is only kept on this page.
 */
const FoodFeedbackCommentTimelinePlaybook = () => {
	const { translate } = useLanguage();
	const primaryColor = useAppSelector(state => state.settings.primaryColor);
	const [feedback, setFeedback] = useState<FoodFeedbackCommentUpdate>(buildSampleFeedback);

	return (
		<View style={styles.container}>
			<SettingsListTextInput
				label={translate(TranslationKeys.write_new_comment)}
				value={translate(TranslationKeys.write_a_comment)}
				initialValue={''}
				placeholder={translate(TranslationKeys.your_comment)}
				onSave={text => setFeedback(FoodFeedbackCommentHistoryHelper.addComment(feedback, text))}
				leftIcon={<MaterialCommunityIcons name="chat-outline" size={20} />}
				iconBgColor={primaryColor}
				multiline={true}
				numberOfLines={3}
				groupPosition="single"
				saveLabel={translate(TranslationKeys.save_comment)}
				hint={translate(TranslationKeys.no_personal_data_hint)}
				checkTextInput={value => ({ isValid: value.length <= FOOD_FEEDBACK_COMMENT_MAX_LENGTH, value })}
			/>
			<FoodFeedbackCommentTimeline
				entries={FoodFeedbackCommentHistoryHelper.getEntries(feedback)}
				onEdit={async (index, text) => setFeedback(FoodFeedbackCommentHistoryHelper.editEntry(feedback, index, text))}
				onDelete={async index => setFeedback(FoodFeedbackCommentHistoryHelper.removeEntry(feedback, index))}
				onDeleteAll={async () => setFeedback(FoodFeedbackCommentHistoryHelper.removeAll())}
				accentColor={primaryColor}
				headingStyle={styles.heading}
			/>
		</View>
	);
};

export default FoodFeedbackCommentTimelinePlaybook;

const styles = StyleSheet.create({
	container: {
		width: '100%',
		gap: 20,
		padding: 10,
	},
	heading: {
		fontSize: 24,
		fontFamily: 'Poppins_700Bold',
		marginVertical: 20,
	},
});
