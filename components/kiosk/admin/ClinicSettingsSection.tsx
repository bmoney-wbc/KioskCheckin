import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { KioskSettings, saveKioskSettings } from '@/services/kioskService';

interface ClinicSettingsSectionProps {
  settings: KioskSettings;
  onSettingsSaved: (settings: KioskSettings) => void;
}

export function ClinicSettingsSection({ settings, onSettingsSaved }: ClinicSettingsSectionProps) {
  const [clinicName, setClinicName] = useState(settings.clinic_name);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [idleTimeout, setIdleTimeout] = useState(String(settings.idle_timeout_seconds));
  const [thankyouDuration, setThankyouDuration] = useState(String(settings.thankyou_duration_seconds));
  const [defaultLang, setDefaultLang] = useState(settings.default_language);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');

  const showStatus = useCallback((msg: string, type: 'success' | 'error') => {
    setStatusMsg(msg);
    setStatusType(type);
    setTimeout(() => { setStatusMsg(''); setStatusType(''); }, 3000);
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;

    // Validate PIN if changing
    if (newPin !== '' || confirmPin !== '') {
      if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
        showStatus('PIN must be exactly 4 digits.', 'error');
        return;
      }
      if (newPin !== confirmPin) {
        showStatus('PINs do not match.', 'error');
        return;
      }
    }

    const idleVal = parseInt(idleTimeout, 10);
    const thankyouVal = parseInt(thankyouDuration, 10);
    if (isNaN(idleVal) || idleVal < 10) {
      showStatus('Idle timeout must be at least 10 seconds.', 'error');
      return;
    }
    if (isNaN(thankyouVal) || thankyouVal < 1) {
      showStatus('Thank you duration must be at least 1 second.', 'error');
      return;
    }

    setSaving(true);
    const updatedSettings: KioskSettings = {
      ...settings,
      clinic_name: clinicName.trim() || settings.clinic_name,
      admin_pin: newPin.length === 4 ? newPin : settings.admin_pin,
      idle_timeout_seconds: idleVal,
      thankyou_duration_seconds: thankyouVal,
      default_language: defaultLang,
    };

    const { error } = await saveKioskSettings(updatedSettings);
    setSaving(false);

    if (error) {
      showStatus('Failed to save settings. Please try again.', 'error');
    } else {
      setNewPin('');
      setConfirmPin('');
      onSettingsSaved(updatedSettings);
      showStatus('Settings saved successfully.', 'success');
    }
  }, [saving, newPin, confirmPin, clinicName, idleTimeout, thankyouDuration, defaultLang, settings, onSettingsSaved, showStatus]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Clinic Settings</Text>

        {/* Clinic Configuration */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>CLINIC CONFIGURATION</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Clinic ID</Text>
            <View style={styles.readOnlyInput}>
              <Text style={styles.readOnlyText}>{settings.clinic}</Text>
            </View>
            <Text style={styles.hint}>Read-only — set at deployment</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Clinic Name</Text>
            <TextInput
              style={styles.input}
              value={clinicName}
              onChangeText={setClinicName}
              placeholder="e.g. Whole Body Chiropractic"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        {/* Admin PIN */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>ADMIN PIN</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Current PIN</Text>
            <View style={styles.readOnlyInput}>
              <Text style={styles.readOnlyText}>{'•'.repeat(settings.admin_pin.length)}</Text>
            </View>
          </View>

          <View style={styles.twoCol}>
            <View style={[styles.field, styles.flex]}>
              <Text style={styles.label}>New PIN (4 digits)</Text>
              <TextInput
                style={styles.input}
                value={newPin}
                onChangeText={t => { if (/^\d{0,4}$/.test(t)) setNewPin(t); }}
                placeholder="••••"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
            <View style={styles.colGap} />
            <View style={[styles.field, styles.flex]}>
              <Text style={styles.label}>Confirm PIN</Text>
              <TextInput
                style={styles.input}
                value={confirmPin}
                onChangeText={t => { if (/^\d{0,4}$/.test(t)) setConfirmPin(t); }}
                placeholder="••••"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>
          <Text style={styles.hint}>Leave blank to keep the current PIN</Text>
        </View>

        {/* Kiosk Settings */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>KIOSK SETTINGS</Text>

          <View style={styles.twoCol}>
            <View style={[styles.field, styles.flex]}>
              <Text style={styles.label}>Idle Timeout (seconds)</Text>
              <TextInput
                style={styles.input}
                value={idleTimeout}
                onChangeText={setIdleTimeout}
                keyboardType="number-pad"
                placeholder="60"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.colGap} />
            <View style={[styles.field, styles.flex]}>
              <Text style={styles.label}>Thank You Duration (seconds)</Text>
              <TextInput
                style={styles.input}
                value={thankyouDuration}
                onChangeText={setThankyouDuration}
                keyboardType="number-pad"
                placeholder="5"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Default Language</Text>
            <View style={styles.langRow}>
              {(['en', 'es'] as const).map(lang => (
                <Pressable
                  key={lang}
                  onPress={() => setDefaultLang(lang)}
                  style={[styles.langBtn, defaultLang === lang && styles.langBtnSelected]}
                >
                  <Text style={[styles.langBtnText, defaultLang === lang && styles.langBtnTextSelected]}>
                    {lang === 'en' ? 'English' : 'Español'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Status message */}
        {statusMsg !== '' && (
          <View style={[styles.statusBanner, statusType === 'error' ? styles.statusError : styles.statusSuccess]}>
            <Text style={[styles.statusText, statusType === 'error' ? styles.statusErrorText : styles.statusSuccessText]}>
              {statusMsg}
            </Text>
          </View>
        )}

        {/* Save button */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [styles.saveBtn, saving && styles.saveBtnLoading, pressed && !saving && styles.saveBtnPressed]}
        >
          {saving ? (
            <ActivityIndicator color={Colors.textOnPrimary} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  sectionTitle: {
    fontSize: Typography.heading2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  group: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  groupTitle: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: Spacing.md,
  },
  field: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.caption,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceSecondary,
  },
  readOnlyInput: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    backgroundColor: Colors.borderLight,
  },
  readOnlyText: {
    fontSize: Typography.body,
    color: Colors.textMuted,
    fontWeight: Typography.medium,
  },
  hint: {
    fontSize: Typography.small,
    color: Colors.textMuted,
    marginTop: 3,
  },
  twoCol: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  colGap: { width: Spacing.md },
  langRow: {
    flexDirection: 'row',
  },
  langBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    backgroundColor: Colors.surfaceSecondary,
  },
  langBtnSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  langBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
  },
  langBtnTextSelected: {
    color: Colors.primaryDark,
    fontWeight: Typography.bold,
  },
  statusBanner: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  statusError: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error,
  },
  statusSuccess: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },
  statusText: {
    fontSize: Typography.body,
    fontWeight: Typography.medium,
    textAlign: 'center',
  },
  statusErrorText: { color: Colors.error },
  statusSuccessText: { color: Colors.success },
  saveBtn: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnLoading: { backgroundColor: Colors.primaryDark },
  saveBtnPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  saveBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textOnPrimary,
  },
});
