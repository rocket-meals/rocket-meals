import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import SupportFAQ from '../../../../components/SupportFAQ/SupportFAQ';
import { useTheme } from '@/hooks/useTheme';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import MyMarkdown from '@/components/MyMarkdown/MyMarkdown';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { myContrastColor } from '@/helper/ColorHelper';
import { ChatMessagesHelper } from '@/redux/actions/Chats/ChatMessages';
import { useLanguage } from '@/hooks/useLanguage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DatabaseTypes, DateHelper } from 'repo-depkit-common';
import SettingsList from '@/components/SettingsList';
import MyImage from '@/components/MyImage';
import { getFoodName } from '@/helper/resourceHelper';
import { getImageUrl } from '@/constants/HelperFunctions';
import { FoodFeedbackHelper } from '@/redux/actions/FoodFeedbacks/FoodFeedbacks';
import { loadFoodById } from '@/helper/FoodHelper';
import styles from './styles';
import { MARK_CHAT_AS_READ } from '@/redux/Types/types';
import { persistChatReadStatus } from '@/helper/chatReadStatus';

type LinkedFoodInfo = {
        food: DatabaseTypes.Foods;
        feedback: DatabaseTypes.FoodsFeedbacks;
        foodOfferId?: string | null;
};

const ChatDetailsScreen = () => {
	useSetPageTitle(TranslationKeys.chat);
	const { theme } = useTheme();
        const { chat_id, refreshKey } = useLocalSearchParams<{ chat_id?: string; refreshKey?: string }>();
        const { primaryColor: projectColor, selectedTheme: mode, appSettings, serverInfo } = useSelector((state: RootState) => state.settings);

        const dispatch = useDispatch();
        const { chats, readStatus } = useSelector((state: RootState) => state.chats);
	const { profile } = useSelector((state: RootState) => state.authReducer);
	const [messages, setMessages] = useState<DatabaseTypes.ChatMessages[]>([]);
        const [newMessage, setNewMessage] = useState('');
        const [sending, setSending] = useState(false);
        const { translate, language } = useLanguage();
        const [linkedFoodFeedback, setLinkedFoodFeedback] = useState<LinkedFoodInfo | null>(null);
        const [refreshing, setRefreshing] = useState(false);
        const listRef = useRef<FlatList<DatabaseTypes.ChatMessages> | null>(null);
        const [isAtBottom, setIsAtBottom] = useState(true);
        const hasAutoScrolledToBottomRef = useRef(false);
        const foodFeedbackHelper = useMemo(() => new FoodFeedbackHelper(), []);

    const foodsAreaColor = appSettings?.foods_area_color ? appSettings?.foods_area_color : projectColor;
    const placeholderImageId = appSettings?.foods_placeholder_image ? String(appSettings.foods_placeholder_image) : undefined;
    const defaultFoodImage =
            (placeholderImageId && getImageUrl(placeholderImageId)) ||
            appSettings?.foods_placeholder_image_remote_url ||
            getImageUrl(serverInfo?.info?.project?.project_logo);

        const fetchMessages = useCallback(async () => {
                if (!chat_id) {
                        return;
                }

                setRefreshing(true);

                try {
                        const helper = new ChatMessagesHelper();
                        const result = (await helper.fetchMessagesByChat(chat_id)) as DatabaseTypes.ChatMessages[];
                        if (result) {
                                setMessages(result);
                        }
                } catch (e) {
                        console.error('Error fetching chat messages:', e);
                } finally {
                        setRefreshing(false);
                }
        }, [chat_id]);

        useEffect(() => {
                fetchMessages();
        }, [fetchMessages]);

        useEffect(() => {
                if (refreshKey) {
                        fetchMessages();
                }
        }, [fetchMessages, refreshKey]);

        const chat = chats.find(c => c.id === chat_id);
        const chatInitialMessage = (chat as { initial_message?: string } | undefined)?.initial_message;
        const initialMessage = typeof chatInitialMessage === 'string' ? chatInitialMessage.trim() : undefined;

        const sortedMessages = useMemo(() => {
                return [...messages].sort((a, b) => {
                        const da = a.date_created || a.date_updated || '';
                        const db = b.date_created || b.date_updated || '';
                        return da < db ? -1 : 1;
                });
        }, [messages]);

        const latestMessageTimestamp = useMemo(() => {
                if (sortedMessages.length > 0) {
                        const latest = sortedMessages[0];
                        return latest.date_updated || latest.date_created || null;
                }
                return chat?.date_updated || chat?.date_created || null;
        }, [sortedMessages, chat?.date_updated, chat?.date_created]);

        useEffect(() => {
                if (!chat_id || !chat?.id || !latestMessageTimestamp) {
                        return;
                }

                const lastRead = readStatus[chat.id];
                if (lastRead && new Date(lastRead).getTime() >= new Date(latestMessageTimestamp).getTime()) {
                        return;
                }

                const updatedStatus = {
                        ...readStatus,
                        [chat.id]: latestMessageTimestamp,
                };

                dispatch({
                        type: MARK_CHAT_AS_READ,
                        payload: {
                                chatId: chat.id,
                                timestamp: latestMessageTimestamp,
                        },
                });

                void persistChatReadStatus(updatedStatus);
        }, [chat_id, chat?.id, latestMessageTimestamp, dispatch, readStatus, chat?.date_updated]);

        const scrollToBottom = useCallback((animated = true) => {
                requestAnimationFrame(() => {
                        listRef.current?.scrollToEnd({ animated });
                        setIsAtBottom(true);
                });
        }, []);

        useEffect(() => {
                if (hasAutoScrolledToBottomRef.current || sortedMessages.length === 0) {
                        return;
                }

                const timeout = setTimeout(() => {
                        scrollToBottom(false);
                        hasAutoScrolledToBottomRef.current = true;
                }, 150);

                return () => {
                        clearTimeout(timeout);
                };
        }, [sortedMessages.length, scrollToBottom]);

        const handleContentSizeChange = useCallback(() => {
                if (isAtBottom) {
                        scrollToBottom(false);
                }
        }, [isAtBottom, scrollToBottom]);

        const lastMessageIndex = sortedMessages.length - 1;
        const lastMessageDate =
                lastMessageIndex >= 0
                        ? sortedMessages[lastMessageIndex]?.date_created || sortedMessages[lastMessageIndex]?.date_updated
                        : undefined;
	let amountDaysForOldMessages = 7; // Default to 7 days

        const showOldMessageNotice = lastMessageDate ? DateHelper.isDateOlderThan(new Date(lastMessageDate), amountDaysForOldMessages) : false;
        const scrollButtonOffset = showOldMessageNotice ? 180 : 80;
        const bottomSpacerHeight = useMemo(
                () => (isAtBottom ? 24 : scrollButtonOffset + 24),
                [isAtBottom, scrollButtonOffset]
        );
        const renderFooter = useCallback(() => <View style={{ height: bottomSpacerHeight }} />, [bottomSpacerHeight]);

	const handleSendMessage = async () => {
		if (!newMessage.trim() || !chat_id || !profile?.id) {
			return;
		}
		setSending(true);
		try {
			const helper = new ChatMessagesHelper();
			const created = (await helper.createChatMessage({
				chat: chat_id,
				profile: profile.id,
				message: newMessage.trim(),
			})) as DatabaseTypes.ChatMessages;
                        if (created) {
                                setMessages(prev => [...prev, created]);
                                setNewMessage('');
                                scrollToBottom();
                        }
		} catch (e) {
			console.error('Error creating chat message:', e);
		} finally {
			setSending(false);
		}
	};

	const renderItem = ({ item }: { item: DatabaseTypes.ChatMessages }) => {
		const profileId = typeof item.profile === 'object' ? item.profile?.id : item.profile;
		const isMe = profileId === profile?.id;
		const bgColor = isMe ? projectColor : theme.card.background;
		const textColor = myContrastColor(bgColor, theme, mode === 'dark');

		if (!item.message) {
			return null; // Skip rendering if message is empty
		}

		return (
			<View style={[styles.messageItem, { alignSelf: isMe ? 'flex-end' : 'flex-start' }]}>
				<View style={[styles.bubble, { backgroundColor: bgColor }]}>
					<MyMarkdown content={item.message} textColor={textColor} />
				</View>
				<Text
					style={{
						...styles.timestamp,
						color: theme.screen.text,
						textAlign: isMe ? 'right' : 'left',
					}}
				>
					{new Date(item.date_created + '').toLocaleString()}
				</Text>
			</View>
		);
	};

        const renderInitialMessage = () => {
                if (!initialMessage) {
                        return null;
                }

                const bgColor = theme.card.background;
                const textColor = myContrastColor(bgColor, theme, mode === 'dark');

                return (
                        <View style={styles.initialMessageWrapper}>
                                <View style={[styles.bubble, styles.initialMessageBubble, { backgroundColor: bgColor }]}>
                                        <MyMarkdown content={initialMessage} textColor={textColor} />
                                </View>
                        </View>
                );
        };

        useEffect(() => {
                let isMounted = true;

                const getEntityId = (entity: any): string | null => {
                        if (!entity) {
                                return null;
                        }
                        if (typeof entity === 'string') {
                                return entity;
                        }
                        if (typeof entity === 'object') {
                                if ('food_feedbacks_id' in entity && entity.food_feedbacks_id) {
                                        return getEntityId((entity as any).food_feedbacks_id);
                                }
                                if ('id' in entity && entity.id) {
                                        return String(entity.id);
                                }
                        }
                        return null;
                };

                const resolveFeedbackRelation = (chatEntity: DatabaseTypes.Chats | undefined) => {
                        if (!chatEntity) {
                                return null;
                        }

                        const relations: string[] | null = chatEntity.food_feedbacks as string[] | null;

                        if (!relations) {
                                return null;
                        }

                        if (Array.isArray(relations)) {
                                return relations;
                        }

                        return null;
                };

                const resolveLinkedFoodFeedback = async () => {
                        const chatFeedbackRelations = resolveFeedbackRelation(chat);

                        if (!chatFeedbackRelations || chatFeedbackRelations.length === 0) {
                                if (isMounted) {
                                        setLinkedFoodFeedback(null);
                                }
                                return;
                        }

                        const feedbackId = getEntityId(chatFeedbackRelations[0]);

                        if (!feedbackId) {
                                if (isMounted) {
                                        setLinkedFoodFeedback(null);
                                }
                                return;
                        }

                        try {
                                const feedbackQuery = {
                                        fields: ['id', 'rating', 'comment', 'food', 'foodoffer'],
                                };

                                const feedback = (await foodFeedbackHelper.fetchFoodFeedbackById(
                                        feedbackId,
                                        feedbackQuery
                                )) as DatabaseTypes.FoodsFeedbacks;

                                if (!feedback?.food) {
                                        if (isMounted) {
                                                setLinkedFoodFeedback(null);
                                        }
                                        return;
                                }

                                const foodId = getEntityId(feedback.food);

                                if (!foodId) {
                                        if (isMounted) {
                                                setLinkedFoodFeedback(null);
                                        }
                                        return;
                                }

                                const food = (await loadFoodById(foodId)) as DatabaseTypes.Foods;
                                const foodOfferId = getEntityId(feedback.foodoffer);

                                if (isMounted) {
                                        setLinkedFoodFeedback({
                                                food,
                                                feedback,
                                                foodOfferId,
                                        });
                                }
                        } catch (error) {
                                console.error('Error resolving linked food feedback for chat:', error);
                                if (isMounted) {
                                        setLinkedFoodFeedback(null);
                                }
                        }
                };

                resolveLinkedFoodFeedback();

                return () => {
                        isMounted = false;
                };
        }, [chat, chat?.food_feedbacks, foodFeedbackHelper]);

        const renderLinkedElements = () => {
                if (!linkedFoodFeedback) {
                        return null;
                }

                return (
                        <View style={styles.linkedElementsContainer}>
                                <Text style={[styles.linkedElementsTitle, { color: theme.screen.text }]}>
                                        {translate(TranslationKeys.linked_elements)}
                                </Text>
                                <View style={styles.linkedListWrapper}>
                                        {(() => {
                                                const { food, feedback, foodOfferId } = linkedFoodFeedback;
                                                const alias = food.alias || '';
                                                const fallbackName = alias ? alias.charAt(0).toUpperCase() + alias.slice(1) : undefined;
                                                const foodName =
                                                        getFoodName(food, language) || fallbackName || translate(TranslationKeys.unknown);
                                                const imageSource =
                                                        food?.image_remote_url
                                                                ? { uri: food.image_remote_url }
                                                                : food?.image
                                                                ? { uri: getImageUrl(String(food.image)) }
                                                                : defaultFoodImage
                                                                ? { uri: defaultFoodImage }
                                                                : undefined;

                                                const handlePress = () => {
                                                        if (food?.id) {
                                                                const params: Record<string, string> = {
                                                                        foodId: String(food.id),
                                                                };

                                                                if (foodOfferId) {
                                                                        params.id = String(foodOfferId);
                                                                }

                                                                router.push({
                                                                        pathname: '/(app)/foodoffers/details',
                                                                        params,
                                                                });
                                                        }
                                                };

                                                const ratingValueRaw = typeof feedback.rating === 'number' ? feedback.rating : Number(feedback.rating);
                                                const ratingValue = Number.isFinite(ratingValueRaw)
                                                        ? ratingValueRaw.toLocaleString(language, {
                                                                  maximumFractionDigits: 2,
                                                                  minimumFractionDigits: 0,
                                                          })
                                                        : null;
                                                const commentValue = typeof feedback.comment === 'string' && feedback.comment.trim().length
                                                        ? feedback.comment.trim()
                                                        : null;

                                                return (
                                                        <>
                                                                <SettingsList
                                                                        label={translate(TranslationKeys.linked_elements_food_image)}
                                                                        value={foodName}
                                                                        leftIcon={
                                                                                imageSource ? (
                                                                                        <MyImage source={imageSource} style={styles.linkedFoodImage} />
                                                                                ) : (
                                                                                        <MaterialCommunityIcons
                                                                                                name="silverware-fork-knife"
                                                                                                size={20}
                                                                                                color={theme.screen.icon}
                                                                                        />
                                                                                )
                                                                        }
                                                                        rightIcon={
                                                                                <MaterialCommunityIcons
                                                                                        name="chevron-right"
                                                                                        size={24}
                                                                                        color={theme.screen.icon}
                                                                                />
                                                                        }
                                                                        onPress={food?.id ? handlePress : undefined}
                                                                        iconBackgroundColor={foodsAreaColor}
                                                                        groupPosition="top"
                                                                />
                                                                <SettingsList
                                                                        label={translate(TranslationKeys.linked_elements_rating)}
                                                                        value={ratingValue ?? translate(TranslationKeys.no_value)}
                                                                        leftIcon={
                                                                                <MaterialCommunityIcons
                                                                                        name="star-circle"
                                                                                        size={20}
                                                                                        color={theme.screen.icon}
                                                                                />
                                                                        }
                                                                        iconBackgroundColor={foodsAreaColor}
                                                                        groupPosition="middle"
                                                                />
                                                                <SettingsList
                                                                        label={translate(TranslationKeys.linked_elements_comment)}
                                                                        value={commentValue ?? translate(TranslationKeys.no_value)}
                                                                        leftIcon={
                                                                                <MaterialCommunityIcons
                                                                                        name="message-text"
                                                                                        size={20}
                                                                                        color={theme.screen.icon}
                                                                                />
                                                                        }
                                                                        iconBackgroundColor={foodsAreaColor}
                                                                        groupPosition="bottom"
                                                                        showSeparator={false}
                                                                />
                                                        </>
                                                );
                                        })()}
                                </View>
                        </View>
                );
        };

        return (
                <View style={[styles.container, { backgroundColor: theme.screen.background }]}>
                        {renderLinkedElements()}
                        <FlatList
                                ref={listRef}
                                data={sortedMessages}
                                keyExtractor={item => item.id}
                                renderItem={renderItem}
                                contentContainerStyle={styles.list}
                                refreshing={refreshing}
                                onRefresh={fetchMessages}
                                ListHeaderComponent={renderInitialMessage()}
                                ListFooterComponent={renderFooter}
                                onContentSizeChange={handleContentSizeChange}
                                onScroll={({ nativeEvent }) => {
                                        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                                        const distanceFromBottom = Math.max(
                                                0,
                                                contentSize.height - layoutMeasurement.height - contentOffset.y
                                        );
                                        const isBottom = distanceFromBottom <= 24;

                                        setIsAtBottom(prev => (prev !== isBottom ? isBottom : prev));
                                }}
                                scrollEventThrottle={16}
                        />
                        {sortedMessages.length > 0 && !isAtBottom && (
                                <TouchableOpacity
                                        style={[
                                                styles.scrollToEndButton,
                                                {
                                                        backgroundColor: theme.card.background,
                                                        borderColor: theme.screen.icon,
                                                        bottom: scrollButtonOffset,
                                                },
                                        ]}
                                        onPress={() => scrollToBottom()}
                                        accessibilityRole="button"
                                        accessibilityLabel={translate(TranslationKeys.scroll_to_bottom)}
                                >
                                        <MaterialCommunityIcons name="chevron-down" size={24} color={theme.screen.icon} />
                                </TouchableOpacity>
                        )}
			{showOldMessageNotice && (
				<View style={styles.oldMessageContainer}>
					<Text style={[styles.oldMessageText, { color: theme.screen.text }]}>{translate(TranslationKeys.chat_last_message_unanswered)}</Text>
					<SupportFAQ label={translate(TranslationKeys.feedback_support_faq)} onPress={() => router.navigate('/support-FAQ')} />
				</View>
			)}
			<View style={styles.inputContainer}>
				<TextInput style={[styles.textInput, { color: theme.screen.text, borderColor: theme.screen.placeholder }]} placeholder={translate(TranslationKeys.type_here)} placeholderTextColor={theme.screen.placeholder} multiline value={newMessage} onChangeText={setNewMessage} />
				<TouchableOpacity
					onPress={handleSendMessage}
					disabled={!newMessage.trim() || sending}
					style={[
						styles.sendButton,
						{
							backgroundColor: projectColor,
							opacity: newMessage.trim() ? 1 : 0.5,
						},
					]}
				>
					<MaterialCommunityIcons name="send" size={24} color={myContrastColor(projectColor, theme, mode === 'dark')} />
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default ChatDetailsScreen;
