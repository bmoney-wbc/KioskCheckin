import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Language } from '@/app/index';

const T = {
  heading: {
    en: 'Do you have another area of concern?',
    es: '¿Tiene otra área de molestia?',
  },
  subheading: {
    en: 'You can add up to 3 areas total',
    es: 'Puede agregar hasta 3 áreas en total',
  },
  yes: { en: 'Yes, add another', es: 'Sí, agregar otra' },
  no: { en: 'No, continue', es: 'No, continuar' },
};

interface AskAnotherScreenProps {
  language: Language;
  onToggleLanguage: () => void;
  onYes: () => void;
  onNo: () => void;
}

export function AskAnotherScreen({
  language,
  onToggleLanguage,
  onYes,
  onNo,
}: AskAnotherScreenProps) {
  const insets = useSafeAreaInsets();
  const t = useCallback((key: keyof typeof T) => T[key][language], [language]);

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 0) }]}>
      <LanguageToggle language={language} onToggle={onToggleLanguage} />

      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>🩺</Text>
        </View>

        <Text style={styles.heading}>{t('heading')}</Text>
        <Text style={styles.subheading}>{t('subheading')}</Text>

        <View style={styles.divider} />

        <View style={styles.buttonsCol}>
          <Pressable
            onPress={onYes}
            style={({ pressed }) => [styles.yesBtn, pressed && styles.yesBtnPressed]}
            accessibilityLabel={t('yes')}
          >
            <Text style={styles.yesBtnText}>{t('yes')}</Text>
          </Pressable>

          <Pressable
            onPress={onNo}
            style={({ pressed }) => [styles.noBtn, pressed && styles.noBtnPressed]}
            accessibilityLabel={t('no')}
          >
            <Text style={styles.noBtnText}>{t('no')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xxl,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadow.card,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  iconEmoji: {
    fontSize: 44,
  },
  heading: {
    fontSize: Typography.heading2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: Typography.heading2 * 1.25,
    marginBottom: Spacing.sm,
  },
  subheading: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.body * 1.4,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xl,
  },
  buttonsCol: {
    width: '100%',
  },
  yesBtn: {
    height: 64,
    marginBottom: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.button,
  },
  yesBtnPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.97 }],
  },
  yesBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textOnPrimary,
  },
  noBtn: {
    height: 64,
    backgroundColor: 'transparent',
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noBtnPressed: {
    backgroundColor: Colors.surfaceSecondary,
    transform: [{ scale: 0.97 }],
  },
  noBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },
});
