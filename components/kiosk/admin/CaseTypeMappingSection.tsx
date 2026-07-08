import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import {
  CaseTypeMapping,
  KioskQuestionnaire,
  loadCaseTypeMappings,
  loadAllQuestionnaires,
  upsertCaseTypeMapping,
  deleteCaseTypeMapping,
} from '@/services/kioskService';

export function CaseTypeMappingSection() {
  const [mappings, setMappings] = useState<CaseTypeMapping[]>([]);
  const [questionnaires, setQuestionnaires] = useState<KioskQuestionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // id being saved
  const [newCaseType, setNewCaseType] = useState('');
  const [newQuestId, setNewQuestId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');

  const showStatus = useCallback((msg: string, type: 'success' | 'error') => {
    setStatusMsg(msg);
    setStatusType(type);
    setTimeout(() => { setStatusMsg(''); setStatusType(''); }, 3000);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [mapResult, qResult] = await Promise.all([
      loadCaseTypeMappings(),
      loadAllQuestionnaires(),
    ]);
    if (!mapResult.error) setMappings(mapResult.data);
    if (!qResult.error) setQuestionnaires(qResult.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, []);

  const getQuestionnaireName = useCallback((id: string | null) => {
    if (!id) return '— None (Arrival Only) —';
    const q = questionnaires.find(q => q.id === id);
    return q ? q.name : 'Unknown';
  }, [questionnaires]);

  const handleChangeQuestionnaire = useCallback(async (mapping: CaseTypeMapping, questId: string | null) => {
    setSaving(mapping.id);
    const behavior = questId ? 'questionnaire' : 'arrival_only';
    const { error } = await upsertCaseTypeMapping({
      id: mapping.id,
      case_type: mapping.case_type,
      questionnaire_id: questId,
      behavior,
    });
    setSaving(null);
    if (error) {
      showStatus('Failed to save mapping.', 'error');
    } else {
      setMappings(prev => prev.map(m =>
        m.id === mapping.id ? { ...m, questionnaire_id: questId, behavior } : m
      ));
      showStatus('Mapping updated.', 'success');
    }
  }, [showStatus]);

  const handleDelete = useCallback(async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setSaving(id);
    const { error } = await deleteCaseTypeMapping(id);
    setSaving(null);
    setConfirmDeleteId(null);
    if (error) {
      showStatus('Failed to delete mapping.', 'error');
    } else {
      setMappings(prev => prev.filter(m => m.id !== id));
      showStatus('Mapping deleted.', 'success');
    }
  }, [confirmDeleteId, showStatus]);

  const handleAdd = useCallback(async () => {
    const trimmed = newCaseType.trim().toUpperCase();
    if (!trimmed) { showStatus('Case type cannot be empty.', 'error'); return; }
    if (mappings.some(m => m.case_type.toUpperCase() === trimmed)) {
      showStatus('Case type already exists.', 'error');
      return;
    }
    setAdding(true);
    const behavior = newQuestId ? 'questionnaire' : 'arrival_only';
    const { error } = await upsertCaseTypeMapping({
      case_type: trimmed,
      questionnaire_id: newQuestId,
      behavior,
    });
    setAdding(false);
    if (error) {
      showStatus('Failed to add mapping.', 'error');
    } else {
      setNewCaseType('');
      setNewQuestId(null);
      showStatus('Mapping added.', 'success');
      loadData();
    }
  }, [newCaseType, newQuestId, mappings, showStatus, loadData]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Case Type Mapping</Text>

      {/* Status */}
      {statusMsg !== '' && (
        <View style={[styles.statusBanner, statusType === 'error' ? styles.statusError : styles.statusSuccess]}>
          <Text style={[styles.statusText, statusType === 'error' ? styles.statusErrorText : styles.statusSuccessText]}>
            {statusMsg}
          </Text>
        </View>
      )}

      {/* Table header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, styles.colCaseType]}>CASE TYPE</Text>
        <Text style={[styles.tableHeaderText, styles.colQuestionnaire]}>QUESTIONNAIRE</Text>
        <Text style={[styles.tableHeaderText, styles.colBehavior]}>BEHAVIOR</Text>
        <View style={styles.colActions} />
      </View>

      {/* Rows */}
      {mappings.map(mapping => (
        <View key={mapping.id} style={styles.tableRow}>
          <Text style={[styles.caseTypeText, styles.colCaseType]}>{mapping.case_type}</Text>

          {/* Questionnaire selector */}
          <View style={[styles.colQuestionnaire]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.questPillRow}
            >
              <Pressable
                onPress={() => handleChangeQuestionnaire(mapping, null)}
                style={[
                  styles.questPill,
                  !mapping.questionnaire_id && styles.questPillSelected,
                ]}
              >
                <Text style={[styles.questPillText, !mapping.questionnaire_id && styles.questPillTextSelected]}>
                  None
                </Text>
              </Pressable>
              {questionnaires.map(q => (
                <Pressable
                  key={q.id}
                  onPress={() => handleChangeQuestionnaire(mapping, q.id)}
                  style={[
                    styles.questPill,
                    mapping.questionnaire_id === q.id && styles.questPillSelected,
                  ]}
                >
                  <Text style={[styles.questPillText, mapping.questionnaire_id === q.id && styles.questPillTextSelected]}>
                    {q.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.colBehavior}>
            <View style={[
              styles.behaviorBadge,
              mapping.behavior === 'questionnaire' ? styles.behaviorQ : styles.behaviorA,
            ]}>
              <Text style={[
                styles.behaviorText,
                mapping.behavior === 'questionnaire' ? styles.behaviorQText : styles.behaviorAText,
              ]}>
                {mapping.behavior === 'questionnaire' ? 'Questionnaire' : 'Arrival Only'}
              </Text>
            </View>
          </View>

          <View style={styles.colActions}>
            {saving === mapping.id ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Pressable
                onPress={() => handleDelete(mapping.id)}
                style={({ pressed }) => [
                  styles.deleteBtn,
                  confirmDeleteId === mapping.id && styles.deleteBtnConfirm,
                  pressed && styles.deleteBtnPressed,
                ]}
              >
                <Text style={[
                  styles.deleteBtnText,
                  confirmDeleteId === mapping.id && styles.deleteBtnConfirmText,
                ]}>
                  {confirmDeleteId === mapping.id ? 'Confirm' : 'Delete'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}

      {/* Add new row */}
      <View style={styles.addRow}>
        <Text style={styles.addTitle}>Add New Mapping</Text>
        <View style={styles.addInputRow}>
          <TextInput
            style={[styles.addInput, styles.colCaseType]}
            value={newCaseType}
            onChangeText={setNewCaseType}
            placeholder="Case Type"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
          />

          <View style={[styles.colQuestionnaire]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.questPillRow}
            >
              <Pressable
                onPress={() => setNewQuestId(null)}
                style={[styles.questPill, newQuestId === null && styles.questPillSelected]}
              >
                <Text style={[styles.questPillText, newQuestId === null && styles.questPillTextSelected]}>
                  None
                </Text>
              </Pressable>
              {questionnaires.map(q => (
                <Pressable
                  key={q.id}
                  onPress={() => setNewQuestId(q.id)}
                  style={[styles.questPill, newQuestId === q.id && styles.questPillSelected]}
                >
                  <Text style={[styles.questPillText, newQuestId === q.id && styles.questPillTextSelected]}>
                    {q.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <Pressable
            onPress={handleAdd}
            disabled={adding}
            style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
          >
            {adding ? (
              <ActivityIndicator size="small" color={Colors.textOnPrimary} />
            ) : (
              <Text style={styles.addBtnText}>Add</Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  sectionTitle: {
    fontSize: Typography.heading2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  statusBanner: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  statusError: { backgroundColor: Colors.errorLight, borderColor: Colors.error },
  statusSuccess: { backgroundColor: Colors.successLight, borderColor: Colors.success },
  statusText: { fontSize: Typography.body, fontWeight: Typography.medium, textAlign: 'center' },
  statusErrorText: { color: Colors.error },
  statusSuccessText: { color: Colors.success },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  tableHeaderText: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  colCaseType: { width: 110 },
  colQuestionnaire: { flex: 1, marginHorizontal: Spacing.md },
  colBehavior: { width: 130 },
  colActions: { width: 80, alignItems: 'flex-end' },
  questPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
    marginRight: Spacing.sm,
  },
  questPillSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  questPillText: {
    fontSize: Typography.caption,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
  },
  questPillTextSelected: {
    color: Colors.primaryDark,
    fontWeight: Typography.bold,
  },
  caseTypeText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  behaviorBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  behaviorQ: { backgroundColor: Colors.primaryLight },
  behaviorA: { backgroundColor: Colors.successLight },
  behaviorText: { fontSize: Typography.small, fontWeight: Typography.semibold },
  behaviorQText: { color: Colors.primaryDark },
  behaviorAText: { color: Colors.success },
  deleteBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  deleteBtnConfirm: { backgroundColor: Colors.error },
  deleteBtnPressed: { opacity: 0.8 },
  deleteBtnText: { fontSize: Typography.caption, fontWeight: Typography.bold, color: Colors.error },
  deleteBtnConfirmText: { color: Colors.textOnPrimary },
  addRow: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  addTitle: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  addInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addInput: {
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    marginRight: Spacing.md,
  },
  addBtn: {
    height: 44,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.97 }],
  },
  addBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textOnPrimary,
  },
});
