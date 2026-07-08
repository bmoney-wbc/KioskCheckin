import { getSupabaseClient } from '@/template';
import { CLINIC_ID } from '@/constants/config';

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
 * Updated lookup that returns patient groups supporting multi-case and walk-in flows.
 */
export async function lookupPatientsByDOB(birthDate: string): Promise<LookupResult> {
  try {
    const supabase = getSupabaseClient();

    // 1. Find all patients with this DOB at this clinic
    const { data: patients, error: pError } = await supabase
      .from('kiosk_patients')
      .select('*')
      .eq('clinic', CLINIC_ID)
      .eq('birth_date', birthDate)
      .eq('is_active', true);

    if (pError) throw pError;
    if (!patients || patients.length === 0) return { groups: [], error: null };

    const patientIds = patients.map((p: KioskPatient) => p.ct_patient_id);

    // 2. Find today's appointments for all matched patients (not yet arrived)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const { data: appointments, error: aError } = await supabase
      .from('kiosk_appointments')
      .select('*')
      .eq('clinic', CLINIC_ID)
      .eq('is_arrived', false)
      .in('ct_patient_id', patientIds)
      .gte('schedule_date_time', `${todayStr}T00:00:00.000Z`)
      .lte('schedule_date_time', `${todayStr}T23:59:59.999Z`);

    if (aError) throw aError;

    const apptList: KioskAppointment[] = appointments || [];

    // 3. Load behavior map for all case types
    const caseTypes = [...new Set(patients.map((p: KioskPatient) => p.case_type).filter(Boolean))];
    let behaviorMap: Record<string, string> = {};

    if (caseTypes.length > 0) {
      const { data: mappings, error: mError } = await supabase
        .from('kiosk_case_type_questionnaire_map')
        .select('case_type, behavior')
        .in('case_type', caseTypes);

      if (!mError && mappings) {
        mappings.forEach((m: { case_type: string; behavior: string }) => {
          behaviorMap[m.case_type] = m.behavior;
        });
      }
    }

    // 4. Group patients by name (first+last)
    const nameGroupMap: Record<string, PatientGroup> = {};

    for (const patient of patients) {
      const nameKey = `${patient.first_name.toLowerCase()}|${patient.last_name.toLowerCase()}`;

      if (!nameGroupMap[nameKey]) {
        nameGroupMap[nameKey] = {
          firstName: patient.first_name,
          lastName: patient.last_name,
          cases: [],
          casesWithAppointments: [],
          hasAppointments: false,
        };
      }

      nameGroupMap[nameKey].cases.push(patient);

      // Check if this patient/case has an appointment today
      const appt = apptList.find(
        (a: KioskAppointment) => a.ct_patient_id === patient.ct_patient_id
      );
      if (appt) {
        const behavior = patient.case_type
          ? ((behaviorMap[patient.case_type] as 'questionnaire' | 'arrival_only') ?? null)
          : null;
        nameGroupMap[nameKey].casesWithAppointments.push({ patient, appointment: appt, behavior });
        nameGroupMap[nameKey].hasAppointments = true;
      }
    }

    const groups = Object.values(nameGroupMap);
    return { groups, error: null };
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
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('kiosk_appointments')
      .insert({
        clinic: CLINIC_ID,
        ct_appointment_id: 0,
        ct_patient_id: patient.ct_patient_id,
        ct_doctor_id: 0,
        schedule_date_time: now,
        purpose_of_visit: 'Walk-In',
        status: 1000,
        is_walk_in: true,
        is_arrived: false,
      })
      .select()
      .single();

    if (error) throw error;
    return { appointment: data as KioskAppointment, error: null };
  } catch (err) {
    console.error('createWalkInAppointment error:', err);
    return { appointment: null, error: 'create_error' };
  }
}

// ─── Update Patient Language Preference ─────────────────────────────────────

export async function updatePatientLanguage(
  patientId: string,
  language: string
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await supabase
      .from('kiosk_patients')
      .update({ preferred_language: language })
      .eq('id', patientId);
  } catch (err) {
    console.error('updatePatientLanguage error:', err);
  }
}

// ─── Mark Arrived ─────────────────────────────────────────────────────────────

export async function markArrived(
  clinicId: string,
  appointmentRowId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('kiosk_appointments')
      .update({ is_arrived: true, updated_at: new Date().toISOString() })
      .eq('clinic', clinicId)
      .eq('id', appointmentRowId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('markArrived error:', err);
    return { error: 'update_error' };
  }
}

