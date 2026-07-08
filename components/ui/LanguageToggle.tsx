import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';

type Language = 'en' | 'es';

interface LanguageToggleProps {
  language: Language;
  onToggle: () => void;
}

export function LanguageToggle({ language, onToggle }: LanguageToggleProps) {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.segmented, pressed && styles.pressed]}
        hitSlop={12}
        accessibilityLabel="Toggle language"
      >
        {/* EN segment */}
        <View style={[styles.segment, language === 'en' && styles.segmentActive]}>
          <Text style={styles.flag}>🇺🇸</Text>
          <Text style={[styles.label, language === 'en' && styles.labelActive]}>EN</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* ES segment */}
        <View style={[styles.segment, language === 'es' && styles.segmentActive]}>
          <Text style={styles.flag}>🇲🇽</Text>
          <Text style={[styles.label, language === 'es' && styles.labelActive]}>ES</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    zIndex: 100,
  },
  segmented: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.subtle,
  },
  pressed: {
    opacity: 0.88,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
  },
  segmentActive: {
    backgroundColor: Colors.primary,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
  },
  flag: {
    fontSize: 17,
    marginRight: 6,
  },
  label: {
    fontSize: Typography.caption,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },
  labelActive: {
    color: Colors.textOnPrimary,
    fontWeight: Typography.bold,
  },
});
