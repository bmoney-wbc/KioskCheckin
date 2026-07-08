import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import {
  loadQuestionnaire,
  QuestionnaireData,
  KioskQuestion,
  KioskMatch,
  submitQuestionnaire,
} from '@/services/kioskService';
import { composeSubjectiveText } from '@/services/composeText';
import { BodyDiagramQuestion } from '@/components/kiosk/questions/BodyDiagramQuestion';
import { MultiSelectQuestion } from '@/components/kiosk/questions/MultiSelectQuestion';
import { SingleSelectQuestion } from '@/components/kiosk/questions/SingleSelectQuestion';
import { ScaleQuestion } from '@/components/kiosk/questions/ScaleQuestion';
import { AskAnotherScreen } from '@/components/kiosk/AskAnotherScreen';
import { ReviewScreen } from '@/components/kiosk/ReviewScreen';
import { Language } from '@/app/index';
import { CLINIC_ID } from '@/constants/config';

export interface ComplaintAnswers {
  Region: string[];
  Quality: string[];
  Frequency: string;
  Severity: number | null;
  Increases: string[];
  Decreases: string[];
  Timing: string;
  SleepImpact: string;
  ActivityImpact: string;
}

export interface GeneralAnswers {
  Comparison: string;
  NewSymptoms: string;
  Medication: string[];
}

type Phase = 'complaint' | 'ask_another' | 'general' | 'review';

const MAX_COMPLAINTS = 3;

const emptyComplaintAnswers = (): ComplaintAnswers => ({
  Region: [],
  Quality: [],
  Frequency: '',
  Severity: null,
  Increases: [],
  Decreases: [],
  Timing: '',
  SleepImpact: '',
  ActivityImpact: '',
});

const emptyGeneralAnswers = (): GeneralAnswers => ({
  Comparison: '',
  NewSymptoms: '',
  Medication: [],
});

const T = {
  loading: { en: 'Loading questionnaire...', es: 'Cargando cuestionario...' },
  errorLoad: {
    en: 'Could not load questionnaire.\nPlease see the front desk.',
    es: 'No se pudo cargar el cuestionario.\nPor favor vaya a la recepción.',
  },
  questionOf: { en: 'Question', es: 'Pregunta' },
  of: { en: 'of', es: 'de' },
  areaConcern: { en: 'Concern', es: 'Molestia' },
  generalQuestions: { en: 'General Questions', es: 'Preguntas Generales' },
  back: { en: 'Back', es: 'Atrás' },
  next: { en: 'Next', es: 'Siguiente' },
  maxAreasToast: {
    en: 'Maximum 3 areas reached. Please continue.',
    es: 'Máximo 3 áreas alcanzadas. Por favor continúe.',
  },
};

interface QuestionnaireScreenProps {
  language: Language;
  onToggleLanguage: () => void;
  onBack: () => void;
  onComplete: () => void;
  onSubmitSuccess: () => void;
  onSubmitError: () => void;
  selectedMatch: KioskMatch;
}

