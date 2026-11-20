import type React from 'react';
import PushNotificationOptInPlaybook from './PushNotificationOptInPlaybook';
import FoodFeedbackCommentTimelinePlaybook from './FoodFeedbackCommentTimelinePlaybook';

/**
 * Playbook pages of the app itself, next to the common-ui components of the registry. They use app
 * hooks (store, modals), which the common-ui registry cannot.
 */
export type AppPlaybookEntry = { name: string; description: string; component: React.ComponentType };

export const appPlaybookEntries: readonly AppPlaybookEntry[] = [
	{
		name: 'PushNotificationOptInPrompt',
		description: 'The push question after an app feedback, a feature wish or a food comment.',
		component: PushNotificationOptInPlaybook,
	},
	{
		name: 'FoodFeedbackCommentTimeline',
		description: 'The own comments on a food as timeline: new comment on top, one block per day, edit and delete.',
		component: FoodFeedbackCommentTimelinePlaybook,
	},
];

export function getAppPlaybookEntry(name: string): AppPlaybookEntry | undefined {
	return appPlaybookEntries.find(entry => entry.name === name);
}
