import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { speak, stop } from 'expo-edge-speech';

import { useTheme } from '@/hooks/useTheme';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { useAppSelector } from '@/redux/hooks';

const VOICES = [
	{ key: 'de-DE-KatjaNeural', label: 'Katja (DE)' },
	{ key: 'de-DE-ConradNeural', label: 'Conrad (DE)' },
	{ key: 'en-US-AriaNeural', label: 'Aria (EN)' },
	{ key: 'en-US-GuyNeural', label: 'Guy (EN)' },
	{ key: 'fr-FR-DeniseNeural', label: 'Denise (FR)' },
	{ key: 'es-ES-ElviraNeural', label: 'Elvira (ES)' },
];

const EdgeSpeechScreen = () => {
	useSetPageTitle(TranslationKeys.edge_speech_test);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor } = useAppSelector((state) => state.settings);

	const [inputText, setInputText] = useState('Guten Appetit! Hier sind heute leckere Gerichte für euch.');
	const [selectedVoice, setSelectedVoice] = useState(VOICES[0].key);
	const [isSpeaking, setIsSpeaking] = useState(false);

	const handleSpeak = useCallback(async () => {
		if (isSpeaking) {
			await stop();
			setIsSpeaking(false);
			return;
		}
		if (!inputText.trim()) return;
		setIsSpeaking(true);
		try {
			await speak(inputText, {
				voice: selectedVoice,
				onDone: () => setIsSpeaking(false),
				onError: () => setIsSpeaking(false),
			});
		} catch (error) {
			console.error('TTS error:', error);
			setIsSpeaking(false);
		}
	}, [inputText, selectedVoice, isSpeaking]);

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: theme.screen.background }]}
			contentContainerStyle={[styles.contentContainer, { backgroundColor: theme.screen.background }]}
			keyboardShouldPersistTaps="handled"
		>
			<View style={styles.content}>
				<Text style={[styles.heading, { color: theme.screen.text }]}>
					{translate(TranslationKeys.edge_speech_test)}
				</Text>

				<View style={styles.section}>
					<Text style={[styles.body, { color: theme.screen.text }]}>
						{translate(TranslationKeys.edge_speech_test_description)}
					</Text>
				</View>

				<View style={styles.section}>
					<TextInput
						style={[styles.textInput, { color: theme.screen.text, borderColor: primaryColor, backgroundColor: theme.card.background }]}
						value={inputText}
						onChangeText={setInputText}
						placeholder={translate(TranslationKeys.edge_speech_enter_text)}
						placeholderTextColor={theme.screen.text + '80'}
						multiline
						numberOfLines={4}
					/>
				</View>

				<View style={styles.section}>
					<Text style={[styles.label, { color: theme.screen.text }]}>
						{translate(TranslationKeys.edge_speech_voice_label)}
					</Text>
					{VOICES.map((voice) => (
						<TouchableOpacity
							key={voice.key}
							onPress={() => setSelectedVoice(voice.key)}
							style={[
								styles.voiceItem,
								{ backgroundColor: theme.card.background },
								selectedVoice === voice.key && { borderColor: primaryColor, borderWidth: 2 },
							]}
						>
							<View style={styles.row}>
								<View style={[styles.iconBox, { backgroundColor: selectedVoice === voice.key ? primaryColor : theme.card.background }]}>
									<MaterialCommunityIcons
										name="account-voice"
										size={20}
										color={selectedVoice === voice.key ? '#fff' : theme.screen.icon}
									/>
								</View>
								<Text style={[styles.body, { color: theme.screen.text }]}>{voice.label}</Text>
							</View>
							{selectedVoice === voice.key && (
								<MaterialCommunityIcons name="check-circle" size={20} color={primaryColor} />
							)}
						</TouchableOpacity>
					))}
				</View>

				<TouchableOpacity
					onPress={handleSpeak}
					style={[styles.speakButton, { backgroundColor: primaryColor }]}
					activeOpacity={0.8}
				>
					<MaterialCommunityIcons
						name={isSpeaking ? 'stop-circle-outline' : 'play-circle-outline'}
						size={24}
						color="#fff"
					/>
					<Text style={styles.speakButtonLabel}>
						{isSpeaking ? translate(TranslationKeys.edge_speech_stop) : translate(TranslationKeys.edge_speech_speak)}
					</Text>
				</TouchableOpacity>

				<View style={[styles.statusBox, { backgroundColor: theme.card.background }]}>
					<Text style={[styles.body, { color: theme.screen.text }]}>
						{translate(TranslationKeys.edge_speech_status)}:{' '}
					</Text>
					<Text style={[styles.body, { color: isSpeaking ? primaryColor : theme.screen.text }]}>
						{isSpeaking
							? translate(TranslationKeys.edge_speech_status_speaking)
							: translate(TranslationKeys.edge_speech_status_idle)}
					</Text>
				</View>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	contentContainer: {},
	content: {
		width: '100%',
		padding: 20,
	},
	heading: {
		fontSize: 24,
		fontFamily: 'Poppins_700Bold',
		marginVertical: 10,
	},
	section: {
		width: '100%',
		marginTop: 14,
	},
	label: {
		fontSize: 16,
		fontFamily: 'Poppins_700Bold',
		marginBottom: 8,
	},
	body: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	textInput: {
		borderWidth: 1.5,
		borderRadius: 10,
		padding: 12,
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		minHeight: 100,
		textAlignVertical: 'top',
	},
	voiceItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderRadius: 10,
		padding: 10,
		marginVertical: 5,
		borderWidth: 1.5,
		borderColor: 'transparent',
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	iconBox: {
		borderRadius: 8,
		padding: 6,
	},
	speakButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 10,
		borderRadius: 12,
		paddingVertical: 14,
		marginTop: 20,
	},
	speakButtonLabel: {
		fontSize: 18,
		fontFamily: 'Poppins_700Bold',
		color: '#fff',
	},
	statusBox: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 10,
		padding: 12,
		marginTop: 16,
	},
});

export default EdgeSpeechScreen;
