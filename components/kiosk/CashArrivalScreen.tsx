import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { submitArrivalOnly } from '@/services/kioskService';
import { CLINIC_ID } from '@/constants/config';
import { Language } from '@/app/index';
import { KioskMatch } from '@/services/kioskService';

const AUTO_RETURN_DELAY = 5000;

const T = {
  heading: { en: "You're All Checked In!", es: '¡Ya Está Registrado!' },
  subtext: {
    en: "Please have a seat. We'll be with you shortly.",
    es: 'Por favor tome asiento. Lo atenderemos pronto.',
  },
  returning: {
    en: 'Returning to home screen in',
    es: 'Regresando a la pantalla principal en',
  },
  seconds: { en: 'seconds...', es: 'segundos...' },
};

interface CashArrivalScreenProps {
  language: Language;
  onToggleLanguage: () => void;
  match: KioskMatch;
  onComplete: () => void;
}

export function CashArrivalScreen({
  language,
  onToggleLanguage,
  match,
  onComplete,
}: CashArrivalScreenProps) {
  const insets = useSafeAreaInsets();
  const [countdown, setCountdown] = useState(5);
  const [submitting, setSubmitting] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const t = (key: keyof typeof T) => T[key][language];

  useEffect(() => {
    let mounted = true;

    // Submit arrival-only record
    submitArrivalOnly({
      ctPatientId: match.patient.ct_patient_id,
      ctAppointmentId: match.appointment.ct_appointment_id,
      appointmentRowId: match.appointment.id,
      ctDoctorId: match.appointment.ct_doctor_id,
      patientLanguage: language,
      patientId: match.patient.id,
      storedLanguage: match.patient.preferred_language,
      isWalkIn: match.appointment.is_walk_in ?? false,
    }).then(() => {
      if (!mounted) return;
      setSubmitting(false);

      // Start countdown
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
        if (mounted) onComplete();
      }, AUTO_RETURN_DELAY);
    });

    return () => {
      mounted = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countRef.current) clearInterval(countRef.current);
    };
  }, []);

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 0) }]}>
      <LanguageToggle language={language} onToggle={onToggleLanguage} />

      <View style={styles.card}>
        {submitting ? (
          <ActivityIndicator size="large" color={Colors.success} />
        ) : (
          <>
            <View style={styles.iconCircle}>
              <Text style={styles.checkmark}>✓</Text>
            </View>

            <Text style={styles.heading}>{t('heading')}</Text>
            <Text style={styles.subtext}>{t('subtext')}</Text>

            <Text style={styles.countdown}>
              {t('returning')} {countdown} {t('seconds')}
            </Text>
          </>
        )}
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
    borderTopColor: Colors.success,
    ...Shadow.card,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  checkmark: {
    fontSize: 52,
    color: Colors.success,
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
  countdown: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
