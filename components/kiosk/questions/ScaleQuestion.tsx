import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

const T = {
  mild: { en: 'Mild', es: 'Leve' },
  severe: { en: 'Severe', es: 'Severo' },
  noSelection: { en: 'Tap a number to rate your pain', es: 'Toca un número para calificar su dolor' },
};

interface ScaleQuestionProps {
  selectedValue: number | null;
  onChange: (value: number) => void;
  language: 'en' | 'es';
}

export function ScaleQuestion({ selectedValue, onChange, language }: ScaleQuestionProps) {
  const t = useCallback((key: keyof typeof T) => T[key][language], [language]);

  const getNumberColor = (n: number): string => {
    if (n <= 3) return '#059669';
    if (n <= 6) return '#D97706';
    return '#DC2626';
  };

  return (
    <View style={styles.container}>
      {/* Large current value display */}
      <View style={styles.valueDisplay}>
        {selectedValue !== null ? (
          <View style={styles.valueCircle}>
            <Text style={[styles.selectedNumber, { color: getNumberColor(selectedValue) }]}>
              {selectedValue}
            </Text>
            <Text style={styles.selectedLabel}>/ 10</Text>
          </View>
        ) : (
          <Text style={styles.noSelectionText}>{t('noSelection')}</Text>
        )}
      </View>

      {/* Range labels */}
      <View style={styles.scaleLabels}>
        <View style={styles.scaleLabelGroup}>
          <View style={[styles.scaleDot, { backgroundColor: '#059669' }]} />
          <Text style={[styles.scaleLabel, { color: '#059669' }]}>1 — {t('mild')}</Text>
        </View>
        <View style={styles.scaleLabelGroup}>
          <Text style={[styles.scaleLabel, { color: '#DC2626' }]}>10 — {t('severe')}</Text>
          <View style={[styles.scaleDot, { backgroundColor: '#DC2626' }]} />
        </View>
      </View>

      {/* Color gradient bar */}
      <View style={styles.gradientBar}>
        <View style={[styles.gradientSegment, { backgroundColor: '#059669', flex: 3 }]} />
        <View style={[styles.gradientSegment, { backgroundColor: '#84CC16', flex: 1 }]} />
        <View style={[styles.gradientSegment, { backgroundColor: '#D97706', flex: 3 }]} />
        <View style={[styles.gradientSegment, { backgroundColor: '#EF4444', flex: 1 }]} />
        <View style={[styles.gradientSegment, { backgroundColor: '#DC2626', flex: 2 }]} />
      </View>

      {/* Number buttons — 2 rows: 1-5 and 6-10 */}
      <View style={styles.numbersGrid}>
        <View style={styles.numbersRow}>
          {[1, 2, 3, 4, 5].map(n => {
            const isSelected = selectedValue === n;
            const numColor = getNumberColor(n);
            return (
              <Pressable
                key={n}
                onPress={() => onChange(n)}
                style={({ pressed }) => [
                  styles.numberBtn,
                  isSelected && { backgroundColor: numColor, borderColor: numColor },
                  pressed && styles.numberBtnPressed,
                ]}
                accessibilityLabel={String(n)}
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[
                  styles.numberText,
                  { color: isSelected ? Colors.textOnPrimary : numColor },
                ]}>
                  {n}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.numbersRow}>
          {[6, 7, 8, 9, 10].map(n => {
            const isSelected = selectedValue === n;
            const numColor = getNumberColor(n);
            return (
              <Pressable
                key={n}
                onPress={() => onChange(n)}
                style={({ pressed }) => [
                  styles.numberBtn,
                  isSelected && { backgroundColor: numColor, borderColor: numColor },
                  pressed && styles.numberBtnPressed,
                ]}
                accessibilityLabel={String(n)}
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[
                  styles.numberText,
                  { color: isSelected ? Colors.textOnPrimary : numColor },
                ]}>
                  {n}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingTop: Spacing.md,
  },
  valueDisplay: {
    minHeight: 96,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueCircle: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  selectedNumber: {
    fontSize: 80,
    fontWeight: '800',
    lineHeight: 88,
  },
  selectedLabel: {
    fontSize: Typography.heading2,
    color: Colors.textMuted,
    fontWeight: Typography.medium,
    paddingBottom: 10,
    marginLeft: Spacing.sm,
  },
  noSelectionText: {
    fontSize: Typography.body,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.md,
  },
  scaleLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scaleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  scaleLabel: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
  },
  gradientBar: {
    flexDirection: 'row',
    width: '100%',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  gradientSegment: {
    height: '100%',
  },
  numbersGrid: {
    width: '100%',
  },
  numbersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  numberBtn: {
    width: 72,
    height: 72,
    marginRight: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 2.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  numberBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  numberText: {
    fontSize: 24,
    fontWeight: '700',
  },
});
