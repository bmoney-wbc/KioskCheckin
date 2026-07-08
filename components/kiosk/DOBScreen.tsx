import React, { useState, useCallback, useRef } from 'react';
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
import { lookupPatientsByDOB, LookupResult } from '@/services/kioskService';
import { CLINIC_NAME, ERROR_AUTO_RETURN_DELAY } from '@/constants/config';
import { Language } from '@/app/index';

const T = {
  heading: { en: 'Enter Your Date of Birth', es: 'Ingrese Su Fecha de Nacimiento' },
  mm: { en: 'MM', es: 'MM' },
  dd: { en: 'DD', es: 'DD' },
  yyyy: { en: 'YYYY', es: 'AAAA' },
  clear: { en: 'Clear', es: 'Borrar' },
  continueBtn: { en: 'Continue', es: 'Continuar' },
  errorInvalid: { en: 'Invalid date. Please try again.', es: 'Fecha inválida. Inténtelo de nuevo.' },
  errorFrontDesk: {
    en: 'Please see the front desk to verify your information.',
    es: 'Por favor vaya a la recepción para verificar su información.',
  },
  errorNoRecord: {
    en: 'No record found. Please see the front desk.',
    es: 'No se encontró registro. Por favor vaya a la recepción.',
  },
  errorGeneric: {
    en: 'Something went wrong. Please see the front desk.',
    es: 'Algo salió mal. Por favor vaya a la recepción.',
  },
  // Admin PIN prompt
  adminPinHeading: { en: 'Admin Access', es: 'Admin Access' },
  adminPinSubtext: { en: 'Enter 4-digit PIN', es: 'Enter 4-digit PIN' },
  adminPinCancel: { en: 'Cancel', es: 'Cancel' },
  adminPinIncorrect: { en: 'Incorrect PIN. Try again.', es: 'Incorrect PIN. Try again.' },
};

const NUMPAD_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

const NUMPAD_BTN_SIZE = 88;
const NUMPAD_GAP = 14;

// 5-tap detection window (ms)
const TAP_WINDOW_MS = 3000;
const TAP_COUNT_REQUIRED = 5;

function maskDOBDisplay(digits: string): { mm: string; dd: string; yyyy: string } {
  const mm = digits.slice(0, 2).padEnd(2, ' ');
  const dd = digits.slice(2, 4).padEnd(2, ' ');
  const yyyy = digits.slice(4, 8).padEnd(4, ' ');
  return { mm, dd, yyyy };
}

function isValidDate(digits: string): boolean {
  if (digits.length < 8) return false;
  const mm = parseInt(digits.slice(0, 2), 10);
  const dd = parseInt(digits.slice(2, 4), 10);
  const yyyy = parseInt(digits.slice(4, 8), 10);
  if (mm < 1 || mm > 12) return false;
  if (dd < 1) return false;
  if (yyyy < 1900 || yyyy > new Date().getFullYear()) return false;
  const date = new Date(yyyy, mm - 1, dd);
  return (
    date.getFullYear() === yyyy &&
    date.getMonth() === mm - 1 &&
    date.getDate() === dd
  );
}

function toISO(digits: string): string {
  const mm = digits.slice(0, 2);
  const dd = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  return `${yyyy}-${mm}-${dd}`;
}

interface DOBScreenProps {
  language: Language;
  onToggleLanguage: () => void;
  onSuccess: (result: LookupResult) => void;
  adminPin: string;
  onAdminAccess: () => void;
}

