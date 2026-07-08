import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import {
  KioskPatient,
  KioskMatch,
  createWalkInAppointment,
} from '@/services/kioskService';
import { Language } from '@/app/index';

const T = {
  heading: {
    en: "We don't have an appointment for you today.",
    es: 'No tenemos una cita para usted hoy.',
  },
  subtext: {
    en: 'Would you like to check in as a walk-in?',
    es: '¿Le gustaría registrarse como paciente sin cita?',
  },
  yesBtn: { en: 'Yes, check me in', es: 'Sí, regístreme' },
  noBtn: { en: 'No, go back', es: 'No, regresar' },
  errorText: {
    en: 'Something went wrong. Please see the front desk.',
    es: 'Algo salió mal. Por favor vaya a la recepción.',
  },
};

interface WalkInScreenProps {
  language: Language;
  onToggleLanguage: () => void;
  /** All cases for this patient (same name, same DOB). Could be 1 or many. */
  cases: KioskPatient[];
  /** Called with the resolved KioskMatch (new walk-in appointment) */
  onConfirm: (match: KioskMatch, needsCasePicker: boolean, allCases: KioskPatient[]) => void;
  onBack: () => void;
}

export function WalkInScreen({
  language,
  onToggleLanguage,
  cases,
  onConfirm,
  onBack,
}: WalkInScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const t = useCallback((key: keyof typeof T) => T[key][language], [language]);

  const handleYes = useCallback(async () => {
    if (loading) return;

    // If multiple cases, we need the case picker first — let the parent handle it
    if (cases.length > 1) {
      // Signal parent to show case picker in walk-in mode
      // We create a placeholder — parent will call createWalkInAppointment after picking
      onConfirm(
        { patient: cases[0], appointment: null as unknown as KioskMatch['appointment'], behavior: null },
        true,
        cases
      );
      return;
    }

    // Single case — create walk-in appointment immediately
    setLoading(true);
    setErrorMsg('');

    const patient = cases[0];
    const { appointment, error } = await createWalkInAppointment(patient);
    setLoading(false);

    if (error || !appointment) {
      setErrorMsg(t('errorText'));
      return;
    }

    // Determine behavior from case_type — parent already has behaviorMap,
    // but we pass null here and let the parent/greeting screen resolve it
    onConfirm({ patient, appointment, behavior: null }, false, cases);
  }, [loading, cases, onConfirm, t]);

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 0) }]}>
      <LanguageToggle language={language} onToggle={onToggleLanguage} />

      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>🏥</Text>
        </View>

        <Text style={styles.heading}>{t('heading')}</Text>
        <Text style={styles.subtext}>{t('subtext')}</Text>

        {errorMsg !== '' && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.btnStack}>
          <Pressable
            onPress={handleYes}
            disabled={loading}
            style={({ pressed }) => [
              styles.yesBtn,
              loading && styles.yesBtnLoading,
              pressed && !loading && styles.yesBtnPressed,
            ]}
            accessibilityLabel={t('yesBtn')}
          >
            {loading ? (
              <ActivityIndicator color={Colors.textOnPrimary} size="small" />
            ) : (
              <Text style={styles.yesBtnText}>{t('yesBtn')}</Text>
            )}
          </Pressable>

          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.noBtn, pressed && styles.noBtnPressed]}
            accessibilityLabel={t('noBtn')}
          >
            <Text style={styles.noBtnText}>{t('noBtn')}</Text>
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
    backgroundColor: Colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  iconEmoji: { fontSize: 44 },
  heading: {
    fontSize: Typography.heading2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: Typography.heading2 * 1.3,
    marginBottom: Spacing.md,
  },
  subtext: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.body * 1.5,
    marginBottom: Spacing.xl,
  },
  errorBanner: {
    width: '100%',
    backgroundColor: Colors.errorLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: Typography.body,
    color: Colors.error,
    fontWeight: Typography.medium,
    textAlign: 'center',
  },
  btnStack: {
    width: '100%',
  },
  yesBtn: {
    width: '100%',
    height: 64,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadow.button,
  },
  yesBtnLoading: { backgroundColor: Colors.primaryDark },
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
    width: '100%',
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
