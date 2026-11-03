import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { FeatureWishHelper, FeatureWishProgress, FeatureWishStatus } from 'repo-depkit-common';
import { MyButton, MyDeleteButton, MyEditButton, MySubmitButton, MyUpdateButton, SettingsListLikeButton } from 'repo-depkit-common-ui';
import SettingsList from '@/components/SettingsList';
import SettingsGroupTitle from '@/components/SettingsGroupTitle';
import ModalTextInput from '@/components/ModalTextInput';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import useToast from '@/hooks/useToast';
import usePushNotificationOptInPrompt from '@/hooks/usePushNotificationOptInPrompt';
import { useFeatureWishesMode } from '@/hooks/useFeatureWishesMode';
import { PushNotificationOptInCategory } from '@/helper/PushNotificationOptInHelper';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { SET_FEATURE_WISHES_LOCAL_DATA } from '@/redux/Types/types';
import { FeatureWish, FeatureWishesHelper, loadFeatureWishFieldChoices } from '@/redux/actions/FeatureWishes/FeatureWishes';
import { TranslationKeys } from '@/locales/keys';
import { configureStore } from '@/redux/store';
import type { FeatureWishesLocalState } from '@/redux/Types/stateTypes';
import { CollectionKeys } from '@/constants/collectionKeys';
import { DirectusFieldChoiceHelper } from '@/helper/DirectusFieldChoiceHelper';
import { myContrastColor } from '@/helper/ColorHelper';
import { Icon } from '@/helper/iconHelper';

type FeatureWishesLocal = FeatureWishesLocalState;

/**
 * A wish as the modal shows it, own or someone else's. For an own duplicate (`merged`) `original` is
 * the wish it now counts for, and that one is what the list shows.
 */
type WishView = {
	id: string;
	title: string;
	description: string | null;
	status: string;
	progress: string | null;
	likesAmount: number;
	notePublic: string | null;
	dateUpdated: string | null;
	dateCreated: string | null;
	relatedToId: string | null;
	original: FeatureWish | null;
	isOwn: boolean;
	editable: boolean;
	deletable: boolean;
};

const PROGRESS_KEYS: Record<string, TranslationKeys> = {
	[FeatureWishProgress.COLLECTED]: TranslationKeys.feature_wishes_progress_collected,
	[FeatureWishProgress.PLANNED]: TranslationKeys.feature_wishes_progress_planned,
	[FeatureWishProgress.IN_PROGRESS]: TranslationKeys.feature_wishes_progress_in_progress,
	[FeatureWishProgress.RELEASED]: TranslationKeys.feature_wishes_progress_released,
	[FeatureWishProgress.NOT_PLANNED]: TranslationKeys.feature_wishes_progress_not_planned,
};

const POPULAR_LIMIT = 20;
const STATUS_CHOICES_KEY = DirectusFieldChoiceHelper.getKey(CollectionKeys.FEATURE_WHISHES, 'status');
const PROGRESS_CHOICES_KEY = DirectusFieldChoiceHelper.getKey(CollectionKeys.FEATURE_WHISHES, 'progress');

function getGroupPosition(index: number, total: number): 'single' | 'top' | 'middle' | 'bottom' {
	if (total === 1) {
		return 'single';
	}
	if (index === 0) {
		return 'top';
	}
	return index === total - 1 ? 'bottom' : 'middle';
}

/** The device data straight from the store: modal content keeps the callbacks it was opened with, their values would be stale. */
function readFeatureWishesLocal(): FeatureWishesLocal {
	const local = configureStore.getState().settings.featureWishesLocal as Partial<FeatureWishesLocal> | undefined;
	return {
		tileHiddenAt: local?.tileHiddenAt ?? null,
		ownWishes: local?.ownWishes ?? [],
		likeIdsByWishId: local?.likeIdsByWishId ?? {},
		submittedAt: local?.submittedAt ?? [],
	};
}

