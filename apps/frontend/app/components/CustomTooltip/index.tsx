import React from 'react';
import { Tooltip as GluestackTooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { isWeb } from '@/constants/Constants';

type TooltipProps = React.ComponentProps<typeof GluestackTooltip>;

/**
 * Platform-aware Tooltip wrapper.
 *
 * - **Web**: renders the full Gluestack UI Tooltip (hover, keyboard, etc.)
 * - **Native (iOS / Android)**: renders only the trigger element and skips
 *   all Gluestack Tooltip initialization entirely.  Tooltips require hover
 *   which does not exist on touch devices, so the overhead is pure waste.
 *
 * Usage is a drop-in replacement for Gluestack's `Tooltip`:
 *
 * ```tsx
 * import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';
 *
 * <CustomTooltip placement="top" trigger={triggerProps => <Pressable {...triggerProps} />}>
 *   <TooltipContent><TooltipText>hint</TooltipText></TooltipContent>
 * </CustomTooltip>
 * ```
 */
const CustomTooltip: React.FC<TooltipProps> = ({ trigger, children, ...props }) => {
	if (!isWeb) {
		// On native there is no hover – skip the entire Gluestack Tooltip tree.
		// Pass an empty object as triggerProps; no Gluestack event handlers needed.
		return <>{trigger({}, {} as any)}</>;
	}

	return (
		<GluestackTooltip trigger={trigger} {...props}>
			{children}
		</GluestackTooltip>
	);
};

export { CustomTooltip, TooltipContent, TooltipText };
export default CustomTooltip;
