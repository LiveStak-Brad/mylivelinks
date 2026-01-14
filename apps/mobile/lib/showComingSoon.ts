import { Alert } from 'react-native';

/**
 * Shows a consistent "Coming Soon" alert for stub/unimplemented features.
 * Use this instead of empty onPress handlers to provide user feedback.
 */
export function showComingSoon(featureName?: string): void {
  const title = 'Coming Soon';
  const message = featureName
    ? `${featureName} is coming soon!`
    : 'This feature is coming soon!';
  
  Alert.alert(title, message, [{ text: 'OK', style: 'default' }]);
}