const useFeatureWishesLocal = () => {
	const dispatch = useAppDispatch();
	const local = useAppSelector(state => state.settings.featureWishesLocal);
	const value: FeatureWishesLocal = useMemo(
		() => ({
			tileHiddenAt: local?.tileHiddenAt ?? null,
			ownWishes: local?.ownWishes ?? [],
			likeIdsByWishId: local?.likeIdsByWishId ?? {},
			submittedAt: local?.submittedAt ?? [],
		}),
		[local]
	);
	const update = useCallback((payload: Partial<FeatureWishesLocal>) => dispatch({ type: SET_FEATURE_WISHES_LOCAL_DATA, payload }), [dispatch]);
	return { local: value, update };
};

/** The status that decides how a wish looks: for a public wish its progress, otherwise its review state. */
function getVisualField(view: WishView): { key: string; value: string | null } {
	if (view.status === FeatureWishStatus.MERGED && view.original) {
		return { key: PROGRESS_CHOICES_KEY, value: view.original.progress ?? FeatureWishProgress.COLLECTED };
	}
	if (view.status === FeatureWishStatus.PUBLISHED) {
		return { key: PROGRESS_CHOICES_KEY, value: view.progress ?? FeatureWishProgress.COLLECTED };
	}
	return { key: STATUS_CHOICES_KEY, value: view.status };
}

/** Color and icon of a state as set in the Directus data model, with the app's look as fallback. */
const useChoiceVisual = (view: WishView) => {
	const { theme } = useTheme();
	const { primaryColor, selectedTheme } = useAppSelector(state => state.settings);
	const choicesByField = useAppSelector(state => state.settings.directusFieldChoices);
	const { key, value } = getVisualField(view);
	const choice = DirectusFieldChoiceHelper.findChoice(choicesByField?.[key], value);
	const backgroundColor = DirectusFieldChoiceHelper.resolveColor(choice?.color, { primary: primaryColor, text: theme.screen.text }) ?? primaryColor;
	const icon = DirectusFieldChoiceHelper.toIconName(choice?.icon, MaterialIcons.glyphMap);
	const iconColor = myContrastColor(backgroundColor, theme as Parameters<typeof myContrastColor>[1], selectedTheme === 'dark');
	return { backgroundColor, icon, iconColor };
};

const ChoiceIcon: React.FC<{ view: WishView; size?: number; color?: string }> = ({ view, size = 24, color }) => {
	const visual = useChoiceVisual(view);
	return <Icon name={visual.icon ?? 'MaterialCommunityIcons:lightbulb-on-outline'} size={size} color={color ?? visual.iconColor} />;
};

/** Texts for the state of a wish, shared by the list and the details. */
const useWishTexts = () => {
	const { translate } = useLanguage();
	const { language } = useAppSelector(state => state.settings);

	const getProgressLabel = useCallback(
		(progress: string | null | undefined) => translate(PROGRESS_KEYS[progress ?? FeatureWishProgress.COLLECTED] ?? TranslationKeys.feature_wishes_progress_collected),
		[translate]
	);

	const getStateLabel = useCallback(
		(view: WishView): string => {
			if (view.status === FeatureWishStatus.MERGED) {
				return getProgressLabel(view.original?.progress);
			}
			if (view.status === FeatureWishStatus.PUBLISHED) {
				return getProgressLabel(view.progress);
			}
			if (view.status === FeatureWishStatus.ARCHIVED) {
				return translate(TranslationKeys.feature_wishes_status_declined);
			}
			return translate(TranslationKeys.feature_wishes_status_in_review);
		},
		[translate, getProgressLabel]
	);

	/** Extra lines: why a duplicate shows another wish, when an archived wish disappears. */
	const getExtraLines = useCallback(
		(view: WishView): string[] => {
			const lines: string[] = [];
			if (view.status === FeatureWishStatus.MERGED) {
				lines.push(translate(TranslationKeys.feature_wishes_merged_hint));
			}
			if (view.status === FeatureWishStatus.ARCHIVED) {
				const deletionDate = FeatureWishHelper.getArchivedDeletionDate({ status: view.status, date_updated: view.dateUpdated, date_created: view.dateCreated });
				if (deletionDate) {
					lines.push(`${translate(TranslationKeys.feature_wishes_removed_on)} ${deletionDate.toLocaleDateString(language, { day: 'numeric', month: 'long', year: 'numeric' })}`);
				}
				if (view.editable) {
					lines.push(translate(TranslationKeys.feature_wishes_revise_hint));
				}
			}
			return lines;
		},
		[translate, language]
	);

	return { getStateLabel, getExtraLines };
};

