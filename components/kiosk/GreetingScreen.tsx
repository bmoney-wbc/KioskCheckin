import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { KioskMatch, markArrived } from '@/services/kioskService';
import { CLINIC_ID, ERROR_AUTO_RETURN_DELAY } from '@/constants/config';
import { Language } from '@/app/index';

const T = {
  welcome: { en: 'Welcome,', es: '¡Bienvenido/a,' },
  welcomeEnd: { en: '!', es: '!' },
  apptAt: { en: 'Your appointment is at', es: 'Su cita es a las' },
  walkIn: { en: 'Walk-in visit', es: 'Visita sin cita' },
  notMe: { en: 'This is not me', es: 'No soy yo' },
  continueBtn: { en: 'Continue', es: 'Continuar' },
  frontDeskUnmapped: {
    en: 'Please see the front desk.',
    es: 'Por favor vaya a la recepción.',
  },
  errorGeneric: {
    en: 'Something went wrong. Please see the front desk.',
    es: 'Algo salió mal. Por favor vaya a la recepción.',
  },
};

function formatTime(iso: string, lang: Language): string {
  const date = new Date(iso);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? (lang === 'es' ? 'p.m.' : 'PM') : lang === 'es' ? 'a.m.' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const displayMin = minutes.toString().padStart(2, '0');
  return `${displayHour}:${displayMin} ${ampm}`;
}

interface GreetingScreenProps {
  language: Language;
  onToggleLanguage: () => void;
  match: KioskMatch;
  onNotMe: () => void;
  onContinue: (behavior: 'questionnaire' | 'arrival_only' | null) => void;
  onAutoReturn: () => void;
}

export function GreetingScreen({
  language,
  onToggleLanguage,
  match,
  onNotMe,
  onContinue,
  onAutoReturn,
}: GreetingScreenProps) {
  const insets = useSafeAreaInsets();
  const [showFrontDesk, setShowFrontDesk] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const t = useCallback((key: keyof typeof T) => T[key][language], [language]);

  const handleContinue = useCallback(async () => {
    if (loading) return;

    const behavior = match.behavior;

    if (!behavior) {
      setShowFrontDesk(true);
      timerRef.current = setTimeout(() => { onAutoReturn(); }, ERROR_AUTO_RETURN_DELAY);
      return;
    }

    setLoading(true);
    // Mark arrived using row UUID (works for both scheduled and walk-in appointments)
    const { error } = await markArrived(CLINIC_ID, match.appointment.id);
    setLoading(false);

    if (error) {
      setShowFrontDesk(true);
      timerRef.current = setTimeout(() => { onAutoReturn(); }, ERROR_AUTO_RETURN_DELAY);
      return;
    }

    onContinue(behavior);
  }, [loading, match, onContinue, onAutoReturn]);

  const firstName = match.patient.first_name;
  const isWalkIn = match.appointment.is_walk_in;
  const apptTime = formatTime(match.appointment.schedule_date_time, language);

  if (showFrontDesk) {
    return (
      <View style={styles.screen}>
        <LanguageToggle language={language} onToggle={onToggleLanguage} />
        <View style={[styles.card, styles.cardError]}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{t('errorGeneric')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LanguageToggle language={language} onToggle={onToggleLanguage} />

      <View style={[styles.card, { paddingTop: Math.max(insets.top, Spacing.xxl) + Spacing.md }]}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>👋</Text>
        </View>

        <Text style={styles.welcomeText}>
          {t('welcome')} {firstName}{t('welcomeEnd')}
        </Text>

        <Text style={styles.apptText}>
          {isWalkIn ? t('walkIn') : `${t('apptAt')} ${apptTime}`}
        </Text>

        <View style={styles.divider} />

        <View style={styles.actionRow}>
          <Pressable
            onPress={onNotMe}
            style={({ pressed }) => [styles.notMeBtn, pressed && styles.notMeBtnPressed]}
            accessibilityLabel={t('notMe')}
          >
            <Text style={styles.notMeBtnText}>{t('notMe')}</Text>
          </Pressable>

          <Pressable
            onPress={handleContinue}
            disabled={loading}
            style={({ pressed }) => [
              styles.continueBtn,
              loading && styles.continueBtnLoading,
              pressed && !loading && styles.continueBtnPressed,
            ]}
            accessibilityLabel={t('continueBtn')}
          >
            {loading ? (
              <ActivityIndicator color={Colors.textOnPrimary} size="small" />
            ) : (
              <Text style={styles.continueBtnText}>{t('continueBtn')}</Text>
            )}
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
  cardError: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  errorIcon: {
    fontSize: 56,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: Typography.heading2,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.heading2 * 1.4,
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
  iconEmoji: { fontSize: 44 },
  welcomeText: {
    fontSize: Typography.heading1,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: Typography.heading1 * 1.15,
    marginBottom: Spacing.md,
  },
  apptText: {
    fontSize: Typography.body,
    fontWeight: Typography.medium,
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
  actionRow: {
    flexDirection: 'row',
    width: '100%',
  },
  notMeBtn: {
    flex: 1,
    marginRight: Spacing.md,
    height: 60,
    backgroundColor: 'transparent',
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notMeBtnPressed: {
    backgroundColor: Colors.surfaceSecondary,
    transform: [{ scale: 0.97 }],
  },
  notMeBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },
  continueBtn: {
    flex: 2,
    height: 60,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.button,
  },
  continueBtnLoading: { backgroundColor: Colors.primaryDark },
  continueBtnPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.97 }],
  },
  continueBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textOnPrimary,
  },
});