// ─── Submit Questionnaire ─────────────────────────────────────────────────────

export async function submitQuestionnaire(
  params: SubmitQuestionnaireParams
): Promise<{ error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    // Mark arrived by row UUID
    const { error: arrivedError } = await supabase
      .from('kiosk_appointments')
      .update({ is_arrived: true, updated_at: now })
      .eq('clinic', CLINIC_ID)
      .eq('id', params.appointmentRowId);
    if (arrivedError) throw arrivedError;

    const isWalkIn = params.isWalkIn ?? false;

    // Insert one row per complaint
    for (let i = 0; i < params.complaints.length; i++) {
      const complaint = params.complaints[i];
      const { error: insertError } = await supabase
        .from('kiosk_pending_subjectives')
        .insert({
          clinic: CLINIC_ID,
          ct_patient_id: params.ctPatientId,
          ct_appointment_id: params.ctAppointmentId,
          ct_doctor_id: params.ctDoctorId,
          questionnaire_id: params.questionnaireId,
          complaint_num: complaint.complaintNum,
          composed_text: params.composedTexts[i] ?? '',
          composed_text_no_symptoms: '',
          raw_answers: complaint.answers,
          patient_language: params.patientLanguage,
          behavior: 'questionnaire',
          status: 'pending',
          is_walk_in: isWalkIn,
          submitted_at: now,
        });
      if (insertError) throw insertError;
    }

    // Insert general answers row (complaint_num = 0)
    const { error: genError } = await supabase
      .from('kiosk_pending_subjectives')
      .insert({
        clinic: CLINIC_ID,
        ct_patient_id: params.ctPatientId,
        ct_appointment_id: params.ctAppointmentId,
        ct_doctor_id: params.ctDoctorId,
        questionnaire_id: params.questionnaireId,
        complaint_num: 0,
        composed_text: params.generalComposedText,
        composed_text_no_symptoms: '',
        raw_answers: params.generalAnswers,
        patient_language: params.patientLanguage,
        behavior: 'questionnaire',
        status: 'pending',
        is_walk_in: isWalkIn,
        submitted_at: now,
      });
    if (genError) throw genError;

    // Update patient language preference if it changed
    if (params.patientLanguage !== params.storedLanguage) {
      await updatePatientLanguage(params.patientId, params.patientLanguage);
    }

    return { error: null };
  } catch (err) {
    console.error('submitQuestionnaire error:', err);
    return { error: 'submit_error' };
  }
}

// ─── Submit Arrival Only ──────────────────────────────────────────────────────

export async function submitArrivalOnly(
  params: SubmitArrivalOnlyParams
): Promise<{ error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const isWalkIn = params.isWalkIn ?? false;

    // For walk-ins (ct_appointment_id=0), skip mark-arrived since we just created the record
    if (!isWalkIn) {
      const { error: arrivedError } = await supabase
        .from('kiosk_appointments')
        .update({ is_arrived: true, updated_at: now })
        .eq('clinic', CLINIC_ID)
        .eq('id', params.appointmentRowId);
      if (arrivedError) throw arrivedError;
    } else {
      // Mark the walk-in appointment arrived by row id
      await supabase
        .from('kiosk_appointments')
        .update({ is_arrived: true, updated_at: now })
        .eq('clinic', CLINIC_ID)
        .eq('id', params.appointmentRowId);
    }

    const { error: insertError } = await supabase
      .from('kiosk_pending_subjectives')
      .insert({
        clinic: CLINIC_ID,
        ct_patient_id: params.ctPatientId,
        ct_appointment_id: params.ctAppointmentId,
        ct_doctor_id: params.ctDoctorId,
        questionnaire_id: null,
        complaint_num: 0,
        composed_text: '',
        composed_text_no_symptoms: '',
        raw_answers: {},
        patient_language: params.patientLanguage,
        behavior: 'arrival_only',
        status: 'pending',
        is_walk_in: isWalkIn,
        submitted_at: now,
      });
    if (insertError) throw insertError;

    // Update patient language preference if it changed
    if (params.patientLanguage !== params.storedLanguage) {
      await updatePatientLanguage(params.patientId, params.patientLanguage);
    }

    return { error: null };
  } catch (err) {
    console.error('submitArrivalOnly error:', err);
    return { error: 'submit_error' };
  }
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