/** Whether a wish is not public yet: it shows its review state instead of likes, nobody can like it yet. */
function isUnpublished(view: WishView): boolean {
	return view.status !== FeatureWishStatus.PUBLISHED && view.status !== FeatureWishStatus.MERGED;
}

/** The review state of an own wish that is not public yet, with an edit icon while it can still be changed. */
const ReviewState: React.FC<{ label: string; editable: boolean }> = ({ label, editable }) => {
	const { theme } = useTheme();
	return (
		<View style={styles.reviewState}>
			<Text style={[styles.reviewStateText, { color: theme.screen.text }]}>{label}</Text>
			{editable ? <MaterialCommunityIcons name="pencil" size={18} color={theme.screen.icon} /> : null}
		</View>
	);
};

/** The number of likes of a wish, shown next to own wishes instead of a like button. */
const LikesCount: React.FC<{ amount: number }> = ({ amount }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	return (
		<View style={styles.likesCount} accessible accessibilityLabel={`${amount} ${translate(TranslationKeys.feature_wishes_likes)}`}>
			<MaterialCommunityIcons name="thumb-up-outline" size={18} color={theme.screen.icon} />
			<Text style={[styles.likesCountText, { color: theme.screen.text }]}>{amount}</Text>
		</View>
	);
};

type FeatureWishFormProps = {
	initialTitle?: string;
	initialDescription?: string;
	isEdit: boolean;
	showReviewAgainHint: boolean;
	onSubmit: (title: string, description: string | null) => Promise<void>;
};

/** The sub modal to submit a wish or to update an own one. */
const FeatureWishForm: React.FC<FeatureWishFormProps> = ({ initialTitle, initialDescription, isEdit, showReviewAgainHint, onSubmit }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const showToast = useToast();
	const { selectedTheme } = useAppSelector(state => state.settings);
	const [title, setTitle] = useState(initialTitle ?? '');
	const [description, setDescription] = useState(initialDescription ?? '');
	const [submitting, setSubmitting] = useState(false);

	const unchanged = isEdit && title.trim() === (initialTitle ?? '').trim() && description.trim() === (initialDescription ?? '').trim();

	const handleSubmit = useCallback(async () => {
		if (submitting || unchanged) {
			return;
		}
		const text = FeatureWishHelper.validateText({ title, description });
		if (!text.ok) {
			showToast(translate(TranslationKeys.feature_wishes_title_missing), 'error');
			return;
		}
		Keyboard.dismiss();
		setSubmitting(true);
		try {
			await onSubmit(text.title, text.description);
		} catch (error) {
			console.error('Could not save the feature wish', error);
			showToast(translate(TranslationKeys.feature_wishes_error), 'error');
		} finally {
			setSubmitting(false);
		}
	}, [submitting, unchanged, title, description, onSubmit, showToast, translate]);

	const inputStyle = [styles.input, { color: theme.screen.text, borderColor: theme.screen.placeholder }];
	// The placeholder gray was hardly readable on the hint box, the text takes the contrast color of the box.
	const hintColor = myContrastColor(theme.screen.iconBg, theme as Parameters<typeof myContrastColor>[1], selectedTheme === 'dark');
	const hintStyle = [styles.hint, { color: hintColor, backgroundColor: theme.screen.iconBg }];

	return (
		<View style={styles.form}>
			{isEdit ? null : <Text style={hintStyle}>{translate(TranslationKeys.feature_wishes_form_intro)}</Text>}
			<Text style={[styles.label, { color: theme.screen.text }]}>{translate(TranslationKeys.feature_wishes_field_title)}</Text>
			<ModalTextInput
				value={title}
				onChangeText={setTitle}
				maxLength={FeatureWishHelper.TITLE_MAX_LENGTH}
				style={inputStyle}
				placeholderTextColor={theme.screen.placeholder}
				accessibilityLabel={translate(TranslationKeys.feature_wishes_field_title)}
				// Enter in the title sends the wish, the description is optional.
				returnKeyType={isEdit ? 'done' : 'send'}
				onSubmitEditing={() => void handleSubmit()}
				// No autoFocus: the form replaces the content of the already open sheet, and a focus while
				// it mounts passes the sheet's keyboard tracking, so the sheet did not lift above the
				// keyboard and the button stayed hidden. A tap into the field lifts it as it should.
			/>
			<Text style={[styles.counter, { color: theme.screen.placeholder }]}>{`${title.length} / ${FeatureWishHelper.TITLE_MAX_LENGTH}`}</Text>
			<Text style={[styles.label, { color: theme.screen.text }]}>{translate(TranslationKeys.feature_wishes_field_description)}</Text>
			<ModalTextInput
				value={description}
				onChangeText={setDescription}
				maxLength={FeatureWishHelper.DESCRIPTION_MAX_LENGTH}
				multiline
				numberOfLines={5}
				textAlignVertical="top"
				style={[inputStyle, styles.inputMultiline]}
				placeholderTextColor={theme.screen.placeholder}
				accessibilityLabel={translate(TranslationKeys.feature_wishes_field_description)}
			/>
			<Text style={hintStyle}>{translate(TranslationKeys.feature_wishes_hint)}</Text>
			{showReviewAgainHint ? (
				<Text style={hintStyle}>{translate(TranslationKeys.feature_wishes_edit_published_hint)}</Text>
			) : null}
			{isEdit ? (
				<MyUpdateButton onPress={handleSubmit} disabled={unchanged} loading={submitting} style={styles.submit} />
			) : (
				<MySubmitButton onPress={handleSubmit} loading={submitting} style={styles.submit} />
			)}
		</View>
	);
};

