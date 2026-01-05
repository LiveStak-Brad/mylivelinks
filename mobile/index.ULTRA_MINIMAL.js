import { registerRootComponent } from 'expo';
import { Text, View } from 'react-native';

function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <Text style={{ color: '#0f0', fontSize: 24 }}>ABSOLUTE MINIMAL - NO IMPORTS</Text>
    </View>
  );
}

registerRootComponent(App);
