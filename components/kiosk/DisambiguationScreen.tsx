import React, { useCallback, useRef, useEffect } from 'react';
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
import { PatientGroup } from '@/services/kioskService';
import { NONE_OF_THESE_AUTO_RETURN_DELAY } from '@/constants/config';
import { Language } from '@/app/index';

const T = {
  heading: { en: 'Select Your Name', es: 'Seleccione Su Nombre' },
  subheading: {
    en: 'Tap the name that matches yours',
    es: 'Toque el nombre que corresponde al suyo',
  },
  noneOfThese: { en: 'None of these is me', es: 'Ninguno es mi nombre' },
  frontDesk: { en: 'Please see the front desk.', es: 'Por favor vaya a la recepción.' },
};

function maskName(firstName: string, lastName: string): string {
  const maskedFirst =
    firstName.length > 0
      ? firstName[0] + '*'.repeat(Math.max(firstName.length - 1, 2))
      : '***';
  const maskedLast =
    lastName.length > 0
      ? lastName[0] + '*'.repeat(Math.max(lastName.length - 1, 2))
      : '***';
  return `${maskedFirst}  ${maskedLast}`;
}

interface DisambiguationScreenProps {
  language: Language;
  onToggleLanguage: () => void;
  groups: PatientGroup[];
  onSelect: (group: PatientGroup) => void;
  onNoneOfThese: () => void;
}

export function DisambiguationScreen({
  language,
  onToggleLanguage,
  groups,
  onSelect,
  onNoneOfThese,
}: DisambiguationScreenProps) {
  const insets = useSafeAreaInsets();
  const [showFrontDesk, setShowFrontDesk] = React.useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const t = useCallback((key: keyof typeof T) => T[key][language], [language]);

  const handleNoneOfThese = useCallback(() => {
    setShowFrontDesk(true);
    timerRef.current = setTimeout(() => {
      onNoneOfThese();
    }, NONE_OF_THESE_AUTO_RETURN_DELAY);
  }, [onNoneOfThese]);

  if (showFrontDesk) {
    return (
      <View style={styles.screen}>
        <LanguageToggle language={language} onToggle={onToggleLanguage} />
        <View style={[styles.card, styles.cardWarning]}>
          <Text style={styles.warningIcon}>🏥</Text>
          <Text style={styles.frontDeskText}>{t('frontDesk')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LanguageToggle language={language} onToggle={onToggleLanguage} />

      <View style={[styles.card, { paddingTop: Math.max(insets.top, Spacing.xxl) + Spacing.md }]}>
        <Text style={styles.heading}>{t('heading')}</Text>
        <Text style={styles.subheading}>{t('subheading')}</Text>

        <FlatList
          data={groups}
          keyExtractor={item => `${item.firstName}|${item.lastName}`}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const masked = maskName(item.firstName, item.lastName);
            return (
              <Pressable
                onPress={() => onSelect(item)}
                style={({ pressed }) => [styles.nameRow, pressed && styles.nameRowPressed]}
                accessibilityLabel={masked}
              >
                <View style={styles.accentBar} />
                <Text style={styles.maskedName}>{masked}</Text>
                <Text style={styles.arrowIcon}>›</Text>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />

        <Pressable
          onPress={handleNoneOfThese}
          style={({ pressed }) => [styles.noneBtn, pressed && styles.noneBtnPressed]}
          accessibilityLabel={t('noneOfThese')}
          hitSlop={16}
        >
          <Text style={styles.noneBtnText}>{t('noneOfThese')}</Text>
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
  cardWarning: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  warningIcon: {
    fontSize: 56,
    marginBottom: Spacing.lg,
  },
  heading: {
    fontSize: Typography.heading1,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
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
  },
  listContent: {
    paddingBottom: Spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 76,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    borderRadius: Radius.md,
  },
  nameRowPressed: {
    backgroundColor: Colors.primaryLight,
  },
  accentBar: {
    width: 5,
    alignSelf: 'stretch',
    backgroundColor: Colors.primary,
    borderRadius: 3,
    marginRight: Spacing.lg,
  },
  maskedName: {
    flex: 1,
    fontSize: 26,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    letterSpacing: 2.5,
    fontFamily: 'monospace',
  },
  arrowIcon: {
    fontSize: 28,
    color: Colors.textMuted,
    marginRight: Spacing.md,
    fontWeight: Typography.regular,
  },
  noneBtn: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  noneBtnPressed: {
    opacity: 0.6,
  },
  noneBtnText: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
    fontWeight: Typography.medium,
  },
  frontDeskText: {
    fontSize: Typography.heading2,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.heading2 * 1.4,
  },
});