type FeatureWishDetailsProps = {
	view: WishView;
	likeId: string | null;
	onEdit: () => void;
	onDeleted: () => void;
};

/** Details of a wish: state, description, likes, note of the team and what the user may do with it. */
const FeatureWishDetails: React.FC<FeatureWishDetailsProps> = ({ view, likeId: initialLikeId, onEdit, onDeleted }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const showToast = useToast();
	const { primaryColor } = useAppSelector(state => state.settings);
	const mode = useFeatureWishesMode();
	const { update } = useFeatureWishesLocal();
	const helper = useMemo(() => new FeatureWishesHelper(), []);
	const { getStateLabel, getExtraLines } = useWishTexts();
	const visual = useChoiceVisual(view);
	const [likeId, setLikeId] = useState<string | null>(initialLikeId);
	const [likesAmount, setLikesAmount] = useState(view.original?.likes_amount ?? view.likesAmount);
	const [busy, setBusy] = useState(false);

	const shown = view.original ?? null;
	const description = shown ? shown.description : view.description;
	const canLike = FeatureWishHelper.mayVote(mode) && !view.isOwn && view.status === FeatureWishStatus.PUBLISHED;

	const toggleLike = useCallback(async () => {
		if (busy) {
			return;
		}
		setBusy(true);
		try {
			const nextLikes = { ...readFeatureWishesLocal().likeIdsByWishId };
			if (likeId) {
				await helper.deleteItem(likeId);
				delete nextLikes[view.id];
				setLikeId(null);
				setLikesAmount(amount => Math.max(0, amount - 1));
			} else {
				const newLikeId = await helper.createLike(view.id);
				nextLikes[view.id] = newLikeId;
				setLikeId(newLikeId);
				setLikesAmount(amount => amount + 1);
			}
			update({ likeIdsByWishId: nextLikes });
		} catch (error) {
			console.error('Could not change the like of a feature wish', error);
			showToast(translate(TranslationKeys.feature_wishes_error), 'error');
		} finally {
			setBusy(false);
		}
	}, [busy, likeId, helper, view.id, update, showToast, translate]);

	const deleteWish = useCallback(async () => {
		setBusy(true);
		try {
			await helper.deleteItem(view.id);
			const local = readFeatureWishesLocal();
			update({ ownWishes: local.ownWishes.filter(wish => wish.id !== view.id) });
			showToast(translate(TranslationKeys.feature_wishes_deleted), 'success');
			onDeleted();
		} catch (error) {
			console.error('Could not delete the feature wish', error);
			showToast(translate(TranslationKeys.feature_wishes_error), 'error');
			setBusy(false);
		}
	}, [helper, view.id, update, showToast, translate, onDeleted]);

	const noteTeam = shown ? shown.moderation_note_public : view.notePublic;

	return (
		<View style={styles.form}>
			<View style={styles.stateRow}>
				<View style={[styles.stateIcon, { backgroundColor: visual.backgroundColor }]}>
					<ChoiceIcon view={view} size={18} />
				</View>
				<Text style={[styles.stateLabel, { color: theme.screen.text }]}>{getStateLabel(view)}</Text>
				<View style={styles.spacer} />
				{canLike ? (
					<SettingsListLikeButton liked={!!likeId} likeCount={likesAmount} likeLoading={busy} onPressLike={toggleLike} primaryColor={primaryColor} />
				) : (
					<LikesCount amount={likesAmount} />
				)}
			</View>
			{getExtraLines(view).map(line => (
				<Text key={line} style={[styles.detailSub, { color: theme.screen.placeholder }]}>
					{line}
				</Text>
			))}
			{description ? <Text style={[styles.detailText, { color: theme.screen.text }]}>{description}</Text> : null}
			{noteTeam ? (
				<Text style={[styles.hint, { color: theme.screen.placeholder, backgroundColor: theme.screen.iconBg }]}>
					{`${translate(TranslationKeys.feature_wishes_note_from_team)}: ${noteTeam}`}
				</Text>
			) : null}
			{view.editable ? <MyEditButton onPress={onEdit} /> : null}
			{view.deletable ? <MyDeleteButton onPress={deleteWish} loading={busy} confirmQuestion={translate(TranslationKeys.feature_wishes_delete_question)} /> : null}
		</View>
	);
};

