import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/theme';
import {
  KioskMatch,
  KioskPatient,
  LookupResult,
  PatientGroup,
  KioskSettings,
  loadKioskSettings,
  createWalkInAppointment,
} from '@/services/kioskService';
import { DOBScreen } from '@/components/kiosk/DOBScreen';
import { DisambiguationScreen } from '@/components/kiosk/DisambiguationScreen';
import { CasePickerScreen } from '@/components/kiosk/CasePickerScreen';
import { WalkInScreen } from '@/components/kiosk/WalkInScreen';
import { GreetingScreen } from '@/components/kiosk/GreetingScreen';
import { QuestionnaireScreen } from '@/components/kiosk/QuestionnaireScreen';
import { CashArrivalScreen } from '@/components/kiosk/CashArrivalScreen';
import { ThankYouScreen } from '@/components/kiosk/ThankYouScreen';
import { IdleModal, useIdleTimeout } from '@/components/kiosk/IdleModal';
import { AdminPanel } from '@/components/kiosk/admin/AdminPanel';
import { CLINIC_ID } from '@/constants/config';

export type Screen =
  | 'dob'
  | 'disambiguation'
  | 'casepicker'
  | 'walkin'
  | 'greeting'
  | 'questionnaire'
  | 'casharrival'
  | 'thankyou';

export type Language = 'en' | 'es';

