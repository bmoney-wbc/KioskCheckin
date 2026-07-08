import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ARRIVAL_ONLY_AUTO_RETURN_DELAY } from '@/constants/config';
import { Language } from '@/app/index';

const T = {
  questionnairePlaceholder: {
    en: 'Questionnaire will appear here',
    es: 'El cuestionario aparecerá aquí',
  },
  thankyou: {
    en: "You're all checked in!\nPlease have a seat.",
    es: '¡Ya está registrado!\nPor favor tome asiento.',
  },
  backToStart: { en: 'Back to start', es: 'Volver al inicio' },
  returning: {
    en: 'Returning to the start screen shortly...',
    es: 'Volviendo a la pantalla inicial...',
  },
};

interface PlaceholderScreenProps {
  language: Language;
  onToggleLanguage: () => void;
  type: 'questionnaire' | 'thankyou';
  onBack: () => void;
}

export function PlaceholderScreen({
  language,
  onToggleLanguage,
  type,
  onBack,
}: PlaceholderScreenProps) {
  const insets = useSafeAreaInsets();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (type === 'thankyou') {
      timerRef.current = setTimeout(() => { onBack(); }, ARRIVAL_ONLY_AUTO_RETURN_DELAY);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [type, onBack]);

  const t = useCallback((key: keyof typeof T) => T[key][language], [language]);
  const isThankyou = type === 'thankyou';

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 0) }]}>
      <LanguageToggle language={language} onToggle={onToggleLanguage} />

      {isThankyou ? (
        /* Thank-you card — success themed */
        <View style={styles.thankyouCard}>
          <View style={styles.successCircle}>
            <Text style={styles.checkEmoji}>✓</Text>
          </View>
          <Text style={styles.thankyouText}>{t('thankyou')}</Text>
          <Text style={styles.returningText}>{t('returning')}</Text>
        </View>
      ) : (
        /* Questionnaire placeholder */
        <View style={styles.card}>
          <Text style={styles.placeholderEmoji}>📋</Text>
          <Text style={styles.placeholderText}>{t('questionnairePlaceholder')}</Text>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            accessibilityLabel={t('backToStart')}
          >
            <Text style={styles.backBtnText}>{t('backToStart')}</Text>
          </Pressable>
        </View>
      )}
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
  placeholderEmoji: {
    fontSize: 64,
    marginBottom: Spacing.xl,
  },
  placeholderText: {
    fontSize: Typography.heading2,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.heading2 * 1.4,
  },
  backBtn: {
    height: 60,
    paddingHorizontal: Spacing.xxxl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    ...Shadow.button,
  },
  backBtnPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.97 }],
  },
  backBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textOnPrimary,
  },
  // Thank-you styles
    thankyouCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xxl,
    padding: Spacing.xxl,
    alignItems: 'center', 
    ...Shadow.card,
    borderTopWidth: 6,
    borderTopColor: Colors.success,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  checkEmoji: {
    fontSize: 52,
    color: Colors.success,
    fontWeight: Typography.bold,
  },
  thankyouText: {
    fontSize: Typography.heading1,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: Typography.heading1 * 1.25,
  },
  returningText: {
    fontSize: Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: Typography.body * 1.5,
  },
});
