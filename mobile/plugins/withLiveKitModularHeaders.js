/**
 * P0 FIX: Enable modular headers for livekit-react-native-webrtc
 * 
 * ROOT CAUSE:
 * EAS builds iOS pods as static libraries.
 * Swift pods (livekit-react-native) REQUIRE module maps.
 * livekit-react-native-webrtc does not define modules unless modular headers are enabled.
 * 
 * FIX:
 * This plugin adds targeted modular_headers configuration to the Podfile.
 * Using :modular_headers => true for the specific pod (least invasive).
 * 
 * DO NOT REMOVE - EAS iOS builds will fail without this.
 */

const { withDangerousMod, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withLiveKitModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (!fs.existsSync(podfilePath)) {
        console.warn('[withLiveKitModularHeaders] Podfile not found, skipping');
        return config;
      }

      let podfileContents = fs.readFileSync(podfilePath, 'utf8');

      // Check if already patched
      if (podfileContents.includes('livekit-react-native-webrtc') && podfileContents.includes('modular_headers')) {
        console.log('[withLiveKitModularHeaders] Already patched, skipping');
        return config;
      }

      // Add modular headers configuration for livekit-react-native-webrtc
      // Insert after use_react_native! block or at the end of the target block
      const modularHeadersPatch = `
  # P0 FIX: Enable modular headers for livekit-react-native-webrtc
  # Required because Swift pods need module maps when built as static libraries.
  # DO NOT REMOVE - EAS iOS builds will fail without this.
  pod 'livekit-react-native-webrtc', :modular_headers => true
`;

      // Find the location to insert - after use_react_native! call
      const useReactNativeMatch = podfileContents.match(/use_react_native!\s*\([^)]*\)/s);
      
      if (useReactNativeMatch) {
        const insertIndex = useReactNativeMatch.index + useReactNativeMatch[0].length;
        podfileContents = 
          podfileContents.slice(0, insertIndex) + 
          '\n' + modularHeadersPatch + 
          podfileContents.slice(insertIndex);
      } else {
        // Fallback: insert before the last 'end' in the main target
        const targetEndMatch = podfileContents.lastIndexOf('\nend');
        if (targetEndMatch !== -1) {
          podfileContents = 
            podfileContents.slice(0, targetEndMatch) + 
            '\n' + modularHeadersPatch + 
            podfileContents.slice(targetEndMatch);
        }
      }

      fs.writeFileSync(podfilePath, podfileContents);
      console.log('[withLiveKitModularHeaders] ✅ Patched Podfile with modular headers for livekit-react-native-webrtc');

      return config;
    },
  ]);
}

module.exports = withLiveKitModularHeaders;
