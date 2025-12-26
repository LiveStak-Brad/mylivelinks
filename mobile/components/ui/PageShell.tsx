import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { GlobalHeader } from './GlobalHeader';

type PageShellProps = {
  title?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
};

export function PageShell({ title, left, right, children, style, contentStyle, edges }: PageShellProps) {
  return (
    <SafeAreaView style={[styles.container, style]} edges={edges ?? ['top', 'left', 'right', 'bottom']}>
      {title ? <GlobalHeader title={title} left={left} right={right} /> : null}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
});
