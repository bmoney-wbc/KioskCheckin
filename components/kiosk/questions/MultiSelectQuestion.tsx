import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { KioskQuestionOption } from '@/services/kioskService';

interface MultiSelectQuestionProps {
  options: KioskQuestionOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  language: 'en' | 'es';
  columns?: 2 | 3;
}

export function MultiSelectQuestion({
  options,
  selectedValues,
  onChange,
  language,
  columns = 2,
}: MultiSelectQuestionProps) {
  const handleToggle = useCallback(
    (value: string) => {
      if (selectedValues.includes(value)) {
        onChange(selectedValues.filter(v => v !== value));
      } else {
        onChange([...selectedValues, value]);
      }
    },
    [selectedValues, onChange]
  );

  return (
    <View style={[styles.grid, columns === 3 && styles.grid3]}>
      {options.map(option => {
        const isSelected = selectedValues.includes(option.value);
        const label = language === 'es' ? option.label_es : option.label_en;
        return (
          <Pressable
            key={option.value}
            onPress={() => handleToggle(option.value)}
            style={({ pressed }) => [
              styles.card,
              columns === 3 && styles.card3,
              isSelected && styles.cardSelected,
              pressed && styles.cardPressed,
            ]}
            accessibilityLabel={label}
            accessibilityState={{ selected: isSelected }}
          >
            {/* Checkmark indicator */}
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>

            <Text
              style={[styles.label, isSelected && styles.labelSelected]}
              numberOfLines={2}
              adjustsFontSizeToFit
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  grid3: {
  },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 72,
    marginRight: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  card3: {
    flexBasis: '31%',
    minHeight: 64,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginRight: Spacing.sm,
  },
  checkboxSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  checkmark: {
    color: Colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  label: {
    flex: 1,
    fontSize: Typography.body,
    fontWeight: Typography.medium,
    color: Colors.textPrimary,
    lineHeight: Typography.body * 1.3,
  },
  labelSelected: {
    color: Colors.primaryDark,
    fontWeight: Typography.semibold,
  },
});
