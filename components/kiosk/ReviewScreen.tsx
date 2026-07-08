import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Language } from '@/app/index';
import { ComplaintAnswers, GeneralAnswers } from '@/components/kiosk/QuestionnaireScreen';
import { KioskQuestionOption, KioskQuestion } from '@/services/kioskService';

const COMPLAINT_ACCENT = ['#2563EB', '#059669', '#F59E0B'];

const LABELS: Record<string, { en: string; es: string }> = {
  Region: { en: 'Location', es: 'Ubicación' },
  Quality: { en: 'Feels like', es: 'Se siente' },
  Frequency: { en: 'Frequency', es: 'Frecuencia' },
  Severity: { en: 'Intensity', es: 'Intensidad' },
  Increases: { en: 'Worse with', es: 'Empeora con' },
  Decreases: { en: 'Better with', es: 'Mejora con' },
  Timing: { en: 'Worst time', es: 'Peor momento' },
  SleepImpact: { en: 'Sleep', es: 'Sueño' },
  ActivityImpact: { en: 'Activities', es: 'Actividades' },
  Comparison: { en: 'Compared to last visit', es: 'Comparado con última visita' },
  NewSymptoms: { en: 'New symptoms', es: 'Síntomas nuevos' },
  Medication: { en: 'Medication taken', es: 'Medicamento tomado' },
};

const T = {
  heading: { en: 'Review Your Answers', es: 'Revise Sus Respuestas' },
  subheading: {
    en: 'Please review before submitting',
    es: 'Por favor revise antes de enviar',
  },
  areaConcern: { en: 'Area of Concern', es: 'Área de Molestia' },
  general: { en: 'General', es: 'General' },
  edit: { en: 'Edit', es: 'Editar' },
  back: { en: 'Back', es: 'Atrás' },
  submit: { en: 'Submit', es: 'Enviar' },
  submitting: { en: 'Submitting...', es: 'Enviando...' },
  errorSubmit: {
    en: 'Something went wrong. Please see the front desk.',
    es: 'Algo salió mal. Por favor vaya a la recepción.',
  },
};

interface ReviewScreenProps {
  language: Language;
  onToggleLanguage: () => void;
  complaints: { complaintNum: number; answers: ComplaintAnswers }[];
  generalAnswers: GeneralAnswers;
  allQuestions: KioskQuestion[];
  optionsByQuestionId: Record<string, KioskQuestionOption[]>;
  onBack: () => void;
  onEditComplaint: (complaintIdx: number) => void;
  onEditGeneral: () => void;
  onSubmit: () => Promise<{ error: string | null }>;
  onSubmitSuccess: () => void;
  onSubmitError: () => void;
}

