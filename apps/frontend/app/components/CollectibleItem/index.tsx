import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { DatabaseTypes, COLLECTABLE_AT_FIELDS } from 'repo-depkit-common';
import { useSelector } from 'react-redux';

import useActiveCollectibleEvent from '@/hooks/useActiveCollectibleEvent';
import useCollectibleDict from '@/hooks/useCollectibleDict';
import { CollectibleEventParticipantsHelper } from '@/redux/actions/CollectibleEvents/CollectibleEventParticipants';
import { RootState } from '@/redux/reducer';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import useToast from '@/hooks/useToast';
import { TranslationKeys } from '@/locales/keys';
import { useLanguage } from '@/hooks/useLanguage';
import MyImage from '../MyImage';
import useRateAppModal from '@/hooks/useRateAppModal';

type CollectibleKey = (typeof COLLECTABLE_AT_FIELDS)[number];

type CollectibleItemProps = {
        collectibleKey: CollectibleKey;
        hideOnCollect?: boolean;
        isPreview?: boolean;
        hideCounter?: boolean;
};

const CollectibleItem: React.FC<CollectibleItemProps> = ({
        collectibleKey,
        hideOnCollect = true,
        isPreview,
        hideCounter = false,
}) => {
        const { theme } = useTheme();
        const toast = useToast();
        const { translate } = useLanguage();
        const { activeCollectibleEvent } = useActiveCollectibleEvent();
        const { profile, loggedIn } = useSelector((state: RootState) => state.authReducer);
        const { primaryColor: projectColor, collectibleItemSize, collectibleRandomPosition } = useSelector(
                (state: RootState) => state.settings
        );
        const [isSaving, setIsSaving] = useState(false);
        const [randomOffset, setRandomOffset] = useState({ x: 0, y: 0 });

        const { openRateAppModal } = useRateAppModal(projectColor || theme.primary);

        const { collectibleDict, setCollectibleKey, collectedCount } = useCollectibleDict(activeCollectibleEvent?.id);
        const participantsHelper = useMemo(() => new CollectibleEventParticipantsHelper(), []);

        const maxCollectibleKeys = useMemo(
                () =>
                        activeCollectibleEvent
                                ? COLLECTABLE_AT_FIELDS.filter(key => (activeCollectibleEvent as any)?.[key]).length
                                : 0,
                [activeCollectibleEvent]
        );

        const computedSize = useMemo(() => {
                switch (collectibleItemSize) {
                        case 'small':
                                return 110;
                        case 'large':
                                return 180;
                        default:
                                return 140;
                }
        }, [collectibleItemSize]);

        useEffect(() => {
                if (collectibleRandomPosition && !isPreview) {
                        setRandomOffset({
                                x: Math.round(Math.random() * 60 - 30),
                                y: Math.round(Math.random() * 60 - 30),
                        });
                } else {
                        setRandomOffset({ x: 0, y: 0 });
                }
        }, [collectibleRandomPosition, isPreview]);

        const isCollectableHere = activeCollectibleEvent && (activeCollectibleEvent as any)[collectibleKey];
        const isCollected = Boolean(collectibleDict?.[collectibleKey]);
        const shouldHide = hideOnCollect && isCollected;

        const collectibleImageRemoteUrl = (activeCollectibleEvent as any)?.collectible_item_image_remote_url;

        const collectibleDirectusAssetId = (activeCollectibleEvent as any)?.collectible_item_image;

        if (!activeCollectibleEvent || !isCollectableHere || shouldHide) {
                return null;
        }

        const handleCollect = async () => {
                if (!activeCollectibleEvent?.id || isCollected) {
                        return;
                }

                const updatedData = {
                        ...collectibleDict,
                        [collectibleKey]: true,
                } as Record<string, boolean>;

                const updatedCount = Object.values(updatedData).filter(Boolean).length;

                setCollectibleKey(collectibleKey, true);

                toast(
                        `${translate(TranslationKeys.collectible_event_collected)} ${updatedCount}/${maxCollectibleKeys || '∞'}`,
                        'success'
                );

                if (maxCollectibleKeys > 0 && updatedCount === maxCollectibleKeys) {
                        openRateAppModal();
                }

                if (!loggedIn || !profile?.id) {
                        return;
                }

                setIsSaving(true);
                try {
                const updatePayload: Partial<DatabaseTypes.CollectibleEventParticipants> = {
                        points: String(updatedCount),
                        data: updatedData,
                };

                const createPayload: Partial<DatabaseTypes.CollectibleEventParticipants> = {
                        ...updatePayload,
                        profile: profile.id,
                        collectible_event: activeCollectibleEvent.id,
                        status: 'published',
                };

                        const existing = await participantsHelper.fetchParticipationByProfileAndEvent(
                                profile.id,
                                activeCollectibleEvent.id,
                                { fields: ['id'] }
                        );
                        if (existing?.id) {
                                await participantsHelper.updateItem(existing.id, updatePayload);
                        } else {
                                await participantsHelper.createItem(createPayload);
                        }
                } catch (error) {
                        console.error('Error saving collectible event participation:', error);
                        const errorDetails = (() => {
                                try {
                                        return JSON.stringify(error, null, 2);
                                } catch (jsonError) {
                                        console.error('Failed to stringify error:', jsonError);
                                        return String(error);
                                }
                        })();
                        toast(`${translate(TranslationKeys.collectible_event_save_error)}\n${errorDetails}`, 'error');
                } finally {
                        setIsSaving(false);
                }
        };

        return (
                <TouchableOpacity
                        style={[
                                styles.container,
                                {
                                        borderColor: projectColor || theme.primary,
                                        backgroundColor: theme.screen.background,
                                        width: computedSize,
                                        height: computedSize,
                                },
                                collectibleRandomPosition && !isPreview
                                        ? { transform: [{ translateX: randomOffset.x }, { translateY: randomOffset.y }] }
                                        : null,
                        ]}
                        onPress={isPreview ? undefined : handleCollect}
                        disabled={isSaving || isPreview}
                        activeOpacity={isPreview ? 1 : 0.8}
                >
			<MyImage
				remote_image_url={collectibleImageRemoteUrl}
				directus_asset_id={collectibleDirectusAssetId}
				resizeMode="contain"
				style={styles.image}
			/>
			{isCollected ? <View style={[styles.collectedOverlay, { backgroundColor: theme.primary }]} /> : null}
			{isSaving ? (
				<View style={styles.loadingOverlay}>
					<ActivityIndicator color={theme.dark} />
				</View>
			) : null}
                        {hideCounter ? null : (
                                <View style={[styles.counter, { backgroundColor: theme.primary }]}>
                                        <Text style={[styles.counterText, { color: theme.dark }]}>
                                                {collectedCount}/{maxCollectibleKeys || '∞'}
                                        </Text>
                                </View>
                        )}
                </TouchableOpacity>
        );
};

export default CollectibleItem;
