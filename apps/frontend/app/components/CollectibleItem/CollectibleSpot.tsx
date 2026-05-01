import React from 'react';
import { View } from 'react-native';
import { CollectibleAt, CollectibleAtType } from 'repo-depkit-common';

import CollectibleItem from './index';

type CollectibleSpotProps = {
	collectibleKey: CollectibleAtType;
	isPreview?: boolean;
};

const CollectibleSpot: React.FC<CollectibleSpotProps> = ({ collectibleKey, isPreview }) => {
        return (
                <View style={{ alignItems: 'center', marginVertical: 20 }}>
                        <CollectibleItem
                                collectibleKey={collectibleKey}
                                hideOnCollect={isPreview ? false : undefined}
                                isPreview={isPreview}
                                hideCounter
                        />
                </View>
        );
};

export default CollectibleSpot;