export function ReviewScreen({
  language,
  onToggleLanguage,
  complaints,
  generalAnswers,
  allQuestions,
  optionsByQuestionId,
  onBack,
  onEditComplaint,
  onEditGeneral,
  onSubmit,
  onSubmitSuccess,
  onSubmitError,
}: ReviewScreenProps) {
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const t = useCallback((key: keyof typeof T) => T[key][language], [language]);

  /** Get label for a question key */
  const fieldLabel = useCallback(
    (key: string): string => {
      const entry = LABELS[key];
      if (!entry) return key;
      return language === 'es' ? entry.es : entry.en;
    },
    [language]
  );

  /** Resolve option values → display labels in patient's language */
  const resolveValues = useCallback(
    (questionKey: string, value: unknown): string => {
      if (value === null || value === undefined || value === '') return '—';
      if (typeof value === 'number') return `${value} / 10`;

      // Find the question to get its options
      const q = allQuestions.find(q => q.question_key === questionKey);
      if (!q) return String(value);
      const opts = optionsByQuestionId[q.id] ?? [];

      const getOptLabel = (val: string): string => {
        const opt = opts.find(o => o.value === val);
        if (!opt) return val;
        return language === 'es' ? opt.label_es : opt.label_en;
      };

      if (Array.isArray(value)) {
        const labels = value.map(v => getOptLabel(v)).filter(Boolean);
        return labels.length > 0 ? labels.join(', ') : '—';
      }

      return getOptLabel(String(value));
    },
    [allQuestions, optionsByQuestionId, language]
  );

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg('');
    const { error } = await onSubmit();
    setSubmitting(false);
    if (error) {
      setErrorMsg(t('errorSubmit'));
      timerRef.current = setTimeout(() => {
        onSubmitError();
      }, 5000);
    } else {
      onSubmitSuccess();
    }
  }, [submitting, onSubmit, t, onSubmitSuccess, onSubmitError]);

  const complaintKeys: (keyof ComplaintAnswers)[] = [
    'Region', 'Quality', 'Frequency', 'Severity',
    'Increases', 'Decreases', 'Timing', 'SleepImpact', 'ActivityImpact',
  ];

  const generalKeys: (keyof GeneralAnswers)[] = ['Comparison', 'NewSymptoms', 'Medication'];

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 0) }]}>
      <LanguageToggle language={language} onToggle={onToggleLanguage} />

      {/* Fixed header */}
      <View style={styles.header}>
        <Text style={styles.heading}>{t('heading')}</Text>
        <Text style={styles.subheading}>{t('subheading')}</Text>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Per-complaint cards */}
        {complaints.map((c, idx) => {
          const accent = COMPLAINT_ACCENT[idx] ?? COMPLAINT_ACCENT[0];
          return (
            <View key={idx} style={[styles.sectionCard, { borderTopColor: accent }]}>
              <View style={styles.sectionCardHeader}>
                <Text style={[styles.sectionTitle, { color: accent }]}>
                  {t('areaConcern')} {c.complaintNum}
                </Text>
                <Pressable
                  onPress={() => onEditComplaint(idx)}
                  style={({ pressed }) => [styles.editBtn, pressed && styles.editBtnPressed]}
                  accessibilityLabel={t('edit')}
                >
                  <Text style={styles.editBtnText}>{t('edit')}</Text>
                </Pressable>
              </View>
              <View style={styles.divider} />
              {complaintKeys.map(key => (
                <View key={key} style={styles.row}>
                  <Text style={styles.rowLabel}>{fieldLabel(key)}</Text>
                  <Text style={styles.rowValue}>
                    {resolveValues(key, c.answers[key])}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}

        {/* General card */}
        <View style={[styles.sectionCard, { borderTopColor: Colors.success }]}>
          <View style={styles.sectionCardHeader}>
            <Text style={[styles.sectionTitle, { color: Colors.success }]}>
              {t('general')}
            </Text>
            <Pressable
              onPress={onEditGeneral}
              style={({ pressed }) => [styles.editBtn, pressed && styles.editBtnPressed]}
              accessibilityLabel={t('edit')}
            >
              <Text style={styles.editBtnText}>{t('edit')}</Text>
            </Pressable>
          </View>
          <View style={styles.divider} />
          {generalKeys.map(key => (
            <View key={key} style={styles.row}>
              <Text style={styles.rowLabel}>{fieldLabel(key)}</Text>
              <Text style={styles.rowValue}>
                {resolveValues(key, generalAnswers[key])}
              </Text>
            </View>
          ))}
        </View>

        {/* Error banner */}
        {errorMsg !== '' && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}
      </ScrollView>

      {/* Fixed footer */}
      <View style={styles.footer}>
        <Pressable
          onPress={onBack}
          disabled={submitting}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityLabel={t('back')}
        >
          <Text style={styles.backBtnText}>{t('back')}</Text>
        </Pressable>

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={({ pressed }) => [
            styles.submitBtn,
            submitting && styles.submitBtnLoading,
            pressed && !submitting && styles.submitBtnPressed,
          ]}
          accessibilityLabel={t('submit')}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.textOnPrimary} size="small" />
          ) : (
            <Text style={styles.submitBtnText}>{t('submit')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    paddingTop: Spacing.xxl + Spacing.md,
    paddingBottom: Spacing.lg,
  },
  heading: {
    fontSize: Typography.heading2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subheading: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    lineHeight: Typography.body * 1.4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.lg,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderTopWidth: 4,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadow.subtle,
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surfaceSecondary,
  },
  sectionTitle: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    letterSpacing: 0.3,
  },
  editBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  editBtnPressed: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  editBtnText: {
    fontSize: Typography.caption,
    fontWeight: Typography.semibold,
    color: Colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    alignItems: 'flex-start',
  },
  rowLabel: {
    width: 130,
    flexShrink: 0,
    fontSize: Typography.caption,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    paddingTop: 1,
    lineHeight: Typography.caption * 1.4,
    marginRight: Spacing.md,
  },
  rowValue: {
    flex: 1,
    fontSize: Typography.caption,
    color: Colors.textPrimary,
    fontWeight: Typography.medium,
    lineHeight: Typography.caption * 1.5,
  },
  errorBanner: {
    backgroundColor: Colors.errorLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: Typography.body,
    color: Colors.error,
    fontWeight: Typography.medium,
    textAlign: 'center',
    lineHeight: Typography.body * 1.4,
  },
  footer: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
  },
  backBtn: {
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
  backBtnPressed: {
    backgroundColor: Colors.surfaceSecondary,
    transform: [{ scale: 0.97 }],
  },
  backBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },
  submitBtn: {
    flex: 2,
    height: 60,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.button,
  },
  submitBtnLoading: {
    backgroundColor: Colors.primaryDark,
  },
  submitBtnPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.97 }],
  },
  submitBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textOnPrimary,
  },
});
