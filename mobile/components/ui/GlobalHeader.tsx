import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type GlobalHeaderProps = {
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
};

export function GlobalHeader({ title, left, right }: GlobalHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.side}>{left}</View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.side}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#000',
  },
  side: {
    width: 72,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    maxWidth: '60%',
    textAlign: 'center',
  },
});
