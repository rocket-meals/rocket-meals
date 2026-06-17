import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { CardWithText as BaseCardWithText, CardWithTextProps as BaseCardWithTextProps } from 'repo-depkit-common-ui';
import MyImage from '@/components/MyImage';
import { ImageSourcePropType } from 'react-native';

export interface CardWithTextProps extends Omit<BaseCardWithTextProps, 'imageSource'> {
	/**
	 * Directus asset ID – passed to MyImage for automatic URL resolution and auth handling.
	 */
	directus_asset_id?: string | number | { id?: string | number } | null;
	/**
	 * Remote image URL – passed to MyImage for automatic auth handling.
	 */
	remote_image_url?: string | null;
	/**
	 * Default image URL used as fallback when no directus_asset_id or remote_image_url is available.
	 */
	defaultImageUrl?: string | null;
	/**
	 * Legacy prop: raw image source object. When provided, bypasses MyImage entirely
	 * and is forwarded directly to the base CardWithText.
	 */
	imageSource?: ImageSourcePropType;
}

const CardWithText: React.FC<CardWithTextProps> = ({
	directus_asset_id,
	remote_image_url,
	defaultImageUrl,
	imageSource,
	imageChildren,
	...rest
}) => {
	const hasImageData = !!(directus_asset_id || remote_image_url || defaultImageUrl);

	if (hasImageData) {
		return (
			<BaseCardWithText
				{...rest}
				imageChildren={
					<>
						<MyImage
							directus_asset_id={directus_asset_id}
							remote_image_url={remote_image_url}
							defaultImageUrl={defaultImageUrl}
							style={internalStyles.image}
							contentFit="cover"
						/>
						{imageChildren}
					</>
				}
			/>
		);
	}

	return (
		<BaseCardWithText
			{...rest}
			imageSource={imageSource}
			imageChildren={imageChildren}
		/>
	);
};

export default memo(CardWithText);

const internalStyles = StyleSheet.create({
	image: {
		width: '100%',
		height: '100%',
	},
});

