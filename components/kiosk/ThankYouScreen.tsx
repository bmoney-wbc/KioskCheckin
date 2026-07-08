import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Language } from '@/app/index';

const COUNTDOWN_SECONDS = 5;

const T = {
  heading: { en: 'Thank You,', es: '¡Gracias,' },
  headingEnd: { en: '!', es: '!' },
  subtext: {
    en: 'Your responses have been submitted. Please have a seat.',
    es: 'Sus respuestas han sido enviadas. Por favor tome asiento.',
  },
  returning: {
    en: 'Returning to home screen in',
    es: 'Regresando a la pantalla principal en',
  },
  seconds: { en: 'seconds...', es: 'segundos...' },
};

interface ThankYouScreenProps {
  language: Language;
  onToggleLanguage: () => void;
  firstName: string;
  onComplete: () => void;
}

export function ThankYouScreen({
  language,
  onToggleLanguage,
  firstName,
  onComplete,
}: ThankYouScreenProps) {
  const insets = useSafeAreaInsets();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const t = (key: keyof typeof T) => T[key][language];

  useEffect(() => {
    countRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countRef.current) clearInterval(countRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    timerRef.current = setTimeout(() => {
      onComplete();
    }, COUNTDOWN_SECONDS * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countRef.current) clearInterval(countRef.current);
    };
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 0) }]}>
      <LanguageToggle language={language} onToggle={onToggleLanguage} />

      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.checkmark}>✓</Text>
        </View>

        <Text style={styles.heading}>
          {t('heading')} {firstName}{t('headingEnd')}
        </Text>
        <Text style={styles.subtext}>{t('subtext')}</Text>

        {/* Countdown bar */}
        <View style={styles.countdownTrack}>
            <View style={[styles.countdownFill, { flex: Math.round((countdown / COUNTDOWN_SECONDS) * 100) }]} />
            <View style={{ flex: 100 - Math.round((countdown / COUNTDOWN_SECONDS) * 100) }} />
          </View>

        <Text style={styles.countdownText}>
          {t('returning')} {countdown} {t('seconds')}
        </Text>
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
    borderTopWidth: 6,
    borderTopColor: Colors.primary,
    ...Shadow.card,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  checkmark: {
    fontSize: 52,
    color: Colors.primary,
    fontWeight: '800',
    lineHeight: 64,
  },
  heading: {
    fontSize: Typography.heading1,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: Typography.heading1 * 1.2,
    marginBottom: Spacing.md,
  },
  subtext: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.body * 1.5,
    marginBottom: Spacing.md,
  },
  countdownTrack: {
    width: '100%',
    height: 6,
    flexDirection: 'row',
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  countdownFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  countdownText: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
