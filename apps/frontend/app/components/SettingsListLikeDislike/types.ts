import type { LikeDislikeBaseProps } from 'repo-depkit-common-ui';

export interface SettingsListLikeDislikeProps extends LikeDislikeBaseProps {
	onPressLike: () => void;
	onPressDislike: () => void;
	likeTooltipText?: string;
	dislikeTooltipText?: string;
}
