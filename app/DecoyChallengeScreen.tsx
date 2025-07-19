// screens/DecoyChallengeScreen.tsx
import React from 'react';
import { View, Text, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const DecoyChallengeScreen = () => {
const navigation = useNavigation<any>(); 

  const handleContinue = () => {
    // Simulate successful challenge
    navigation.navigate('(tabs)'); // ✅ this goes to your tab screen

  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        Verify Your Identity
      </Text>
      <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 40 }}>
        Due to unusual behavior, we need to confirm it's really you.
      </Text>
      <Button title="Answer Challenge (Fake)" onPress={handleContinue} />
    </View>
  );
};

export default DecoyChallengeScreen;
