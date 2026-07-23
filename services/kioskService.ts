import { getSupabaseClient } from '@/template';
import { CLINIC_ID, BRIDGE_URL } from '@/constants/config';

/**
 * Calls the on-prem bridge directly over the clinic LAN. Used for anything that touches
 * patient identity or appointment data — never routed through Supabase (see kiosk handoff
 * doc: no patient roster or appointment data should be synced to or stored in Supabase).
 */
async function callBridge<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${BRIDGE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`bridge_error_${response.status}`);
  }
  return response.json();
}

export interface KioskPatient {
  id: string;
  clinic: string;
  ct_patient_id: number;
  first_name: string;
  last_name: string;
  birth_date: string;
  case_type: string | null;
  preferred_language: string;
  group_id: number | null;
  is_default_case: boolean;
  is_active: boolean;
}

export interface KioskAppointment {
  id: string;
  ct_appointment_id: number;
  ct_patient_id: number;
  ct_doctor_id: number;
  schedule_date_time: string;
  purpose_of_visit: string | null;
  status: number;
  is_walk_in: boolean;
}

export interface KioskMatch {
  patient: KioskPatient;
  appointment: KioskAppointment;
  behavior: 'questionnaire' | 'arrival_only' | null;
}

/**
 * Result of the DOB lookup — richer than before to support multi-case and walk-in flows.
 */
export interface LookupResult {
  /**
   * Groups of patients keyed by display name (first+last).
   * Each group has all matching patients (cases) and their appointments.
   * Used to determine which screen to show after DOB entry.
   */
  groups: PatientGroup[];
  error: string | null;
}

export interface PatientGroup {
  /** Display name (first + last) — used for disambiguation */
  firstName: string;
  lastName: string;
  /** All patient records in this group (one per case) */
  cases: KioskPatient[];
  /** Cases that have a today appointment (not yet arrived) */
  casesWithAppointments: KioskMatch[];
  /** True if ANY case in this group has a today appointment */
  hasAppointments: boolean;
}

export interface KioskQuestion {
  id: string;
  questionnaire_id: string;
  question_key: string;
  question_text_en: string;
  question_text_es: string;
  question_type: 'body_diagram' | 'multi_select' | 'single_select' | 'scale';
  is_required: boolean;
  sort_order: number;
}

export interface KioskQuestionOption {
  id: string;
  question_id: string;
  value: string;
  label_en: string;
  label_es: string;
  sort_order: number;
}

export interface KioskQuestionnaire {
  id: string;
  name: string;
  ct_page_id: number | null;
  output_template_en: string;
  output_template_no_symptoms_en: string;
  is_active: boolean;
  sort_order: number;
}

export interface QuestionnaireData {
  questionnaire: KioskQuestionnaire;
  complaintQuestions: KioskQuestion[];
  generalQuestions: KioskQuestion[];
  optionsByQuestionId: Record<string, KioskQuestionOption[]>;
}

export interface SubmitQuestionnaireParams {
  complaints: { complaintNum: number; answers: Record<string, unknown> }[];
  generalAnswers: Record<string, unknown>;
  composedTexts: string[];
  generalComposedText: string;
  questionnaireId: string;
  ctPatientId: number;
  ctAppointmentId: number;
  appointmentRowId: string;
  ctDoctorId: number;
  patientLanguage: string;
  patientId: string;
  storedLanguage: string;
  isWalkIn?: boolean;
}

export interface SubmitArrivalOnlyParams {
  ctPatientId: number;
  ctAppointmentId: number;
  appointmentRowId: string;
  ctDoctorId: number;
  patientLanguage: string;
  patientId: string;
  storedLanguage: string;
  isWalkIn?: boolean;
}

export interface KioskSettings {
  clinic: string;
  clinic_name: string;
  admin_pin: string;
  idle_timeout_seconds: number;
  thankyou_duration_seconds: number;
  default_language: string;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function loadKioskSettings(clinic: string): Promise<KioskSettings> {
  const defaults: KioskSettings = {
    clinic,
    clinic_name: 'Whole Body Chiropractic',
    admin_pin: '1234',
    idle_timeout_seconds: 60,
    thankyou_duration_seconds: 5,
    default_language: 'en',
  };
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('kiosk_settings')
      .select('*')
      .eq('clinic', clinic)
      .limit(1)
      .maybeSingle();
    if (error || !data) return defaults;
    return { ...defaults, ...data };
  } catch {
    return defaults;
  }
}

export async function saveKioskSettings(
  settings: Partial<KioskSettings> & { clinic: string }
): Promise<{ error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('kiosk_settings')
      .upsert({ ...settings, updated_at: new Date().toISOString() }, { onConflict: 'clinic' });
    if (error) throw error;
    return { error: null };
  } catch {
    return { error: 'save_error' };
  }
}

// ─── Questionnaire Loader ─────────────────────────────────────────────────────

