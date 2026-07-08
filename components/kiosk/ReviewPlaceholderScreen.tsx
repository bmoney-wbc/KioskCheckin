import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Language } from '@/app/index';
import { ComplaintAnswers, GeneralAnswers } from '@/components/kiosk/QuestionnaireScreen';

const T = {
  heading: { en: 'Review Your Answers', es: 'Revise Sus Respuestas' },
  subheading: {
    en: 'Please review your responses before submitting.',
    es: 'Por favor revise sus respuestas antes de enviar.',
  },
  complaint: { en: 'Concern', es: 'Molestia' },
  general: { en: 'General Questions', es: 'Preguntas Generales' },
  submit: { en: 'Submit', es: 'Enviar' },
  back: { en: 'Back', es: 'Atrás' },
  comingSoon: {
    en: 'Submission will be wired in Prompt 3',
    es: 'El envío se conectará en el Paso 3',
  },
};

interface ReviewPlaceholderScreenProps {
  language: Language;
  onToggleLanguage: () => void;
  complaints: { complaintNum: number; answers: ComplaintAnswers }[];
  generalAnswers: GeneralAnswers;
  onBack: () => void;
}

export function ReviewPlaceholderScreen({
  language,
  onToggleLanguage,
  complaints,
  generalAnswers,
  onBack,
}: ReviewPlaceholderScreenProps) {
  const insets = useSafeAreaInsets();
  const t = useCallback((key: keyof typeof T) => T[key][language], [language]);

  const renderValue = (val: unknown): string => {
    if (Array.isArray(val)) return val.join(', ') || '—';
    if (val === null || val === undefined || val === '') return '—';
    return String(val);
  };

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
        {complaints.map((c, idx) => (
          <View key={idx} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>
                  {t('complaint')} {c.complaintNum}
                </Text>
              </View>
            </View>
            {Object.entries(c.answers).map(([key, val]) => (
              <View key={key} style={styles.row}>
                <Text style={styles.rowKey}>{key}</Text>
                <Text style={styles.rowValue}>{renderValue(val)}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionBadge, styles.sectionBadgeGeneral]}>
              <Text style={[styles.sectionBadgeText, styles.sectionBadgeTextGeneral]}>
                {t('general')}
              </Text>
            </View>
          </View>
          {Object.entries(generalAnswers).map(([key, val]) => (
            <View key={key} style={styles.row}>
              <Text style={styles.rowKey}>{key}</Text>
              <Text style={styles.rowValue}>{renderValue(val)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.comingSoon}>{t('comingSoon')}</Text>
      </ScrollView>

      {/* Fixed footer */}
      <View style={styles.footer}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityLabel={t('back')}
        >
          <Text style={styles.backBtnText}>{t('back')}</Text>
        </Pressable>
        <Pressable
          style={styles.submitBtnDisabled}
          accessibilityLabel={t('submit')}
          disabled
        >
          <Text style={styles.submitBtnText}>{t('submit')}</Text>
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
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.subtle,
  },
  sectionHeader: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
  },
  sectionBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  sectionBadgeGeneral: {
    backgroundColor: Colors.successLight,
  },
  sectionBadgeText: {
    fontSize: Typography.caption,
    fontWeight: Typography.bold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBadgeTextGeneral: {
    color: Colors.success,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  rowKey: {
    fontSize: Typography.caption,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    width: 120,
    flexShrink: 0,
    paddingTop: 1,
  },
  rowValue: {
    flex: 1,
    fontSize: Typography.caption,
    color: Colors.textPrimary,
    fontWeight: Typography.medium,
    lineHeight: Typography.caption * 1.5,
  },
  comingSoon: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    flex: 1,
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
  submitBtnDisabled: {
    flex: 2,
    height: 60,
    backgroundColor: Colors.disabled,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.disabledText,
  },
});