export default function KioskApp() {
  const [settings, setSettings] = useState<KioskSettings>({
    clinic: CLINIC_ID,
    clinic_name: 'Whole Body Chiropractic',
    admin_pin: '1234',
    idle_timeout_seconds: 60,
    thankyou_duration_seconds: 5,
    default_language: 'en',
  });

  const [language, setLanguage] = useState<Language>('en');
  const [currentScreen, setCurrentScreen] = useState<Screen>('dob');

  // Patient resolution state
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [pendingGroups, setPendingGroups] = useState<PatientGroup[]>([]);
  /** Cases to show in the case picker (could come from disambiguation or walk-in) */
  const [casePickerMatches, setCasePickerMatches] = useState<KioskMatch[]>([]);
  /** For walk-in case picker: all patients in group (no pre-filtered appointments) */
  const [walkInCases, setWalkInCases] = useState<KioskPatient[]>([]);
  const [isWalkInCasePicker, setIsWalkInCasePicker] = useState(false);
  /** Walk-in selected group (to create appointment after case pick) */
  const [walkInGroup, setWalkInGroup] = useState<PatientGroup | null>(null);

  const [selectedMatch, setSelectedMatch] = useState<KioskMatch | null>(null);
  const [showIdleModal, setShowIdleModal] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadKioskSettings(CLINIC_ID).then(s => {
      setSettings(s);
      setLanguage(s.default_language as Language);
    });
  }, []);

  // ── Idle timeout ──────────────────────────────────────────────────────────
  const { resetTimer } = useIdleTimeout(
    currentScreen !== 'dob' && !showAdmin,
    () => {
      if (currentScreen !== 'dob' && !showAdmin) setShowIdleModal(true);
    }
  );

  const resetToDOB = useCallback(() => {
    setShowIdleModal(false);
    setCurrentScreen('dob');
    setLookupResult(null);
    setPendingGroups([]);
    setCasePickerMatches([]);
    setWalkInCases([]);
    setIsWalkInCasePicker(false);
    setWalkInGroup(null);
    setSelectedMatch(null);
    setLanguage(settings.default_language as Language);
    resetTimer();
  }, [resetTimer, settings]);

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => (prev === 'en' ? 'es' : 'en'));
    resetTimer();
  }, [resetTimer]);

  // ── DOB Lookup Result → Routing ───────────────────────────────────────────

  /**
   * Resolve a single PatientGroup after disambiguation (or direct match).
   * Decides: greeting / case picker / walk-in
   */
  const resolveGroup = useCallback(
    (group: PatientGroup) => {
      resetTimer();

      // Auto-switch language to patient's preferred language.
      // Use the default case's language if available, otherwise the first case.
      const defaultCase = group.cases.find(c => c.is_default_case) ?? group.cases[0];
      if (defaultCase) {
        const lang = defaultCase.preferred_language;
        if (lang === 'en' || lang === 'es') setLanguage(lang as Language);
      }

      if (!group.hasAppointments) {
        // No appointments → walk-in screen
        setWalkInGroup(group);
        setCurrentScreen('walkin');
        return;
      }

      if (group.casesWithAppointments.length === 1) {
        // Single active case with appointment → greeting
        setSelectedMatch(group.casesWithAppointments[0]);
        setCurrentScreen('greeting');
        return;
      }

      // Multiple cases with appointments → case picker
      setCasePickerMatches(group.casesWithAppointments);
      setIsWalkInCasePicker(false);
      setCurrentScreen('casepicker');
    },
    [resetTimer]
  );

  const handleLookupSuccess = useCallback(
    (result: LookupResult) => {
      resetTimer();
      setLookupResult(result);

      const groups = result.groups;

      if (groups.length === 0) return; // Handled in DOBScreen

      if (groups.length === 1) {
        // Single name group — resolve directly
        resolveGroup(groups[0]);
      } else {
        // Multiple name groups → disambiguation
        setPendingGroups(groups);
        setCurrentScreen('disambiguation');
      }
    },
    [resetTimer, resolveGroup]
  );

  const handleDisambiguationSelect = useCallback(
    (group: PatientGroup) => {
      resolveGroup(group);
    },
    [resolveGroup]
  );

  // ── Case Picker ───────────────────────────────────────────────────────────

  const handleCasePickerSelect = useCallback(
    async (match: KioskMatch) => {
      resetTimer();
      // Set language from the selected patient's preference
      const lang = match.patient.preferred_language;
      if (lang === 'en' || lang === 'es') setLanguage(lang as Language);
      if (isWalkInCasePicker) {
        // Create walk-in appointment for selected case
        const { appointment, error } = await createWalkInAppointment(match.patient);
        if (error || !appointment) {
          resetToDOB();
          return;
        }
        setSelectedMatch({ ...match, appointment });
        setCurrentScreen('greeting');
      } else {
        setSelectedMatch(match);
        setCurrentScreen('greeting');
      }
    },
    [resetTimer, isWalkInCasePicker, resetToDOB]
  );

  // ── Walk-In ───────────────────────────────────────────────────────────────

  const handleWalkInConfirm = useCallback(
    async (match: KioskMatch, needsCasePicker: boolean, cases: KioskPatient[]) => {
      resetTimer();
      if (needsCasePicker && walkInGroup) {
        // Language will be set after case picker selection
        // Multiple cases — show case picker in walk-in mode
        // Build KioskMatch array from patients (no real appointments yet — will create after pick)
        const pseudoMatches: KioskMatch[] = cases.map(p => ({
          patient: p,
          appointment: null as unknown as KioskMatch['appointment'],
          behavior: null,
        }));
        setCasePickerMatches(pseudoMatches);
        setIsWalkInCasePicker(true);
        setCurrentScreen('casepicker');
        return;
      }
      // Single case — appointment already created in WalkInScreen
      setSelectedMatch(match);
      setCurrentScreen('greeting');
    },
    [resetTimer, walkInGroup]
  );

  // ── Greeting ──────────────────────────────────────────────────────────────

  const handleGreetingContinue = useCallback(
    (behavior: 'questionnaire' | 'arrival_only' | null) => {
      resetTimer();
      if (behavior === 'arrival_only') {
        setCurrentScreen('casharrival');
      } else if (behavior === 'questionnaire') {
        setCurrentScreen('questionnaire');
      }
    },
    [resetTimer]
  );

  // ── Idle / Admin ──────────────────────────────────────────────────────────

  const handleIdleContinue = useCallback(() => {
    setShowIdleModal(false);
    resetTimer();
  }, [resetTimer]);

  const handleTouch = useCallback(() => {
    if (currentScreen !== 'dob') resetTimer();
  }, [currentScreen, resetTimer]);

  const handleAdminAccess = useCallback(() => {
    setShowAdmin(true);
  }, []);

  const handleAdminExit = useCallback(() => {
    setShowAdmin(false);
  }, []);

  const handleSettingsSaved = useCallback((newSettings: KioskSettings) => {
    setSettings(newSettings);
  }, []);

  return (
    <View style={styles.container} onTouchStart={handleTouch}>
      <StatusBar style="dark" hidden />

      {currentScreen === 'dob' && (
        <DOBScreen
          language={language}
          onToggleLanguage={toggleLanguage}
          onSuccess={handleLookupSuccess}
          adminPin={settings.admin_pin}
          onAdminAccess={handleAdminAccess}
        />
      )}

      {currentScreen === 'disambiguation' && (
        <DisambiguationScreen
          language={language}
          onToggleLanguage={toggleLanguage}
          groups={pendingGroups}
          onSelect={handleDisambiguationSelect}
          onNoneOfThese={resetToDOB}
        />
      )}

      {currentScreen === 'casepicker' && (
        <CasePickerScreen
          language={language}
          onToggleLanguage={toggleLanguage}
          cases={casePickerMatches}
          onSelect={handleCasePickerSelect}
          onNotMe={resetToDOB}
        />
      )}

      {currentScreen === 'walkin' && walkInGroup !== null && (
        <WalkInScreen
          language={language}
          onToggleLanguage={toggleLanguage}
          cases={walkInGroup.cases}
          onConfirm={handleWalkInConfirm}
          onBack={resetToDOB}
        />
      )}

      {currentScreen === 'greeting' && selectedMatch !== null && (
        <GreetingScreen
          language={language}
          onToggleLanguage={toggleLanguage}
          match={selectedMatch}
          onNotMe={resetToDOB}
          onContinue={handleGreetingContinue}
          onAutoReturn={resetToDOB}
        />
      )}

      {currentScreen === 'questionnaire' && selectedMatch !== null && (
        <QuestionnaireScreen
          language={language}
          onToggleLanguage={toggleLanguage}
          onBack={() => setCurrentScreen('greeting')}
          onComplete={resetToDOB}
          onSubmitSuccess={() => setCurrentScreen('thankyou')}
          onSubmitError={resetToDOB}
          selectedMatch={selectedMatch}
        />
      )}

      {currentScreen === 'casharrival' && selectedMatch !== null && (
        <CashArrivalScreen
          language={language}
          onToggleLanguage={toggleLanguage}
          match={selectedMatch}
          onComplete={resetToDOB}
        />
      )}

      {currentScreen === 'thankyou' && selectedMatch !== null && (
        <ThankYouScreen
          language={language}
          onToggleLanguage={toggleLanguage}
          firstName={selectedMatch.patient.first_name}
          onComplete={resetToDOB}
        />
      )}

      <IdleModal
        visible={showIdleModal}
        language={language}
        onContinue={handleIdleContinue}
        onReset={resetToDOB}
      />

      <AdminPanel
        visible={showAdmin}
        settings={settings}
        onSettingsSaved={handleSettingsSaved}
        onExit={handleAdminExit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