export function QuestionnaireScreen({
  language,
  onToggleLanguage,
  onBack,
  onComplete,
  onSubmitSuccess,
  onSubmitError,
  selectedMatch,
}: QuestionnaireScreenProps) {
  const insets = useSafeAreaInsets();

  const [qData, setQData] = useState<QuestionnaireData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  const [complaints, setComplaints] = useState<{ complaintNum: number; answers: ComplaintAnswers }[]>([
    { complaintNum: 1, answers: emptyComplaintAnswers() },
  ]);
  const [currentComplaintIdx, setCurrentComplaintIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('complaint');
  const [generalAnswers, setGeneralAnswers] = useState<GeneralAnswers>(emptyGeneralAnswers());
  const [generalQuestionIdx, setGeneralQuestionIdx] = useState(0);
  const [newSymptomsToast, setNewSymptomsToast] = useState(false);

  // Edit-from-review mode: null = normal flow, 'complaint_N' or 'general'
  const [editFromReview, setEditFromReview] = useState<'complaint' | 'general' | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const t = useCallback((key: keyof typeof T) => T[key][language], [language]);

  useEffect(() => {
    let mounted = true;
    loadQuestionnaire().then(({ data, error }) => {
      if (!mounted) return;
      if (error || !data) { setLoadError(true); } else { setQData(data); }
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  const getCurrentComplaintAnswers = useCallback((): ComplaintAnswers => {
    return complaints[currentComplaintIdx]?.answers ?? emptyComplaintAnswers();
  }, [complaints, currentComplaintIdx]);

  const updateCurrentComplaintAnswer = useCallback(
    (key: keyof ComplaintAnswers, value: ComplaintAnswers[keyof ComplaintAnswers]) => {
      setComplaints(prev => {
        const updated = [...prev];
        updated[currentComplaintIdx] = {
          ...updated[currentComplaintIdx],
          answers: { ...updated[currentComplaintIdx].answers, [key]: value },
        };
        return updated;
      });
    },
    [currentComplaintIdx]
  );

  const isComplaintAnswerValid = useCallback(
    (question: KioskQuestion): boolean => {
      const answers = getCurrentComplaintAnswers();
      const key = question.question_key as keyof ComplaintAnswers;
      const val = answers[key];
      if (!question.is_required) return true;
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'number') return val !== null;
      return val !== '' && val !== null && val !== undefined;
    },
    [getCurrentComplaintAnswers]
  );

  const isGeneralAnswerValid = useCallback(
    (question: KioskQuestion): boolean => {
      const key = question.question_key as keyof GeneralAnswers;
      const val = generalAnswers[key];
      if (!question.is_required) return true;
      if (Array.isArray(val)) return val.length > 0;
      return val !== '' && val !== null && val !== undefined;
    },
    [generalAnswers]
  );

  const handleNext = useCallback(() => {
    if (!qData) return;
    if (phase === 'complaint') {
      const totalComplaintQs = qData.complaintQuestions.length;
      if (currentQuestionIdx < totalComplaintQs - 1) {
        setCurrentQuestionIdx(q => q + 1);
      } else {
        // Finished all complaint questions
        if (editFromReview === 'complaint') {
          // Return to review
          setEditFromReview(null);
          setPhase('review');
        } else if (complaints.length < MAX_COMPLAINTS) {
          setPhase('ask_another');
        } else {
          setPhase('general');
          setGeneralQuestionIdx(0);
        }
      }
    } else if (phase === 'general') {
      const totalGeneralQs = qData.generalQuestions.length;
      const currentGenQ = qData.generalQuestions[generalQuestionIdx];

      if (currentGenQ.question_key === 'NewSymptoms' && generalAnswers.NewSymptoms === 'yes') {
        if (complaints.length < MAX_COMPLAINTS) {
          const newComplaintNum = complaints.length + 1;
          setComplaints(prev => [
            ...prev,
            { complaintNum: newComplaintNum, answers: emptyComplaintAnswers() },
          ]);
          setCurrentComplaintIdx(complaints.length);
          setCurrentQuestionIdx(0);
          setPhase('complaint');
          return;
        } else {
          setNewSymptomsToast(true);
          if (toastTimer.current) clearTimeout(toastTimer.current);
          toastTimer.current = setTimeout(() => setNewSymptomsToast(false), 2500);
        }
      }

      if (editFromReview === 'general') {
        // Return to review after editing general
        if (generalQuestionIdx >= totalGeneralQs - 1) {
          setEditFromReview(null);
          setPhase('review');
          return;
        }
      }

      if (generalQuestionIdx < totalGeneralQs - 1) {
        setGeneralQuestionIdx(q => q + 1);
      } else {
        setPhase('review');
      }
    }
  }, [
    phase, qData, currentQuestionIdx, complaints, generalQuestionIdx,
    generalAnswers, editFromReview,
  ]);

  const handleBack = useCallback(() => {
    if (!qData) return;
    if (phase === 'review') {
      setPhase('general');
      setGeneralQuestionIdx(qData.generalQuestions.length - 1);
      return;
    }
    if (phase === 'general') {
      if (generalQuestionIdx > 0) { setGeneralQuestionIdx(q => q - 1); }
      else {
        setPhase('complaint');
        setCurrentComplaintIdx(complaints.length - 1);
        setCurrentQuestionIdx(qData.complaintQuestions.length - 1);
      }
      return;
    }
    if (phase === 'ask_another') {
      setPhase('complaint');
      setCurrentQuestionIdx(qData.complaintQuestions.length - 1);
      return;
    }
    if (phase === 'complaint') {
      if (currentQuestionIdx > 0) {
        setCurrentQuestionIdx(q => q - 1);
      } else if (currentComplaintIdx > 0) {
        const prevIdx = currentComplaintIdx - 1;
        setCurrentComplaintIdx(prevIdx);
        setCurrentQuestionIdx(qData.complaintQuestions.length - 1);
        setComplaints(prev => prev.slice(0, -1));
        setPhase('ask_another');
      } else {
        if (editFromReview) {
          setEditFromReview(null);
          setPhase('review');
        } else {
          onBack();
        }
      }
    }
  }, [
    phase, qData, currentQuestionIdx, currentComplaintIdx,
    complaints, generalQuestionIdx, editFromReview, onBack,
  ]);

  const handleAskAnotherYes = useCallback(() => {
    const newComplaintNum = complaints.length + 1;
    setComplaints(prev => [...prev, { complaintNum: newComplaintNum, answers: emptyComplaintAnswers() }]);
    setCurrentComplaintIdx(complaints.length);
    setCurrentQuestionIdx(0);
    setPhase('complaint');
  }, [complaints]);

  const handleAskAnotherNo = useCallback(() => {
    setPhase('general');
    setGeneralQuestionIdx(0);
  }, []);

  // Edit handlers from ReviewScreen
  const handleEditComplaint = useCallback((idx: number) => {
    setCurrentComplaintIdx(idx);
    setCurrentQuestionIdx(0);
    setEditFromReview('complaint');
    setPhase('complaint');
  }, []);

  const handleEditGeneral = useCallback(() => {
    setGeneralQuestionIdx(0);
    setEditFromReview('general');
    setPhase('general');
  }, []);

  // Submit handler passed to ReviewScreen
  const handleSubmit = useCallback(async () => {
    if (!qData) return { error: 'no_data' };

    const allQuestions = [...qData.complaintQuestions, ...qData.generalQuestions];
    const { composedTexts, generalComposedText } = composeSubjectiveText(
      selectedMatch.patient.first_name,
      complaints,
      generalAnswers,
      allQuestions,
      qData.optionsByQuestionId
    );

    return submitQuestionnaire({
      complaints: complaints.map(c => ({
        complaintNum: c.complaintNum,
        answers: c.answers as unknown as Record<string, unknown>,
      })),
      generalAnswers: generalAnswers as unknown as Record<string, unknown>,
      composedTexts,
      generalComposedText,
      questionnaireId: qData.questionnaire.id,
      ctPatientId: selectedMatch.patient.ct_patient_id,
      ctAppointmentId: selectedMatch.appointment.ct_appointment_id,
      appointmentRowId: selectedMatch.appointment.id,
      ctDoctorId: selectedMatch.appointment.ct_doctor_id,
      patientLanguage: language,
      patientId: selectedMatch.patient.id,
      storedLanguage: selectedMatch.patient.preferred_language,
      isWalkIn: selectedMatch.appointment.is_walk_in ?? false,
    });
  }, [qData, complaints, generalAnswers, selectedMatch, language]);

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </View>
    );
  }

  if (loadError || !qData) {
    return (
      <View style={styles.screen}>
        <View style={[styles.loadingCard, styles.errorCard]}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{t('errorLoad')}</Text>
        </View>
      </View>
    );
  }

  // ── Ask Another ───────────────────────────────────────────
  if (phase === 'ask_another') {
    return (
      <AskAnotherScreen
        language={language}
        onToggleLanguage={onToggleLanguage}
        onYes={handleAskAnotherYes}
        onNo={handleAskAnotherNo}
      />
    );
  }

  // ── Review ────────────────────────────────────────────────
  if (phase === 'review') {
    const allQuestions = [...qData.complaintQuestions, ...qData.generalQuestions];
    return (
      <ReviewScreen
        language={language}
        onToggleLanguage={onToggleLanguage}
        complaints={complaints}
        generalAnswers={generalAnswers}
        allQuestions={allQuestions}
        optionsByQuestionId={qData.optionsByQuestionId}
        onBack={handleBack}
        onEditComplaint={handleEditComplaint}
        onEditGeneral={handleEditGeneral}
        onSubmit={handleSubmit}
        onSubmitSuccess={onSubmitSuccess}
        onSubmitError={onSubmitError}
      />
    );
  }

  // ── Determine current question ─────────────────────────────
  const isGeneralPhase = phase === 'general';
  const currentQuestion = isGeneralPhase
    ? qData.generalQuestions[generalQuestionIdx]
    : qData.complaintQuestions[currentQuestionIdx];

  if (!currentQuestion) return null;

  const options = qData.optionsByQuestionId[currentQuestion.id] ?? [];
  const questionText =
    language === 'es' ? currentQuestion.question_text_es : currentQuestion.question_text_en;

  const totalComplaintQs = qData.complaintQuestions.length;
  const totalGeneralQs = qData.generalQuestions.length;
  const progressCurrent = isGeneralPhase ? generalQuestionIdx + 1 : currentQuestionIdx + 1;
  const progressTotal = isGeneralPhase ? totalGeneralQs : totalComplaintQs;
  const progressPct = Math.round((progressCurrent / progressTotal) * 100);

  const canNext = isGeneralPhase
    ? isGeneralAnswerValid(currentQuestion)
    : isComplaintAnswerValid(currentQuestion);

  const complaintAnswers = getCurrentComplaintAnswers();
  const key = currentQuestion.question_key as keyof ComplaintAnswers & keyof GeneralAnswers;

  // Body diagram renders as its own full-page layout (not inside the content card)
  const isBodyDiagram = currentQuestion.question_type === 'body_diagram';

  const renderAnswerArea = () => {
    if (isBodyDiagram) {
      return (
        <BodyDiagramQuestion
          options={options}
          selectedValues={complaintAnswers.Region}
          onChange={vals => updateCurrentComplaintAnswer('Region', vals)}
          language={language}
        />
      );
    }

    if (currentQuestion.question_type === 'multi_select') {
      const isGeneralKey = isGeneralPhase;
      const currentVal = isGeneralKey
        ? (generalAnswers[key as keyof GeneralAnswers] as string[])
        : (complaintAnswers[key as keyof ComplaintAnswers] as string[]);

      return (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.answerScroll}
          contentContainerStyle={styles.answerScrollContent}
        >
          <MultiSelectQuestion
            options={options}
            selectedValues={Array.isArray(currentVal) ? currentVal : []}
            onChange={vals => {
              if (isGeneralKey) {
                setGeneralAnswers(prev => ({ ...prev, [key]: vals }));
              } else {
                updateCurrentComplaintAnswer(key as keyof ComplaintAnswers, vals);
              }
            }}
            language={language}
            columns={options.length > 8 ? 3 : 2}
          />
        </ScrollView>
      );
    }

    if (currentQuestion.question_type === 'single_select') {
      const isGeneralKey = isGeneralPhase;
      const currentVal = isGeneralKey
        ? (generalAnswers[key as keyof GeneralAnswers] as string)
        : (complaintAnswers[key as keyof ComplaintAnswers] as string);

      return (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.answerScroll}
          contentContainerStyle={styles.answerScrollContent}
        >
          <SingleSelectQuestion
            options={options}
            selectedValue={typeof currentVal === 'string' ? currentVal : ''}
            onChange={val => {
              if (isGeneralKey) {
                setGeneralAnswers(prev => ({ ...prev, [key]: val }));
              } else {
                updateCurrentComplaintAnswer(key as keyof ComplaintAnswers, val);
              }
            }}
            language={language}
          />
        </ScrollView>
      );
    }

    if (currentQuestion.question_type === 'scale') {
      return (
        <ScaleQuestion
          selectedValue={complaintAnswers.Severity}
          onChange={val => updateCurrentComplaintAnswer('Severity', val)}
          language={language}
        />
      );
    }

    return null;
  };

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 0) }]}>
      <LanguageToggle language={language} onToggle={onToggleLanguage} />

      {/* Top progress header */}
      <View style={styles.header}>
        <View style={styles.progressLabels}>
          <View style={[styles.badge, isGeneralPhase && styles.badgeGeneral]}>
            <Text style={styles.badgeText}>
              {isGeneralPhase
                ? t('generalQuestions')
                : complaints.length > 1
                ? `${t('areaConcern')} ${currentComplaintIdx + 1} ${t('of')} ${complaints.length}`
                : `${t('areaConcern')} 1`}
            </Text>
          </View>
          <Text style={styles.progressCounter}>
            {t('questionOf')} {progressCurrent} / {progressTotal}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { flex: progressPct }]} />
        <View style={{ flex: 100 - progressPct, height: '100%' }} />
        </View>
      </View>

      {/* Toast */}
      {newSymptomsToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{t('maxAreasToast')}</Text>
        </View>
      )}

      {/* Main content — body diagram gets a special full-page layout */}
      {isBodyDiagram ? (
        <View style={styles.bodyDiagramOuter}>
          {/* Horizontal row: left panel (title) + right panel (figure) */}
          <View style={styles.bodyDiagramPage}>
            {/* Question title + subtitle */}
            <View style={styles.bodyDiagramHeader}>
              <Text style={styles.bodyDiagramTitle}>{questionText}</Text>
              <Text style={styles.bodyDiagramSubtitle}>
                {language === 'es' ? 'Seleccione hasta 3 áreas' : 'Select up to 3 areas'}
              </Text>
            </View>

            {/* Figure takes all remaining horizontal space */}
            <View style={styles.bodyDiagramFigureArea}>
              {renderAnswerArea()}
            </View>
          </View>

          {/* Nav row below the diagram */}
          <View style={styles.navRow}>
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
              accessibilityLabel={t('back')}
            >
              <Text style={styles.backBtnText}>{t('back')}</Text>
            </Pressable>
            <Pressable
              onPress={handleNext}
              disabled={!canNext}
              style={({ pressed }) => [
                styles.nextBtn,
                !canNext && styles.nextBtnDisabled,
                pressed && canNext && styles.nextBtnPressed,
              ]}
              accessibilityLabel={t('next')}
            >
              <Text style={[styles.nextBtnText, !canNext && styles.nextBtnTextDisabled]}>
                {t('next')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.contentCard}>
          <Text style={styles.questionText}>{questionText}</Text>

          <View style={styles.answerArea}>{renderAnswerArea()}</View>

          <View style={styles.navRow}>
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
              accessibilityLabel={t('back')}
            >
              <Text style={styles.backBtnText}>{t('back')}</Text>
            </Pressable>

            <Pressable
              onPress={handleNext}
              disabled={!canNext}
              style={({ pressed }) => [
                styles.nextBtn,
                !canNext && styles.nextBtnDisabled,
                pressed && canNext && styles.nextBtnPressed,
              ]}
              accessibilityLabel={t('next')}
            >
              <Text style={[styles.nextBtnText, !canNext && styles.nextBtnTextDisabled]}>
                {t('next')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  loadingCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {},
  errorEmoji: { fontSize: 64, marginBottom: Spacing.lg },
  loadingText: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xl,
  },
  errorText: {
    fontSize: Typography.heading2,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.heading2 * 1.4,
  },
  header: {
    paddingTop: Spacing.xxl + Spacing.md,
    paddingBottom: Spacing.md,
  },
  progressLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  badge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  badgeGeneral: { backgroundColor: Colors.successLight },
  badgeText: {
    fontSize: Typography.caption,
    fontWeight: Typography.semibold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressCounter: {
    fontSize: Typography.caption,
    fontWeight: Typography.medium,
    color: Colors.textMuted,
  },
  progressTrack: {
    height: 6,
    flexDirection: 'row',
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  toast: {
    alignSelf: 'center',
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    zIndex: 50,
  },
  toastText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.body,
    fontWeight: Typography.medium,
  },
  // Body diagram full-page layout
  bodyDiagramOuter: {
    flex: 1,
    flexDirection: 'column',
  },
  bodyDiagramPage: {
    flex: 1,
    flexDirection: 'row',
  },
  bodyDiagramHeader: {
    justifyContent: 'center',
    paddingRight: Spacing.xl,
    width: 220,
  },
  bodyDiagramTitle: {
    fontSize: Typography.heading2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: Typography.heading2 * 1.3,
    marginBottom: Spacing.sm,
  },
  bodyDiagramSubtitle: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    lineHeight: Typography.body * 1.4,
    marginBottom: Spacing.xl,
  },
  bodyDiagramFigureArea: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xxl,
    padding: Spacing.md,
    ...Shadow.card,
  },
  contentCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    ...Shadow.card,
  },
  questionText: {
    fontSize: Typography.heading2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: Typography.heading2 * 1.3,
    marginBottom: Spacing.md,
  },
  answerArea: { flex: 1 },
  answerScroll: { flex: 1 },
  answerScrollContent: { paddingBottom: Spacing.md },
  navRow: {
    flexDirection: 'row',
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  backBtn: {
    flex: 1,
    marginRight: Spacing.md,
    height: 60,
    backgroundColor: 'transparent',
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    backgroundColor: Colors.surfaceSecondary,
    transform: [{ scale: 0.97 }],
  },
  backBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },
  nextBtn: {
    flex: 2,
    height: 60,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.button,
  },
  nextBtnDisabled: {
    backgroundColor: Colors.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  nextBtnPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.97 }],
  },
  nextBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textOnPrimary,
  },
  nextBtnTextDisabled: {
    color: Colors.disabledText,
  },
});
