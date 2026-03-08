import React from 'react';
import { TooltipContent, TooltipText } from '@gluestack-ui/themed';

type TooltipProps = {
	trigger: (triggerProps: Record<string, unknown>) => React.ReactNode;
	[key: string]: unknown;
};

/**
 * Lightweight Tooltip replacement that renders only the trigger element.
 * The Gluestack Tooltip component is resource-intensive, so it is removed
 * entirely on all platforms. Only the trigger content is rendered.
 */
const CustomTooltip: React.FC<TooltipProps> = ({ trigger }) => {
	return <>{trigger({})}</>;
};

export { CustomTooltip, TooltipContent, TooltipText };
export default CustomTooltip;