type FeatureWishesListProps = {
	openForm: (options: { wish?: WishView }) => void;
	openDetails: (view: WishView, likeId: string | null) => void;
};

function toOwnView(row: FeatureWish, isSignedIn: boolean): WishView {
	return {
		id: row.id,
		title: row.title ?? '',
		description: row.description ?? null,
		status: row.status,
		progress: row.progress ?? null,
		likesAmount: row.likes_amount ?? FeatureWishHelper.AUTHOR_LIKES,
		notePublic: row.moderation_note_public ?? null,
		dateUpdated: row.date_updated ?? null,
		dateCreated: row.date_created ?? null,
		relatedToId: FeatureWishHelper.getRelatedToId(row),
		original: null,
		isOwn: true,
		editable: isSignedIn && FeatureWishHelper.isEditable(row),
		// Signed in: all own wishes. Without account: the ones that are not public (see the policies).
		deletable: isSignedIn || row.status !== FeatureWishStatus.PUBLISHED,
	};
}

function toPopularView(wish: FeatureWish): WishView {
	return { ...toOwnView(wish, false), isOwn: false, editable: false, deletable: false };
}

/**
 * Content of the feature wishes modal: submit button, own wishes, most liked published wishes.
 * The modal only renders its topmost content, so the list mounts again (and reloads) when a sub
 * modal goes back to it.
 */