export function DOBScreen({
  language,
  onToggleLanguage,
  onSuccess,
  adminPin,
  onAdminAccess,
}: DOBScreenProps) {
  const insets = useSafeAreaInsets();
  const [digits, setDigits] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Admin PIN modal state
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [pinDigits, setPinDigits] = useState('');
  const [pinError, setPinError] = useState('');

  // 5-tap secret trigger
  const tapTimesRef = useRef<number[]>([]);

  const t = useCallback((key: keyof typeof T) => T[key][language], [language]);

  // ── 5-tap admin access on clinic name ───────────────────────
  const handleClinicNamePress = useCallback(() => {
    const now = Date.now();
    tapTimesRef.current = [...tapTimesRef.current, now].filter(
      t => now - t < TAP_WINDOW_MS
    );
    if (tapTimesRef.current.length >= TAP_COUNT_REQUIRED) {
      tapTimesRef.current = [];
      setShowAdminPin(true);
      setPinDigits('');
      setPinError('');
    }
  }, []);

  // ── Admin PIN numpad ─────────────────────────────────────────
  const handlePinKey = useCallback((key: string) => {
    setPinError('');
    if (key === '⌫') {
      setPinDigits(prev => prev.slice(0, -1));
    } else if (key !== '' && pinDigits.length < 4) {
      const next = pinDigits + key;
      setPinDigits(next);
      if (next.length === 4) {
        // Validate PIN
        if (next === adminPin) {
          setShowAdminPin(false);
          setPinDigits('');
          onAdminAccess();
        } else {
          setPinError(T.adminPinIncorrect[language]);
          setTimeout(() => setPinDigits(''), 600);
        }
      }
    }
  }, [pinDigits, adminPin, language, onAdminAccess]);

  // ── DOB numpad ───────────────────────────────────────────────
  const handleKey = useCallback(
    (key: string) => {
      if (loading) return;
      setErrorMsg('');
      if (key === '⌫') {
        setDigits(prev => prev.slice(0, -1));
      } else if (key !== '' && digits.length < 8) {
        setDigits(prev => prev + key);
      }
    },
    [digits, loading]
  );

  const handleClear = useCallback(() => {
    setDigits('');
    setErrorMsg('');
  }, []);

  const handleContinue = useCallback(async () => {
    if (digits.length < 8 || loading) return;

    if (!isValidDate(digits)) {
      setErrorMsg(t('errorInvalid'));
      return;
    }

    const isoDate = toISO(digits);

    if (isoDate === '1969-12-31') {
      setErrorMsg(t('errorFrontDesk'));
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const result = await lookupPatientsByDOB(isoDate);
    setLoading(false);

    if (result.error) {
      setErrorMsg(t('errorGeneric'));
      setTimeout(() => { setDigits(''); setErrorMsg(''); }, ERROR_AUTO_RETURN_DELAY);
      return;
    }

    if (result.groups.length === 0) {
      setErrorMsg(t('errorNoRecord'));
      setTimeout(() => { setDigits(''); setErrorMsg(''); }, ERROR_AUTO_RETURN_DELAY);
      return;
    }

    setDigits('');
    onSuccess(result);
  }, [digits, loading, t, onSuccess]);

  const { mm, dd, yyyy } = maskDOBDisplay(digits);
  const canContinue = digits.length === 8 && !loading;
  const activeField = digits.length < 2 ? 'mm' : digits.length < 4 ? 'dd' : 'yyyy';

  // ── Admin PIN overlay ─────────────────────────────────────────
  if (showAdminPin) {
    return (
      <View style={[styles.screen, { paddingTop: Math.max(insets.top, 0) }]}>
        <View style={styles.card}>
          <Text style={styles.clinicName}>ADMIN ACCESS</Text>
          <Text style={styles.heading}>{T.adminPinSubtext[language]}</Text>

          {/* PIN dots */}
          <View style={styles.pinDotsRow}>
            {[0, 1, 2, 3].map(i => (
              <View
                key={i}
                style={[styles.pinDot, i < pinDigits.length && styles.pinDotFilled]}
              />
            ))}
          </View>

          {pinError !== '' && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{pinError}</Text>
            </View>
          )}

          {/* Numpad */}
          <View style={styles.numpad}>
            {NUMPAD_KEYS.map((row, rIdx) => (
              <View key={rIdx} style={styles.numpadRow}>
                {row.map((key, kIdx) => {
                  if (key === '') {
                    return <View key={kIdx} style={styles.numpadSpacer} />;
                  }
                  const isBackspace = key === '⌫';
                  return (
                    <Pressable
                      key={kIdx}
                      onPress={() => handlePinKey(key)}
                      style={({ pressed }) => [
                        styles.numpadBtn,
                        isBackspace && styles.numpadBtnBack,
                        pressed && styles.numpadBtnPressed,
                      ]}
                      accessibilityLabel={key}
                    >
                      <Text style={[styles.numpadBtnText, isBackspace && styles.numpadBtnBackText]}>
                        {key}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => { setShowAdminPin(false); setPinDigits(''); setPinError(''); }}
            style={({ pressed }) => [styles.clearBtn, { width: '100%' }, pressed && styles.clearBtnPressed]}
          >
            <Text style={styles.clearBtnText}>{T.adminPinCancel[language]}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 0) }]}>
      <LanguageToggle language={language} onToggle={onToggleLanguage} />

      <View style={styles.card}>
        {/* Clinic name — 5-tap triggers admin */}
        <Pressable onPress={handleClinicNamePress} hitSlop={8}>
          <Text style={styles.clinicName}>{CLINIC_NAME.toUpperCase()}</Text>
        </Pressable>

        <Text style={styles.heading}>{t('heading')}</Text>

        {/* DOB Display */}
        <View style={styles.dobRow}>
          <View style={[styles.dobField, activeField === 'mm' && digits.length < 2 && styles.dobFieldActive]}>
            <Text style={[styles.dobValue, digits.length === 0 && styles.dobValuePlaceholder]}>
              {mm.trim() === '' ? t('mm') : mm}
            </Text>
          </View>

          <Text style={styles.dobSep}>/</Text>

          <View style={[styles.dobField, activeField === 'dd' && digits.length >= 2 && digits.length < 4 && styles.dobFieldActive]}>
            <Text style={[styles.dobValue, digits.length < 2 && styles.dobValuePlaceholder]}>
              {digits.length < 2 ? t('dd') : dd}
            </Text>
          </View>

          <Text style={styles.dobSep}>/</Text>

          <View style={[styles.dobFieldYear, activeField === 'yyyy' && digits.length >= 4 && styles.dobFieldActive]}>
            <Text style={[styles.dobValue, digits.length < 4 && styles.dobValuePlaceholder]}>
              {digits.length < 4 ? t('yyyy') : yyyy}
            </Text>
          </View>
        </View>

        {/* Error banner */}
        {errorMsg !== '' && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Numpad */}
        <View style={styles.numpad}>
          {NUMPAD_KEYS.map((row, rIdx) => (
            <View key={rIdx} style={styles.numpadRow}>
              {row.map((key, kIdx) => {
                if (key === '') {
                  return <View key={kIdx} style={styles.numpadSpacer} />;
                }
                const isBackspace = key === '⌫';
                return (
                  <Pressable
                    key={kIdx}
                    onPress={() => handleKey(key)}
                    style={({ pressed }) => [
                      styles.numpadBtn,
                      isBackspace && styles.numpadBtnBack,
                      pressed && styles.numpadBtnPressed,
                    ]}
                    accessibilityLabel={key}
                  >
                    <Text style={[styles.numpadBtnText, isBackspace && styles.numpadBtnBackText]}>
                      {key}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={handleClear}
            style={({ pressed }) => [styles.clearBtn, pressed && styles.clearBtnPressed]}
            accessibilityLabel={t('clear')}
          >
            <Text style={styles.clearBtnText}>{t('clear')}</Text>
          </Pressable>

          <Pressable
            onPress={handleContinue}
            disabled={!canContinue}
            style={({ pressed }) => [
              styles.continueBtn,
              !canContinue && styles.continueBtnDisabled,
              pressed && canContinue && styles.continueBtnPressed,
            ]}
            accessibilityLabel={t('continueBtn')}
          >
            {loading ? (
              <ActivityIndicator color={Colors.textOnPrimary} size="small" />
            ) : (
              <Text style={[styles.continueBtnText, !canContinue && styles.continueBtnTextDisabled]}>
                {t('continueBtn')}
              </Text>
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
  clinicName: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: Colors.textMuted,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  heading: {
    fontSize: Typography.heading1,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: Typography.heading1 * 1.2,
  },
  dobRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.lg,
  },
  dobField: {
    width: 90,
    alignItems: 'center',
    paddingBottom: Spacing.xs,
    borderBottomWidth: 3,
    borderBottomColor: Colors.border,
  },
  dobFieldYear: {
    width: 148,
    alignItems: 'center',
    paddingBottom: Spacing.xs,
    borderBottomWidth: 3,
    borderBottomColor: Colors.border,
  },
  dobFieldActive: {
    borderBottomColor: Colors.primary,
  },
  dobValue: {
    fontSize: 38,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    letterSpacing: 2,
    lineHeight: 50,
  },
  dobValuePlaceholder: {
    color: Colors.textMuted,
    fontWeight: Typography.regular,
    fontSize: 28,
  },
  dobSep: {
    fontSize: 32,
    fontWeight: Typography.regular,
    color: Colors.textMuted,
    paddingBottom: 8,
  },
  pinDotsRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
    marginTop: Spacing.sm,
  },
  pinDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: Spacing.md,
  },
  pinDotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  errorBanner: {
    width: '100%',
    backgroundColor: Colors.errorLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: Typography.body,
    color: Colors.error,
    fontWeight: Typography.medium,
    textAlign: 'center',
  },
  numpad: {
    marginBottom: Spacing.xl,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: NUMPAD_GAP,
  },
  numpadSpacer: {
    width: NUMPAD_BTN_SIZE,
    height: NUMPAD_BTN_SIZE,
    marginRight: NUMPAD_GAP,
  },
  numpadBtn: {
    width: NUMPAD_BTN_SIZE,
    height: NUMPAD_BTN_SIZE,
    marginRight: NUMPAD_GAP,
    backgroundColor: Colors.numpadBg,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.numpadBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.subtle,
  },
  numpadBtnPressed: {
    backgroundColor: Colors.numpadPressed,
    borderColor: Colors.primary,
    transform: [{ scale: 0.97 }],
  },
  numpadBtnBack: {
    backgroundColor: Colors.surfaceSecondary,
    borderColor: Colors.border,
  },
  numpadBtnText: {
    fontSize: 32,
    fontWeight: Typography.semibold,
    color: Colors.numpadText,
  },
  numpadBtnBackText: {
    fontSize: 28,
    color: Colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
  },
  clearBtn: {
    flex: 35,
    marginRight: Spacing.md,
    height: 60,
    backgroundColor: 'transparent',
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnPressed: {
    backgroundColor: Colors.surfaceSecondary,
    transform: [{ scale: 0.97 }],
  },
  clearBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },
  continueBtn: {
    flex: 60,
    height: 60,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.button,
  },
  continueBtnDisabled: {
    backgroundColor: Colors.disabled,
    shadowOpacity: 0,
    elevation: 0,
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
  continueBtnTextDisabled: {
    color: Colors.disabledText,
  },
});
