import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { Language } from '@/app/index';

const IDLE_SECONDS = 60;
const MODAL_COUNTDOWN_SECONDS = 15;

const T = {
  heading: { en: 'Are you still there?', es: '¿Todavía está ahí?' },
  yesContinue: { en: 'Yes, continue', es: 'Sí, continuar' },
  startOver: { en: 'Start over', es: 'Comenzar de nuevo' },
  countdown: {
    en: 'Starting over in',
    es: 'Comenzando de nuevo en',
  },
  seconds: { en: 'seconds', es: 'segundos' },
};

interface IdleModalProps {
  visible: boolean;
  language: Language;
  onContinue: () => void;
  onReset: () => void;
}

export function IdleModal({ visible, language, onContinue, onReset }: IdleModalProps) {
  const [countdown, setCountdown] = useState(MODAL_COUNTDOWN_SECONDS);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const t = (key: keyof typeof T) => T[key][language];

  useEffect(() => {
    if (!visible) {
      setCountdown(MODAL_COUNTDOWN_SECONDS);
      if (countRef.current) clearInterval(countRef.current);
      return;
    }

    setCountdown(MODAL_COUNTDOWN_SECONDS);
    countRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countRef.current) clearInterval(countRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countRef.current) clearInterval(countRef.current);
    };
  }, [visible]);

  // Auto-reset when countdown hits 0
  useEffect(() => {
    if (visible && countdown === 0) {
      onReset();
    }
  }, [countdown, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.emoji}>⏳</Text>
          <Text style={styles.heading}>{t('heading')}</Text>

          <View style={styles.buttons}>
            <Pressable
              onPress={onContinue}
              style={({ pressed }) => [styles.continueBtn, pressed && styles.continueBtnPressed]}
              accessibilityLabel={t('yesContinue')}
            >
              <Text style={styles.continueBtnText}>{t('yesContinue')}</Text>
            </Pressable>

            <Pressable
              onPress={onReset}
              style={({ pressed }) => [styles.resetBtn, pressed && styles.resetBtnPressed]}
              accessibilityLabel={t('startOver')}
            >
              <Text style={styles.resetBtnText}>{t('startOver')}</Text>
            </Pressable>
          </View>

          <Text style={styles.countdown}>
            {t('countdown')} {countdown} {t('seconds')}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

// ─── Idle Timeout Hook ────────────────────────────────────────────────────────

export function useIdleTimeout(
  isActive: boolean,
  onShowModal: () => void
) {
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = () => {
    lastActivityRef.current = Date.now();
  };

  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      resetTimer();
      return;
    }

    intervalRef.current = setInterval(() => {
      if (Date.now() - lastActivityRef.current > IDLE_SECONDS * 1000) {
        onShowModal();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  return { resetTimer };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xxl,
    padding: Spacing.xxl,
    alignItems: 'center',
    ...Shadow.card,
  },
  emoji: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  heading: {
    fontSize: Typography.heading2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: Typography.heading2 * 1.2,
    marginBottom: Spacing.lg,
  },
  buttons: {
    width: '100%',
  },
  continueBtn: {
    height: 60,
    marginBottom: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
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
  resetBtn: {
    height: 60,
    backgroundColor: 'transparent',
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnPressed: {
    backgroundColor: Colors.surfaceSecondary,
    transform: [{ scale: 0.97 }],
  },
  resetBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },
  countdown: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
