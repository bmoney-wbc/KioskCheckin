import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { KioskQuestionOption } from '@/services/kioskService';

interface SingleSelectQuestionProps {
  options: KioskQuestionOption[];
  selectedValue: string;
  onChange: (value: string) => void;
  language: 'en' | 'es';
}

export function SingleSelectQuestion({
  options,
  selectedValue,
  onChange,
  language,
}: SingleSelectQuestionProps) {
  const handleSelect = useCallback((value: string) => { onChange(value); }, [onChange]);

  return (
    <View style={styles.list}>
      {options.map(option => {
        const isSelected = selectedValue === option.value;
        const label = language === 'es' ? option.label_es : option.label_en;
        return (
          <Pressable
            key={option.value}
            onPress={() => handleSelect(option.value)}
            style={({ pressed }) => [
              styles.card,
              isSelected && styles.cardSelected,
              pressed && styles.cardPressed,
            ]}
            accessibilityLabel={label}
            accessibilityState={{ selected: isSelected }}
          >
            {/* Left accent bar when selected */}
            {isSelected && <View style={styles.accentBar} />}

            {/* Radio indicator */}
            <View style={[styles.radio, isSelected && styles.radioSelected]}>
              {isSelected && <View style={styles.radioDot} />}
            </View>

            <Text style={[styles.label, isSelected && styles.labelSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 68,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  cardPressed: {
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
  label: {
    flex: 1,
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.medium,
    color: Colors.textPrimary,
    lineHeight: Typography.bodyLarge * 1.3,
  },
  labelSelected: {
    color: Colors.primaryDark,
    fontWeight: Typography.semibold,
  },
});
