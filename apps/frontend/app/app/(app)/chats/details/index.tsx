import React, { useEffect, useState } from 'react';
import {
	FlatList,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { router } from 'expo-router';
import SupportFAQ from '../../../../components/SupportFAQ/SupportFAQ';
import { useTheme } from '@/hooks/useTheme';
import { useLocalSearchParams } from 'expo-router';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import MyMarkdown from '@/components/MyMarkdown/MyMarkdown';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { myContrastColor } from '@/helper/colorHelper';
import { ChatMessagesHelper } from '@/redux/actions/Chats/ChatMessages';
import { useLanguage } from '@/hooks/useLanguage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DatabaseTypes, DateHelper } from 'repo-depkit-common';
import styles from './styles';

const ChatDetailsScreen = () => {
	useSetPageTitle(TranslationKeys.chat);
	const { theme } = useTheme();
	const { chat_id } = useLocalSearchParams<{ chat_id?: string }>();
	const { primaryColor: projectColor, selectedTheme: mode } = useSelector(
		(state: RootState) => state.settings
	);

	const { chats } = useSelector((state: RootState) => state.chats);
	const { profile } = useSelector((state: RootState) => state.authReducer);
	const [messages, setMessages] = useState<DatabaseTypes.ChatMessages[]>([]);
	const [newMessage, setNewMessage] = useState('');
	const [sending, setSending] = useState(false);
	const { translate } = useLanguage();

	useEffect(() => {
		const fetchMsgs = async () => {
			if (chat_id) {
				try {
					const helper = new ChatMessagesHelper();
					const result = (await helper.fetchMessagesByChat(
						chat_id
					)) as DatabaseTypes.ChatMessages[];
					if (result) {
						setMessages(result);
					}
				} catch (e) {
					console.error('Error fetching chat messages:', e);
				}
			}
		};
		fetchMsgs();
	}, [chat_id]);

	const chatTitle = chats.find(c => c.id === chat_id)?.alias || 'Chat';

	const sortedMessages = [...messages].sort((a, b) => {
		const da = a.date_created || a.date_updated || '';
		const db = b.date_created || b.date_updated || '';
		return da < db ? 1 : -1;
	});

	const lastMessageDate =
		sortedMessages[0]?.date_created || sortedMessages[0]?.date_updated;
	const amountDaysForOldMessages = 7; // Default to 7 days

	const showOldMessageNotice = lastMessageDate
		? DateHelper.isDateOlderThan(
				new Date(lastMessageDate),
				amountDaysForOldMessages
			)
		: false;

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
				setMessages(prev => [created, ...prev]);
				setNewMessage('');
			}
		} catch (e) {
			console.error('Error creating chat message:', e);
		} finally {
			setSending(false);
		}
	};

	const renderItem = ({ item }: { item: DatabaseTypes.ChatMessages }) => {
		const profileId =
			typeof item.profile === 'object' ? item.profile?.id : item.profile;
		const isMe = profileId === profile?.id;
		const bgColor = isMe ? projectColor : theme.card.background;
		const textColor = myContrastColor(bgColor, theme, mode === 'dark');

		if (!item.message) {
			return null; // Skip rendering if message is empty
		}

		return (
			<View
				style={[
					styles.messageItem,
					{ alignSelf: isMe ? 'flex-end' : 'flex-start' },
				]}
			>
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

	return (
		<View
			style={[styles.container, { backgroundColor: theme.screen.background }]}
		>
			<FlatList
				data={sortedMessages}
				keyExtractor={item => item.id}
				renderItem={renderItem}
				contentContainerStyle={styles.list}
				inverted
			/>
			{showOldMessageNotice && (
				<View style={styles.oldMessageContainer}>
					<Text style={[styles.oldMessageText, { color: theme.screen.text }]}>
						{translate(TranslationKeys.chat_last_message_unanswered)}
					</Text>
					<SupportFAQ
						label={translate(TranslationKeys.feedback_support_faq)}
						onPress={() => router.navigate('/support-FAQ')}
					/>
				</View>
			)}
			<View style={styles.inputContainer}>
				<TextInput
					style={[
						styles.textInput,
						{ color: theme.screen.text, borderColor: theme.screen.placeholder },
					]}
					placeholder={translate(TranslationKeys.type_here)}
					placeholderTextColor={theme.screen.placeholder}
					multiline
					value={newMessage}
					onChangeText={setNewMessage}
				/>
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
					<MaterialCommunityIcons
						name="send"
						size={24}
						color={myContrastColor(projectColor, theme, mode === 'dark')}
					/>
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default ChatDetailsScreen;