const FeatureWishesList: React.FC<FeatureWishesListProps> = ({ openForm, openDetails }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const showToast = useToast();
	const dispatch = useAppDispatch();
	const { primaryColor } = useAppSelector(state => state.settings);
	const choicesByField = useAppSelector(state => state.settings.directusFieldChoices);
	const { profile } = useAppSelector(state => state.authReducer);
	const profileId: string | null = profile?.id ?? null;
	const mode = useFeatureWishesMode();
	const mayVote = FeatureWishHelper.mayVote(mode);
	const { local, update } = useFeatureWishesLocal();
	const helper = useMemo(() => new FeatureWishesHelper(), []);
	const { getStateLabel, getExtraLines } = useWishTexts();

	const [loading, setLoading] = useState(true);
	const [popular, setPopular] = useState<WishView[]>([]);
	const [ownViews, setOwnViews] = useState<WishView[]>([]);
	const [likeIdsByWishId, setLikeIdsByWishId] = useState<Record<string, string>>(local.likeIdsByWishId);
	const [likeLoadingId, setLikeLoadingId] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			// Without voting the wishes of others are not listed, so they are not loaded either.
			const popularWishes = mayVote ? await helper.fetchPopular(POPULAR_LIMIT) : [];
			let views: WishView[] = [];
			let likes: Record<string, string> = { ...local.likeIdsByWishId };

			if (profileId) {
				const ownRows = await helper.fetchOwn(profileId);
				likes = {};
				for (const row of ownRows) {
					const relatedToId = FeatureWishHelper.getRelatedToId(row);
					if (FeatureWishHelper.isLike(row) && relatedToId) {
						likes[relatedToId] = row.id;
					}
				}
				views = ownRows.filter(row => !FeatureWishHelper.isLike(row)).map(row => toOwnView(row, true));
			}

			// Wishes submitted on this device without account: also shown after signing in, they are
			// not linked to the profile.
			const serverIds = new Set(views.map(view => view.id));
			const deviceWishes = local.ownWishes.filter(wish => !serverIds.has(wish.id));
			if (deviceWishes.length > 0) {
				const states = await helper.fetchStatesByIds(deviceWishes.map(wish => wish.id));
				const statesById = new Map(states.map(state => [state.id, state]));
				// Wishes the server no longer knows (deleted after being archived) disappear from the device too.
				const missingIds = new Set(deviceWishes.filter(wish => !statesById.has(wish.id)).map(wish => wish.id));
				if (missingIds.size > 0) {
					update({ ownWishes: local.ownWishes.filter(wish => !missingIds.has(wish.id)) });
				}
				const deviceViews = deviceWishes
					.filter(wish => statesById.has(wish.id))
					// Without account nobody can prove the wish is theirs, so it cannot be edited.
					.map(wish => toOwnView({ ...(statesById.get(wish.id) as FeatureWish), title: wish.title, description: null }, false));
				views = [...views, ...deviceViews];
			}

			// Merged wishes show the original they now count for (published, so readable for everyone).
			const originalIds = views.filter(view => view.status === FeatureWishStatus.MERGED && view.relatedToId).map(view => view.relatedToId as string);
			const originals = await helper.fetchByIds([...new Set(originalIds)]);
			const originalsById = new Map(originals.map(original => [original.id, original]));
			views = views.map(view => (view.status === FeatureWishStatus.MERGED && view.relatedToId ? { ...view, original: originalsById.get(view.relatedToId) ?? null } : view));

			setPopular(popularWishes.map(toPopularView));
			setOwnViews(views);
			setLikeIdsByWishId(likes);
		} catch (error) {
			console.error('Could not load feature wishes', error);
			showToast(translate(TranslationKeys.feature_wishes_error), 'error');
		} finally {
			setLoading(false);
		}
	}, [mayVote, helper, profileId, local.ownWishes, local.likeIdsByWishId, update, showToast, translate]);

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [profileId]);

	useEffect(() => {
		// The colors and icons usually come with the regular update, this covers a first start.
		if (!choicesByField?.[STATUS_CHOICES_KEY] || !choicesByField?.[PROGRESS_CHOICES_KEY]) {
			void loadFeatureWishFieldChoices(dispatch);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const toggleLike = useCallback(
		async (view: WishView) => {
			if (likeLoadingId) {
				return;
			}
			setLikeLoadingId(view.id);
			const existingLikeId = likeIdsByWishId[view.id];
			try {
				const nextLikes = { ...likeIdsByWishId };
				if (existingLikeId) {
					await helper.deleteItem(existingLikeId);
					delete nextLikes[view.id];
				} else {
					nextLikes[view.id] = await helper.createLike(view.id);
				}
				const delta = existingLikeId ? -1 : 1;
				setLikeIdsByWishId(nextLikes);
				update({ likeIdsByWishId: nextLikes });
				setPopular(current => current.map(item => (item.id === view.id ? { ...item, likesAmount: Math.max(0, item.likesAmount + delta) } : item)));
			} catch (error) {
				console.error('Could not change the like of a feature wish', error);
				showToast(translate(TranslationKeys.feature_wishes_error), 'error');
			} finally {
				setLikeLoadingId(null);
			}
		},
		[likeLoadingId, likeIdsByWishId, helper, update, showToast, translate]
	);

	// Own wishes and the originals of own duplicates are already listed under "Your wishes".
	const ownIds = useMemo(() => new Set(ownViews.flatMap(view => (view.original ? [view.id, view.original.id] : [view.id]))), [ownViews]);
	const popularOthers = useMemo(() => popular.filter(view => !ownIds.has(view.id)), [popular, ownIds]);

	const describe = useCallback((view: WishView) => [getStateLabel(view), ...getExtraLines(view)].join('\n'), [getStateLabel, getExtraLines]);
	// An own wish that is not public yet shows its state on the right, so only the extra lines stay below the title.
	const describeOwn = useCallback((view: WishView) => (isUnpublished(view) ? getExtraLines(view).join('\n') : describe(view)), [getExtraLines, describe]);
	const ownRightElement = useCallback(
		(view: WishView) => (isUnpublished(view) ? <ReviewState label={getStateLabel(view)} editable={view.editable} /> : <LikesCount amount={view.original?.likes_amount ?? view.likesAmount} />),
		[getStateLabel]
	);

	return (
		<View style={styles.list}>
			{FeatureWishHelper.maySubmit(mode) ? <MyButton text={translate(TranslationKeys.feature_wishes_submit)} onPress={() => openForm({})} icon="lightbulb-on-outline" /> : null}
			{loading ? <LoadingIndicator style={styles.loading} color={theme.screen.text} /> : null}
			{!loading && ownViews.length > 0 ? (
				<View>
					<SettingsGroupTitle>{translate(TranslationKeys.feature_wishes_own)}</SettingsGroupTitle>
					{ownViews.map((view, index) => (
						<WishRow key={view.id} view={view} value={describeOwn(view)} groupPosition={getGroupPosition(index, ownViews.length)} onPress={() => openDetails(view, null)} rightElement={ownRightElement(view)} />
					))}
				</View>
			) : null}
			{!loading && mayVote ? (
				<View>
					<SettingsGroupTitle>{translate(TranslationKeys.feature_wishes_popular)}</SettingsGroupTitle>
					{popularOthers.length === 0 ? <Text style={[styles.empty, { color: theme.screen.placeholder }]}>{translate(TranslationKeys.feature_wishes_empty)}</Text> : null}
					{popularOthers.map((view, index) => (
						<WishRow
							key={view.id}
							view={view}
							value={describe(view)}
							groupPosition={getGroupPosition(index, popularOthers.length)}
							onPress={() => openDetails(view, likeIdsByWishId[view.id] ?? null)}
							rightElement={
								<SettingsListLikeButton
									liked={!!likeIdsByWishId[view.id]}
									likeCount={view.likesAmount}
									likeLoading={likeLoadingId === view.id}
									onPressLike={() => toggleLike(view)}
									primaryColor={primaryColor}
								/>
							}
						/>
					))}
				</View>
			) : null}
		</View>
	);
};

/** One wish in the lists, with the color and icon of its state from Directus. */
const WishRow: React.FC<{ view: WishView; value: string; groupPosition: 'single' | 'top' | 'middle' | 'bottom'; onPress: () => void; rightElement: React.ReactNode }> = ({ view, value, groupPosition, onPress, rightElement }) => {
	const visual = useChoiceVisual(view);
	return (
		<SettingsList
			iconBgColor={visual.backgroundColor}
			leftIcon={<ChoiceIcon view={view} />}
			label={view.original?.title ?? view.title}
			value={value}
			stackedValue
			handleFunction={onPress}
			rightElement={rightElement}
			groupPosition={groupPosition}
		/>
	);
};

/**
 * Opens the feature wishes modal (from the tile in the food offers and from the settings). Details,
 * submitting and editing open as sub modals on top, their back chevron returns to the list.
 */
export const useFeatureWishesModal = () => {
	const { show, close, showAndDiscardOthers } = useMyScrollViewModal();
	const { translate } = useLanguage();
	const showToast = useToast();
	const { update } = useFeatureWishesLocal();
	const { profile } = useAppSelector(state => state.authReducer);
	const profileId: string | null = profile?.id ?? null;
	const helper = useMemo(() => new FeatureWishesHelper(), []);
	const { askForPushNotifications } = usePushNotificationOptInPrompt();
	// The list is rendered by the callbacks below and the callbacks open the list again.
	const listRef = useRef<() => React.ReactElement>(() => <View />);

	/** Back to a freshly loaded list, replacing details and form. */
	const showListAgain = useCallback(() => {
		showAndDiscardOthers({ title: translate(TranslationKeys.feature_wishes), children: listRef.current() });
	}, [showAndDiscardOthers, translate]);

	const openForm = useCallback(
		({ wish }: { wish?: WishView }) => {
			if (!wish && !FeatureWishHelper.maySubmitAnotherWish(readFeatureWishesLocal().submittedAt, new Date())) {
				showToast(translate(TranslationKeys.feature_wishes_daily_limit), 'error');
				return;
			}
			show({
				title: translate(TranslationKeys.feature_wishes_form_title),
				children: (
					<FeatureWishForm
						initialTitle={wish?.title}
						initialDescription={wish?.description ?? undefined}
						isEdit={!!wish}
						showReviewAgainHint={wish?.status === FeatureWishStatus.PUBLISHED}
						onSubmit={async (title, description) => {
							if (wish) {
								await helper.updateText(wish.id, title, description);
								showToast(translate(TranslationKeys.feature_wishes_updated), 'success');
								showListAgain();
								return;
							}
							const id = await helper.createWish(title, description);
							const now = new Date();
							const latest = readFeatureWishesLocal();
							update({
								submittedAt: [...FeatureWishHelper.getRecentSubmissions(latest.submittedAt, now), now.toISOString()],
								ownWishes: profileId ? latest.ownWishes : [{ id, title }, ...latest.ownWishes],
							});
							showToast(translate(TranslationKeys.feature_wishes_submitted), 'success');
							close();
							void askForPushNotifications(PushNotificationOptInCategory.FEATURE_WISH);
						}}
					/>
				),
			});
		},
		[profileId, helper, show, close, showListAgain, showToast, translate, update, askForPushNotifications]
	);

	const openDetails = useCallback(
		(view: WishView, likeId: string | null) => {
			show({
				title: view.original?.title ?? view.title,
				children: <FeatureWishDetails view={view} likeId={likeId} onEdit={() => openForm({ wish: view })} onDeleted={showListAgain} />,
			});
		},
		[show, openForm, showListAgain]
	);

	listRef.current = () => <FeatureWishesList openForm={openForm} openDetails={openDetails} />;

	const openFeatureWishesModal = useCallback(() => {
		show({ title: translate(TranslationKeys.feature_wishes), children: listRef.current() });
	}, [show, translate]);

	return { openFeatureWishesModal };
};

const styles = StyleSheet.create({
	list: {
		paddingBottom: 24,
	},
	form: {
		gap: 8,
		paddingBottom: 24,
	},
	label: {
		fontSize: 14,
		fontFamily: 'Poppins_600SemiBold',
	},
	input: {
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 16,
	},
	inputMultiline: {
		minHeight: 110,
	},
	counter: {
		fontSize: 12,
		textAlign: 'right',
	},
	hint: {
		fontSize: 13,
		lineHeight: 19,
		borderRadius: 10,
		padding: 12,
		marginTop: 8,
	},
	stateRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	stateIcon: {
		width: 32,
		height: 32,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	stateLabel: {
		fontSize: 15,
		fontFamily: 'Poppins_600SemiBold',
	},
	spacer: {
		flex: 1,
	},
	detailSub: {
		fontSize: 13,
	},
	detailText: {
		fontSize: 15,
		lineHeight: 22,
	},
	reviewState: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 8,
	},
	reviewStateText: {
		fontSize: 14,
	},
	likesCount: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 8,
	},
	likesCountText: {
		fontSize: 14,
	},
	empty: {
		fontSize: 14,
		paddingVertical: 8,
	},
	loading: {
		marginVertical: 20,
	},
	submit: {
		marginTop: 8,
	},
});
