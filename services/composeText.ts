import { KioskQuestionOption, KioskQuestion } from '@/services/kioskService';
import { ComplaintAnswers, GeneralAnswers } from '@/components/kiosk/QuestionnaireScreen';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Look up the label_en for a single option value within a question's options */
function getLabel(
  options: KioskQuestionOption[],
  value: string
): string {
  const opt = options.find(o => o.value === value);
  return opt ? opt.label_en.toLowerCase() : value;
}

/** Join an array of strings with Oxford-comma "and" */
function joinList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/** Map timing value to phrase */
function timingPhrase(value: string): string {
  const map: Record<string, string> = {
    morning: 'in the morning',
    afternoon: 'in the afternoon',
    evening: 'in the evening',
    night: 'at night',
    no_pattern: 'with no specific pattern',
  };
  return map[value] ?? value;
}

/** Map SleepImpact value to sentence */
function sleepSentence(value: string): string {
  const map: Record<string, string> = {
    no: 'The discomfort is not affecting sleep.',
    occasionally: 'The discomfort is occasionally affecting sleep.',
    most_nights: 'The discomfort is affecting sleep most nights.',
    every_night: 'The discomfort is affecting sleep every night.',
  };
  return map[value] ?? '';
}

/** Map ActivityImpact value to sentence */
function activitySentence(value: string): string {
  const map: Record<string, string> = {
    not_at_all: 'Daily activities are not limited.',
    slightly: 'Daily activities are slightly limited.',
    moderately: 'Daily activities are moderately limited.',
    significantly: 'Daily activities are significantly limited.',
  };
  return map[value] ?? '';
}

// ─── Lookup table: question_key → options array ──────────────────────────────

interface OptionLookup {
  Region: KioskQuestionOption[];
  Quality: KioskQuestionOption[];
  Frequency: KioskQuestionOption[];
  Increases: KioskQuestionOption[];
  Decreases: KioskQuestionOption[];
  Timing: KioskQuestionOption[];
  SleepImpact: KioskQuestionOption[];
  ActivityImpact: KioskQuestionOption[];
  Comparison: KioskQuestionOption[];
  Medication: KioskQuestionOption[];
}

function buildOptionLookup(
  questions: KioskQuestion[],
  optionsByQuestionId: Record<string, KioskQuestionOption[]>
): OptionLookup {
  const lookup: Partial<OptionLookup> = {};
  for (const q of questions) {
    const key = q.question_key as keyof OptionLookup;
    lookup[key] = optionsByQuestionId[q.id] ?? [];
  }
  return lookup as OptionLookup;
}

// ─── Per-complaint paragraph ─────────────────────────────────────────────────

function composeComplaintText(
  firstName: string,
  answers: ComplaintAnswers,
  lookup: OptionLookup,
  isFirst: boolean
): string {
  const regionLabels = answers.Region.map(v => getLabel(lookup.Region, v));
  const qualityLabels = answers.Quality.map(v => getLabel(lookup.Quality, v));
  const frequencyLabel = getLabel(lookup.Frequency, answers.Frequency);

  const increaseLabels = answers.Increases.map(v => {
    const label = getLabel(lookup.Increases, v);
    return label === 'nothing specific' ? 'no specific activities' : label;
  });
  const decreaseLabels = answers.Decreases.map(v => {
    const label = getLabel(lookup.Decreases, v);
    return label === 'nothing' ? 'nothing specific' : label;
  });

  const regions = joinList(regionLabels);
  const quality = joinList(qualityLabels);
  const increases = joinList(increaseLabels);
  const decreases = joinList(decreaseLabels);
  const timing = timingPhrase(answers.Timing);
  const sleep = sleepSentence(answers.SleepImpact);
  const activity = activitySentence(answers.ActivityImpact);
  const severity = answers.Severity ?? 0;

  const intro = isFirst
    ? `${firstName} sought treatment today, complaining of`
    : `${firstName} also complained of`;

  return (
    `${intro} ${frequencyLabel} ${quality} discomfort in the ${regions}. ` +
    `The patient rated the intensity of discomfort, using a VAS, as a level ${severity} on a scale of 1 to 10 with 10 being the most severe. ` +
    `The discomfort was reported to increase with ${increases}. ` +
    `The discomfort was reported to decrease with ${decreases}. ` +
    `The discomfort is worst ${timing}. ` +
    `${sleep} ${activity}`
  ).trim();
}

// ─── General paragraph ───────────────────────────────────────────────────────

function composeGeneralText(
  answers: GeneralAnswers,
  lookup: OptionLookup
): string {
  const comparisonLabel = getLabel(lookup.Comparison, answers.Comparison);

  let medicationSentence: string;
  if (
    answers.Medication.length === 0 ||
    answers.Medication.includes('none')
  ) {
    medicationSentence = 'Patient has not taken any medication since the last visit.';
  } else {
    const medLabels = answers.Medication.filter(v => v !== 'none').map(v =>
      getLabel(lookup.Medication, v)
    );
    medicationSentence = `Patient has been taking ${joinList(medLabels)} since the last visit.`;
  }

  return (
    `Patient reports feeling ${comparisonLabel} compared to the last visit. ` +
    medicationSentence
  ).trim();
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ComposeResult {
  composedTexts: string[];      // one per complaint
  generalComposedText: string;  // general section
}

export function composeSubjectiveText(
  firstName: string,
  complaints: { complaintNum: number; answers: ComplaintAnswers }[],
  generalAnswers: GeneralAnswers,
  allQuestions: KioskQuestion[],
  optionsByQuestionId: Record<string, KioskQuestionOption[]>
): ComposeResult {
  const lookup = buildOptionLookup(allQuestions, optionsByQuestionId);

  const composedTexts = complaints.map((c, idx) =>
    composeComplaintText(firstName, c.answers, lookup, idx === 0)
  );

  const generalComposedText = composeGeneralText(generalAnswers, lookup);

  return { composedTexts, generalComposedText };
}
