import React, { useEffect, useState } from 'react';
import { Image, View, ActivityIndicator } from 'react-native';
import { Byte, Encoder } from '@nuintun/qrcode';

const VerticalScrollTopFoodScreen = () => {
  const [qrUri, setQrUri] = useState<string | null>(null);

  useEffect(() => {
    const googleUrl = 'https://google.com';

    const encoder = new Encoder({ level: 'H' });
    const qrcode = encoder.encode(new Byte(googleUrl));
    try {
      setQrUri(qrcode.toDataURL());
    } catch (err) {
      console.error(err);
    }
  }, []);

  if (!qrUri) return <ActivityIndicator />;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={{ uri: qrUri }}
        style={{ width: 200, height: 200 }}
        resizeMode="contain"
      />
    </View>
  );

};

export default VerticalScrollTopFoodScreen;
