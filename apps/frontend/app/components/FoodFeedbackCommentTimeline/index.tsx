import React, { useCallback, useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { FoodFeedbackCommentEntry, FoodFeedbackCommentHistoryHelper } from 'repo-depkit-common';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import ProjectButton from '@/components/ProjectButton';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import useMyScrollviewTextInputModal from '@/hooks/useMyScrollviewTextInputModal';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';

/** Longest comment the input accepts, the same as for a new comment. */
export const FOOD_FEEDBACK_COMMENT_MAX_LENGTH = 120;

export type FoodFeedbackCommentTimelineProps = {
	/** The own comments, newest first (`FoodFeedbackCommentHistoryHelper.getEntries`). */
	entries: readonly FoodFeedbackCommentEntry[];
	onEdit: (index: number, text: string) => Promise<void>;
	onDelete: (index: number) => Promise<void>;
	onDeleteAll: () => Promise<void>;
	/** Shown instead of the "delete all" icon while a change is saved. */
	loading?: boolean;
	accentColor: string;
	headingStyle?: StyleProp<TextStyle>;
};

function pad(value: number): string {
	return String(value).padStart(2, '0');
}

function formatTime(date: string): string {
	const value = new Date(date);
	return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

/** `YYYY-MM-DD` to `DD.MM.YYYY`. */
function formatDay(day: string): string {
	const [year, month, date] = day.split('-');
	return `${date}.${month}.${year}`;
}

/**
 * The own comments on a food as a timeline: the newest on top, one block per day with the date
 * above it and a line between the days. Every entry can be edited or deleted, all of them can be
 * deleted at once. Writing a new comment happens in the input above the timeline.
 */
const FoodFeedbackCommentTimeline: React.FC<FoodFeedbackCommentTimelineProps> = ({ entries, onEdit, onDelete, onDeleteAll, loading, accentColor, headingStyle }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { openTextInputModal } = useMyScrollviewTextInputModal();
	const { show, close } = useMyScrollViewModal();

	const groups = useMemo(() => FoodFeedbackCommentHistoryHelper.groupByDay(entries), [entries]);

	const getDayLabel = useCallback(
		(day: string) => {
			const now = new Date();
			const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
			if (day === FoodFeedbackCommentHistoryHelper.getDayKey(now.toISOString())) {
				return translate(TranslationKeys.today);
			}
			if (day === FoodFeedbackCommentHistoryHelper.getDayKey(yesterday.toISOString())) {
				return translate(TranslationKeys.yesterday);
			}
			return translate(TranslationKeys.comment_written_on).replace('{{date}}', formatDay(day));
		},
		[translate]
	);

	const openEdit = useCallback(
		(index: number, entry: FoodFeedbackCommentEntry) => {
			openTextInputModal({
				title: translate(TranslationKeys.edit_comment),
				placeholder: translate(TranslationKeys.your_comment),
				initialValue: entry.comment,
				saveLabel: translate(TranslationKeys.save_comment),
				multiline: true,
				numberOfLines: 3,
				hint: translate(TranslationKeys.no_personal_data_hint),
				checkTextInput: (value) => ({ isValid: value.length <= FOOD_FEEDBACK_COMMENT_MAX_LENGTH, value }),
				onSave: (value) => onEdit(index, value),
			});
		},
		[onEdit, openTextInputModal, translate]
	);

	const openDeleteAll = useCallback(() => {
		show(
			{
				children: (
					<View style={styles.confirm}>
						<Text style={[styles.confirmTitle, { color: theme.screen.text }]}>{translate(TranslationKeys.delete_all_comments)}</Text>
						<Text style={{ color: theme.screen.text }}>{translate(TranslationKeys.delete_all_comments_confirm)}</Text>
						<ProjectButton
							text={translate(TranslationKeys.delete_all_comments)}
							onPress={async () => {
								close();
								await onDeleteAll();
							}}
							style={styles.confirmButton}
						/>
						<TouchableOpacity onPress={close} style={styles.cancel}>
							<Text style={{ color: theme.screen.text }}>{translate(TranslationKeys.cancel)}</Text>
						</TouchableOpacity>
					</View>
				),
			},
			{}
		);
	}, [close, onDeleteAll, show, theme.screen.text, translate]);

	if (entries.length === 0) {
		return null;
	}

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={[headingStyle, { color: theme.screen.text }]}>{translate(TranslationKeys.your_comments)}</Text>
				<TouchableOpacity
					style={[styles.iconButton, { backgroundColor: theme.screen.iconBg }]}
					onPress={openDeleteAll}
					disabled={loading}
					accessibilityRole="button"
					accessibilityLabel={translate(TranslationKeys.delete_all_comments)}
				>
					{loading ? <LoadingIndicator color={accentColor} size={20} /> : <MaterialIcons name="delete-sweep" size={24} color={'red'} />}
				</TouchableOpacity>
			</View>
			{groups.map((group, groupIndex) => (
				<View key={group.day}>
					{groupIndex > 0 && <View style={[styles.daySeparator, { backgroundColor: theme.screen.text }]} />}
					<Text style={[styles.dayLabel, { color: accentColor }]}>{getDayLabel(group.day)}</Text>
					{group.entries.map(({ entry, index }) => (
						<View key={`${entry.date_created}-${index}`} style={styles.entry}>
							<View style={styles.entryContent}>
								<Text style={[styles.entryText, { color: theme.screen.text }]}>{entry.comment}</Text>
								<Text style={[styles.entryMeta, { color: theme.screen.text }]}>
									{formatTime(entry.date_created)}
									{entry.date_updated ? ` · ${translate(TranslationKeys.comment_edited)}` : ''}
								</Text>
							</View>
							<TouchableOpacity style={styles.entryAction} onPress={() => openEdit(index, entry)} accessibilityRole="button" accessibilityLabel={translate(TranslationKeys.edit_comment)}>
								<MaterialCommunityIcons name="pencil" size={20} color={theme.screen.icon} />
							</TouchableOpacity>
							<TouchableOpacity style={styles.entryAction} onPress={() => onDelete(index)} accessibilityRole="button" accessibilityLabel={translate(TranslationKeys.delete_comment)}>
								<MaterialIcons name="delete-outline" size={20} color={'red'} />
							</TouchableOpacity>
						</View>
					))}
				</View>
			))}
		</View>
	);
};

export default FoodFeedbackCommentTimeline;

const styles = StyleSheet.create({
	container: {
		width: '100%',
		marginBottom: 10,
	},
	header: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	iconButton: {
		width: 45,
		height: 45,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
	},
	daySeparator: {
		width: '100%',
		height: StyleSheet.hairlineWidth,
		opacity: 0.3,
		marginVertical: 12,
	},
	dayLabel: {
		fontSize: 14,
		fontFamily: 'Poppins_700Bold',
		marginBottom: 4,
	},
	entry: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingVertical: 6,
		gap: 4,
	},
	entryContent: {
		flex: 1,
	},
	entryText: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	entryMeta: {
		fontSize: 12,
		fontFamily: 'Poppins_400Regular',
		opacity: 0.6,
		marginTop: 2,
	},
	entryAction: {
		padding: 6,
	},
	confirm: {
		gap: 12,
	},
	confirmTitle: {
		fontSize: 18,
		fontWeight: '600',
	},
	confirmButton: {
		marginVertical: 0,
	},
	cancel: {
		alignSelf: 'center',
		paddingVertical: 6,
	},
});
