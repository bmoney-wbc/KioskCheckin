import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { KioskMatch } from '@/services/kioskService';
import { Language } from '@/app/index';

const T = {
  heading: {
    en: 'Which case is your visit for today?',
    es: '¿Para cuál caso es su visita de hoy?',
  },
  subheading: {
    en: 'Select your case type',
    es: 'Seleccione su tipo de caso',
  },
  defaultBadge: { en: 'Default', es: 'Predeterminado' },
  continueBtn: { en: 'Continue', es: 'Continuar' },
  notMe: { en: 'This is not me', es: 'No soy yo' },
};

interface CasePickerScreenProps {
  language: Language;
  onToggleLanguage: () => void;
  cases: KioskMatch[];
  onSelect: (match: KioskMatch) => void;
  onNotMe: () => void;
}

export function CasePickerScreen({
  language,
  onToggleLanguage,
  cases,
  onSelect,
  onNotMe,
}: CasePickerScreenProps) {
  const insets = useSafeAreaInsets();

  // Pre-select the default case (is_default_case = true)
  const defaultCase = cases.find(m => m.patient.is_default_case) ?? cases[0];
  const [selectedMatch, setSelectedMatch] = useState<KioskMatch>(defaultCase);

  const t = useCallback((key: keyof typeof T) => T[key][language], [language]);

  const handleContinue = useCallback(() => {
    onSelect(selectedMatch);
  }, [selectedMatch, onSelect]);

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 0) }]}>
      <LanguageToggle language={language} onToggle={onToggleLanguage} />

      <View style={styles.card}>
        <Text style={styles.heading}>{t('heading')}</Text>
        <Text style={styles.subheading}>{t('subheading')}</Text>

        <FlatList
          data={cases}
          keyExtractor={item => String(item.patient.ct_patient_id)}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const isSelected = selectedMatch.patient.ct_patient_id === item.patient.ct_patient_id;
            const caseLabel = item.patient.case_type ?? 'Unknown';
            return (
              <Pressable
                onPress={() => setSelectedMatch(item)}
                style={({ pressed }) => [
                  styles.caseCard,
                  isSelected && styles.caseCardSelected,
                  pressed && styles.caseCardPressed,
                ]}
                accessibilityLabel={caseLabel}
                accessibilityState={{ selected: isSelected }}
              >
                {/* Left accent when selected */}
                {isSelected && <View style={styles.accentBar} />}

                {/* Radio dot */}
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>

                <Text style={[styles.caseLabel, isSelected && styles.caseLabelSelected]}>
                  {caseLabel}
                </Text>

                {item.patient.is_default_case && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>{t('defaultBadge')}</Text>
                  </View>
                )}
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />

        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [styles.continueBtn, pressed && styles.continueBtnPressed]}
          accessibilityLabel={t('continueBtn')}
        >
          <Text style={styles.continueBtnText}>{t('continueBtn')}</Text>
        </Pressable>

        <Pressable
          onPress={onNotMe}
          style={({ pressed }) => [styles.notMeBtn, pressed && styles.notMeBtnPressed]}
          accessibilityLabel={t('notMe')}
          hitSlop={16}
        >
          <Text style={styles.notMeBtnText}>{t('notMe')}</Text>
        </Pressable>
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
    maxWidth: 480,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xxl,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadow.card,
  },
  heading: {
    fontSize: Typography.heading2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: Typography.heading2 * 1.2,
    marginBottom: Spacing.sm,
  },
  subheading: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: Typography.body * 1.4,
  },
  list: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  listContent: {
    paddingBottom: Spacing.xs,
  },
  separator: {
    height: Spacing.sm,
  },
  caseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 80,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    overflow: 'hidden',
  },
  caseCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  caseCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginRight: Spacing.md,
  },
  radioSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  radioDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
  },
  caseLabel: {
    flex: 1,
    fontSize: Typography.heading3,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  caseLabelSelected: {
    color: Colors.primaryDark,
    fontWeight: Typography.bold,
  },
  defaultBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    marginLeft: Spacing.sm,
  },
  defaultBadgeText: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: Colors.textOnPrimary,
  },
  continueBtn: {
    width: '100%',
    height: 60,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadow.button,
  },
  continueBtnPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.97 }],
  },
  continueBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textOnPrimary,
  },
  notMeBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  notMeBtnPressed: { opacity: 0.6 },
  notMeBtnText: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
    fontWeight: Typography.medium,
  },
});
