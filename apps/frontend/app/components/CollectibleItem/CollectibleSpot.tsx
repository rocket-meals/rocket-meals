import React from 'react';
import { View } from 'react-native';
import { CollectibleAt } from 'repo-depkit-common';

import CollectibleItem from './index';

type CollectibleSpotProps = {
        collectibleKey: CollectibleAt;
        isPreview?: boolean;
};

const CollectibleSpot: React.FC<CollectibleSpotProps> = ({ collectibleKey, isPreview }) => {
        return (
                <View style={{ alignItems: 'center', marginVertical: 20 }}>
                        <CollectibleItem
                                collectibleKey={collectibleKey}
                                hideOnCollect={isPreview ? false : undefined}
                                isPreview={isPreview}
                        />
                </View>
        );
};

export default CollectibleSpot;
