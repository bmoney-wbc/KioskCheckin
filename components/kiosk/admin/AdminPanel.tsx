import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { KioskSettings } from '@/services/kioskService';
import { ClinicSettingsSection } from './ClinicSettingsSection';
import { CaseTypeMappingSection } from './CaseTypeMappingSection';

type AdminSection = 'clinic' | 'casetype' | 'questionnaire_editor';

const NAV_ITEMS: { id: AdminSection; label: string; disabled?: boolean }[] = [
  { id: 'clinic', label: 'Clinic Settings' },
  { id: 'casetype', label: 'Case Type Mapping' },
  { id: 'questionnaire_editor', label: 'Questionnaire Editor', disabled: true },
];

interface AdminPanelProps {
  visible: boolean;
  settings: KioskSettings;
  onSettingsSaved: (settings: KioskSettings) => void;
  onExit: () => void;
}

export function AdminPanel({ visible, settings, onSettingsSaved, onExit }: AdminPanelProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>('clinic');
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleExit = useCallback(() => {
    setShowExitConfirm(true);
  }, []);

  const handleConfirmExit = useCallback(() => {
    setShowExitConfirm(false);
    setActiveSection('clinic');
    onExit();
  }, [onExit]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={false}
    >
      <SafeAreaView style={styles.container}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarLogo}>⚙</Text>
            <Text style={styles.sidebarTitle}>Kiosk Admin</Text>
          </View>

          <View style={styles.navList}>
            {NAV_ITEMS.map(item => (
              <Pressable
                key={item.id}
                onPress={() => { if (!item.disabled) setActiveSection(item.id); }}
                style={[
                  styles.navItem,
                  activeSection === item.id && styles.navItemActive,
                  item.disabled && styles.navItemDisabled,
                ]}
              >
                <Text style={[
                  styles.navItemText,
                  activeSection === item.id && styles.navItemTextActive,
                  item.disabled && styles.navItemTextDisabled,
                ]}>
                  {item.label}
                </Text>
                {item.disabled && (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Soon</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {/* Exit Admin button */}
          <Pressable
            onPress={handleExit}
            style={({ pressed }) => [styles.exitBtn, pressed && styles.exitBtnPressed]}
          >
            <Text style={styles.exitBtnText}>Exit Admin</Text>
          </Pressable>
        </View>

        {/* Main content */}
        <View style={styles.main}>
          {activeSection === 'clinic' && (
            <ClinicSettingsSection
              settings={settings}
              onSettingsSaved={onSettingsSaved}
            />
          )}
          {activeSection === 'casetype' && (
            <CaseTypeMappingSection />
          )}
          {activeSection === 'questionnaire_editor' && (
            <View style={styles.comingSoonContent}>
              <Text style={styles.comingSoonEmoji}>🚧</Text>
              <Text style={styles.comingSoonTitle}>Coming Soon</Text>
              <Text style={styles.comingSoonDesc}>
                The questionnaire editor will be available in a future update.
              </Text>
            </View>
          )}
        </View>

        {/* Exit confirmation overlay */}
        {showExitConfirm && (
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Return to kiosk mode?</Text>
              <Text style={styles.confirmSubtext}>
                Any unsaved changes will be lost.
              </Text>
              <View style={styles.confirmBtns}>
                <Pressable
                  onPress={() => setShowExitConfirm(false)}
                  style={({ pressed }) => [styles.confirmNoBtn, pressed && styles.confirmNoBtnPressed]}
                >
                  <Text style={styles.confirmNoBtnText}>No, stay</Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirmExit}
                  style={({ pressed }) => [styles.confirmYesBtn, pressed && styles.confirmYesBtnPressed]}
                >
                  <Text style={styles.confirmYesBtnText}>Yes, exit</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const SIDEBAR_WIDTH = 220;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.background,
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#1E293B',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    justifyContent: 'space-between',
  },
  sidebarHeader: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: Spacing.md,
  },
  sidebarLogo: {
    fontSize: 28,
    marginBottom: Spacing.xs,
  },
  sidebarTitle: {
    fontSize: Typography.heading3,
    fontWeight: Typography.bold,
    color: Colors.textOnDark,
    letterSpacing: 0.5,
  },
  navList: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: 'rgba(37,99,235,0.25)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  navItemDisabled: {
    opacity: 0.45,
  },
  navItemText: {
    flex: 1,
    fontSize: Typography.body,
    fontWeight: Typography.medium,
    color: 'rgba(255,255,255,0.7)',
  },
  navItemTextActive: {
    color: Colors.textOnDark,
    fontWeight: Typography.semibold,
  },
  navItemTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },
  comingSoonBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  comingSoonText: {
    fontSize: Typography.small,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: Typography.medium,
  },
  exitBtn: {
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(220,38,38,0.4)',
    backgroundColor: 'rgba(220,38,38,0.1)',
    alignItems: 'center',
  },
  exitBtnPressed: { opacity: 0.7 },
  exitBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: '#FCA5A5',
  },
  main: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  comingSoonContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  comingSoonEmoji: { fontSize: 64, marginBottom: Spacing.lg },
  comingSoonTitle: {
    fontSize: Typography.heading2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  comingSoonDesc: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.body * 1.5,
    maxWidth: 400,
  },
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  confirmCard: {
    width: 380,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xxl,
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: Typography.heading2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  confirmSubtext: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: Typography.body * 1.4,
  },
  confirmBtns: {
    flexDirection: 'row',
    width: '100%',
  },
  confirmNoBtn: {
    flex: 1,
    height: 56,
    marginRight: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmNoBtnPressed: { backgroundColor: Colors.surfaceSecondary },
  confirmNoBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },
  confirmYesBtn: {
    flex: 1,
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmYesBtnPressed: { backgroundColor: Colors.primaryDark },
  confirmYesBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textOnPrimary,
  },
});