export async function loadQuestionnaire(questionnaireId?: string): Promise<{
  data: QuestionnaireData | null;
  error: string | null;
}> {
  try {
    const supabase = getSupabaseClient();

    let qQuery = supabase
      .from('kiosk_questionnaires')
      .select('*')
      .eq('is_active', true)
      .limit(1);

    if (questionnaireId) {
      qQuery = qQuery.eq('id', questionnaireId);
    } else {
      qQuery = qQuery.eq('name', 'Daily Subjective');
    }

    const { data: questionnaires, error: qError } = await qQuery;
    if (qError) throw qError;
    if (!questionnaires || questionnaires.length === 0) {
      return { data: null, error: 'questionnaire_not_found' };
    }
    const questionnaire: KioskQuestionnaire = questionnaires[0];

    const { data: questions, error: qqError } = await supabase
      .from('kiosk_questions')
      .select('*')
      .eq('questionnaire_id', questionnaire.id)
      .order('sort_order', { ascending: true });

    if (qqError) throw qqError;
    if (!questions || questions.length === 0) {
      return { data: null, error: 'no_questions' };
    }

    const questionIds = questions.map((q: KioskQuestion) => q.id);
    const { data: options, error: oError } = await supabase
      .from('kiosk_question_options')
      .select('*')
      .in('question_id', questionIds)
      .order('sort_order', { ascending: true });

    if (oError) throw oError;

    const optionsByQuestionId: Record<string, KioskQuestionOption[]> = {};
    (options || []).forEach((opt: KioskQuestionOption) => {
      if (!optionsByQuestionId[opt.question_id]) {
        optionsByQuestionId[opt.question_id] = [];
      }
      optionsByQuestionId[opt.question_id].push(opt);
    });

    const complaintQuestions = questions.filter((q: KioskQuestion) => q.sort_order <= 9);
    const generalQuestions = questions.filter((q: KioskQuestion) => q.sort_order >= 10);

    return {
      data: { questionnaire, complaintQuestions, generalQuestions, optionsByQuestionId },
      error: null,
    };
  } catch (err) {
    console.error('loadQuestionnaire error:', err);
    return { data: null, error: 'load_error' };
  }
}

// ─── Patient Lookup ───────────────────────────────────────────────────────────

/**
 * Live DOB lookup against ChiroTouch via the local bridge — no patient roster is
 * pre-synced to Supabase. Groups patients by name to support multi-case flows, same
 * shape the bridge already returns.
 */
export async function lookupPatientsByDOB(birthDate: string): Promise<LookupResult> {
  try {
    return await callBridge<LookupResult>('/lookup', { birthDate });
  } catch (err) {
    console.error('lookupPatientsByDOB error:', err);
    return { groups: [], error: 'lookup_error' };
  }
}

// ─── Walk-In Appointment Creation ────────────────────────────────────────────

export async function createWalkInAppointment(
  patient: KioskPatient
): Promise<{ appointment: KioskAppointment | null; error: string | null }> {
  try {
    return await callBridge('/walkin', { ct_patient_id: patient.ct_patient_id });
  } catch (err) {
    console.error('createWalkInAppointment error:', err);
    return { appointment: null, error: 'create_error' };
  }
}

// ─── Mark Arrived ─────────────────────────────────────────────────────────────
// Fires immediately on GreetingScreen "Continue" — before the questionnaire is filled
// out — same moment ChiroTouch's own kiosk marks arrival. Runs the PSChiroLib COM
// CheckIn() call on the bridge (see CTCheckinHelper), not a raw SQL UPDATE, so
// CTProvider should refresh instantly the way it does for native check-ins.

export async function markArrived(
  ctPatientId: number,
  ctAppointmentId: number
): Promise<{ error: string | null }> {
  try {
    const result = await callBridge<{ error: string | null }>('/arrive', {
      ctPatientId,
      ctAppointmentId,
    });
    return result;
  } catch (err) {
    console.error('markArrived error:', err);
    return { error: 'update_error' };
  }
}

// ─── Submit Questionnaire ─────────────────────────────────────────────────────
// Arrival already happened via markArrived — this only writes the composed subjective
// text into the chart.

export async function submitQuestionnaire(
  params: SubmitQuestionnaireParams
): Promise<{ error: string | null }> {
  try {
    const complaints = params.complaints.map((c, i) => ({
      complaintNum: c.complaintNum,
      composedText: params.composedTexts[i] ?? '',
      answers: c.answers,
    }));

    const result = await callBridge<{ error: string | null }>('/checkin', {
      ctPatientId: params.ctPatientId,
      ctAppointmentId: params.ctAppointmentId,
      ctDoctorId: params.ctDoctorId,
      complaints,
      generalComposedText: params.generalComposedText,
      generalAnswers: params.generalAnswers,
    });
    return result;
  } catch (err) {
    console.error('submitQuestionnaire error:', err);
    return { error: 'submit_error' };
  }
}

// ─── Submit Arrival Only ──────────────────────────────────────────────────────
// Cash/arrival-only patients have no chart note to write — arrival already happened
// via markArrived, so there's nothing left to do here. Kept as a function (rather than
// removed) so screens don't need restructuring.

export async function submitArrivalOnly(
  _params: SubmitArrivalOnlyParams
): Promise<{ error: string | null }> {
  return { error: null };
}

// ─── Admin: Case Type Mapping ─────────────────────────────────────────────────

export interface CaseTypeMapping {
  id: string;
  case_type: string;
  questionnaire_id: string | null;
  behavior: string;
}

export async function loadCaseTypeMappings(): Promise<{
  data: CaseTypeMapping[];
  error: string | null;
}> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('kiosk_case_type_questionnaire_map')
      .select('*')
      .order('case_type', { ascending: true });
    if (error) throw error;
    return { data: data || [], error: null };
  } catch {
    return { data: [], error: 'load_error' };
  }
}

export async function upsertCaseTypeMapping(
  mapping: Omit<CaseTypeMapping, 'id'> & { id?: string }
): Promise<{ error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('kiosk_case_type_questionnaire_map')
      .upsert(mapping, { onConflict: 'case_type' });
    if (error) throw error;
    return { error: null };
  } catch {
    return { error: 'save_error' };
  }
}

export async function deleteCaseTypeMapping(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('kiosk_case_type_questionnaire_map')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { error: null };
  } catch {
    return { error: 'delete_error' };
  }
}

export async function loadAllQuestionnaires(): Promise<{
  data: KioskQuestionnaire[];
  error: string | null;
}> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('kiosk_questionnaires')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return { data: data || [], error: null };
  } catch {
    return { data: [], error: 'load_error' };
  }
}
