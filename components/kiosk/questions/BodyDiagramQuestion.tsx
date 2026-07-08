import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { KioskQuestionOption } from '@/services/kioskService';

const MAX_REGIONS = 3;
const TOAST_MS = 2000;

// Virtual canvas: 109.2 x 205.6 (matches SVG viewBox)
const VW = 109.2;
const VH = 205.6;

// Zone definition: { id, label_en, label_es, dbValue, x, y, w, h }
// x,y = top-left corner in virtual coords; w,h = width/height in virtual coords
// These are approximate bounding boxes for each SVG zone

interface Zone {
  id: string;
  label_en: string;
  label_es: string;
  dbValue: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rx?: number; // border-radius as % of min(w,h)
}

const BODY_IMAGES = {
  back:  'https://cdn-ai.onspace.ai/onspace/files/X75FvsaXsH8SGb2GH5344q/bodyback.png',
  front: 'https://cdn-ai.onspace.ai/onspace/files/4g3njfp4YoBaD3UHXL4GrX/bodyfront.png',
};

const BACK_ZONES: Zone[] = [
  { id: 'head',                   label_en: 'Head (Back)',          label_es: 'Cabeza (Posterior)',       dbValue: 'back_of_head',            x: 46,  y: 3,   w: 18, h: 16, rx: 50 },
  { id: 'neck',                   label_en: 'Neck (Back)',          label_es: 'Cuello (Posterior)',       dbValue: 'r_posterior_neck',        x: 49,  y: 19,  w: 12, h: 9  },
  { id: 'back-of-left-shoulder',  label_en: 'Left Shoulder',        label_es: 'Hombro Izquierdo',        dbValue: 'l_posterior_shoulder',    x: 33,  y: 28,  w: 16, h: 14 },
  { id: 'back-of-right-shoulder', label_en: 'Right Shoulder',       label_es: 'Hombro Derecho',          dbValue: 'r_posterior_shoulder',    x: 61,  y: 28,  w: 16, h: 14 },
  { id: 'upper-back',             label_en: 'Upper Back',           label_es: 'Espalda Superior',        dbValue: 'r_upper_back',            x: 44,  y: 28,  w: 22, h: 16 },
  { id: 'mid-back',               label_en: 'Mid Back',             label_es: 'Espalda Media',           dbValue: 'r_mid_back',              x: 44,  y: 44,  w: 22, h: 16 },
  { id: 'low-back',               label_en: 'Low Back',             label_es: 'Espalda Baja',            dbValue: 'r_lower_back',            x: 44,  y: 60,  w: 22, h: 16 },
  { id: 'buttocks',               label_en: 'Buttocks / Tailbone',  label_es: 'Glúteos / Cóccix',        dbValue: 'tailbone',                x: 44,  y: 76,  w: 22, h: 14 },
  { id: 'back-of-left-hip',       label_en: 'Left Hip (Back)',      label_es: 'Cadera Izq. (Posterior)', dbValue: 'l_posterior_hip',         x: 33,  y: 76,  w: 12, h: 14 },
  { id: 'back-of-right-hip',      label_en: 'Right Hip (Back)',     label_es: 'Cadera Der. (Posterior)', dbValue: 'r_posterior_hip',         x: 65,  y: 76,  w: 12, h: 14 },
  { id: 'back-of-left-arm',       label_en: 'Left Upper Arm',       label_es: 'Brazo Sup. Izq.',         dbValue: 'l_posterior_upper_arm',   x: 20,  y: 42,  w: 13, h: 18 },
  { id: 'back-of-right-arm',      label_en: 'Right Upper Arm',      label_es: 'Brazo Sup. Der.',         dbValue: 'r_posterior_upper_arm',   x: 77,  y: 42,  w: 13, h: 18 },
  { id: 'left-elbow',             label_en: 'Left Elbow',           label_es: 'Codo Izquierdo',          dbValue: 'l_posterior_elbow',       x: 18,  y: 60,  w: 12, h: 10 },
  { id: 'right-elbow',            label_en: 'Right Elbow',          label_es: 'Codo Derecho',            dbValue: 'r_posterior_elbow',       x: 80,  y: 60,  w: 12, h: 10 },
  { id: 'back-of-left-forearm',   label_en: 'Left Forearm',         label_es: 'Antebrazo Izquierdo',     dbValue: 'l_posterior_forearm',     x: 14,  y: 70,  w: 12, h: 18 },
  { id: 'back-of-right-forearm',  label_en: 'Right Forearm',        label_es: 'Antebrazo Derecho',       dbValue: 'r_posterior_forearm',     x: 84,  y: 70,  w: 12, h: 18 },
  { id: 'left-hand-wrist',        label_en: 'Left Hand/Wrist',      label_es: 'Mano/Muñeca Izq.',        dbValue: 'l_posterior_wrist_hand',  x: 10,  y: 88,  w: 14, h: 12 },
  { id: 'right-hand-wrist',       label_en: 'Right Hand/Wrist',     label_es: 'Mano/Muñeca Der.',        dbValue: 'r_posterior_wrist_hand',  x: 86,  y: 88,  w: 14, h: 12 },
  { id: 'back-of-left-leg',       label_en: 'Left Thigh (Back)',    label_es: 'Muslo Izq. (Posterior)',  dbValue: 'l_posterior_thigh',       x: 34,  y: 90,  w: 16, h: 28 },
  { id: 'back-of-right-leg',      label_en: 'Right Thigh (Back)',   label_es: 'Muslo Der. (Posterior)',  dbValue: 'r_posterior_thigh',       x: 60,  y: 90,  w: 16, h: 28 },
  { id: 'back-of-left-knee',      label_en: 'Left Knee (Back)',     label_es: 'Rodilla Izq. (Posterior)',dbValue: 'l_posterior_knee',        x: 34,  y: 118, w: 16, h: 12 },
  { id: 'back-of-right-knee',     label_en: 'Right Knee (Back)',    label_es: 'Rodilla Der. (Posterior)',dbValue: 'r_posterior_knee',        x: 60,  y: 118, w: 16, h: 12 },
  { id: 'left-calf',              label_en: 'Left Calf',            label_es: 'Pantorrilla Izquierda',   dbValue: 'l_calf',                  x: 34,  y: 130, w: 16, h: 28 },
  { id: 'right-calf',             label_en: 'Right Calf',           label_es: 'Pantorrilla Derecha',     dbValue: 'r_calf',                  x: 60,  y: 130, w: 16, h: 28 },
  { id: 'left-ankle-foot',        label_en: 'Left Ankle/Foot',      label_es: 'Tobillo/Pie Izquierdo',   dbValue: 'l_posterior_ankle_foot',  x: 33,  y: 158, w: 17, h: 14 },
  { id: 'right-ankle-foot',       label_en: 'Right Ankle/Foot',     label_es: 'Tobillo/Pie Derecho',     dbValue: 'r_posterior_ankle_foot',  x: 60,  y: 158, w: 17, h: 14 },
];

const FRONT_ZONES: Zone[] = [
  { id: 'front-of-head',          label_en: 'Head (Front)',         label_es: 'Cabeza (Anterior)',       dbValue: 'front_of_head',           x: 46,  y: 3,   w: 18, h: 16, rx: 50 },
  { id: 'front-of-neck',          label_en: 'Neck (Front)',         label_es: 'Cuello (Anterior)',       dbValue: 'r_anterior_neck',         x: 49,  y: 19,  w: 12, h: 9  },
  { id: 'front-of-left-shoulder', label_en: 'Left Shoulder',        label_es: 'Hombro Izquierdo',        dbValue: 'l_anterior_shoulder',     x: 33,  y: 28,  w: 16, h: 14 },
  { id: 'front-of-right-shoulder',label_en: 'Right Shoulder',       label_es: 'Hombro Derecho',          dbValue: 'r_anterior_shoulder',     x: 61,  y: 28,  w: 16, h: 14 },
  { id: 'chest',                  label_en: 'Chest',                label_es: 'Pecho',                   dbValue: 'chest',                   x: 44,  y: 28,  w: 22, h: 22 },
  { id: 'abdomen',                label_en: 'Abdomen',              label_es: 'Abdomen',                 dbValue: 'r_abdomen',               x: 44,  y: 50,  w: 22, h: 22 },
  { id: 'front-of-left-hip',      label_en: 'Left Hip (Front)',     label_es: 'Cadera Izq. (Anterior)',  dbValue: 'l_anterior_hip',          x: 33,  y: 72,  w: 12, h: 18 },
  { id: 'front-of-right-hip',     label_en: 'Right Hip (Front)',    label_es: 'Cadera Der. (Anterior)',  dbValue: 'r_anterior_hip',          x: 65,  y: 72,  w: 12, h: 18 },
  { id: 'front-of-left-arm',      label_en: 'Left Upper Arm',       label_es: 'Brazo Sup. Izq.',         dbValue: 'l_anterior_upper_arm',    x: 20,  y: 42,  w: 13, h: 18 },
  { id: 'front-of-right-arm',     label_en: 'Right Upper Arm',      label_es: 'Brazo Sup. Der.',         dbValue: 'r_anterior_upper_arm',    x: 77,  y: 42,  w: 13, h: 18 },
  { id: 'front-of-left-elbow',    label_en: 'Left Elbow',           label_es: 'Codo Izquierdo',          dbValue: 'l_anterior_elbow',        x: 18,  y: 60,  w: 12, h: 10 },
  { id: 'front-of-right-elbow',   label_en: 'Right Elbow',          label_es: 'Codo Derecho',            dbValue: 'r_anterior_elbow',        x: 80,  y: 60,  w: 12, h: 10 },
  { id: 'front-of-left-forearm',  label_en: 'Left Forearm',         label_es: 'Antebrazo Izquierdo',     dbValue: 'l_anterior_forearm',      x: 14,  y: 70,  w: 12, h: 18 },
  { id: 'front-of-right-forearm', label_en: 'Right Forearm',        label_es: 'Antebrazo Derecho',       dbValue: 'r_anterior_forearm',      x: 84,  y: 70,  w: 12, h: 18 },
  { id: 'front-of-left-wrist-hand',label_en:'Left Hand/Wrist',      label_es: 'Mano/Muñeca Izq.',        dbValue: 'l_wrist_hand',            x: 10,  y: 88,  w: 14, h: 12 },
  { id: 'front-of-right-wrist-hand',label_en:'Right Hand/Wrist',    label_es: 'Mano/Muñeca Der.',        dbValue: 'r_wrist_hand',            x: 86,  y: 88,  w: 14, h: 12 },
  { id: 'front-of-left-leg',      label_en: 'Left Thigh (Front)',   label_es: 'Muslo Izq. (Anterior)',   dbValue: 'l_anterior_thigh',        x: 34,  y: 90,  w: 16, h: 28 },
  { id: 'front-of-right-leg',     label_en: 'Right Thigh (Front)',  label_es: 'Muslo Der. (Anterior)',   dbValue: 'r_anterior_thigh',        x: 60,  y: 90,  w: 16, h: 28 },
  { id: 'left-knee',              label_en: 'Left Knee',            label_es: 'Rodilla Izquierda',       dbValue: 'l_anterior_knee',         x: 34,  y: 118, w: 16, h: 12 },
  { id: 'right-knee',             label_en: 'Right Knee',           label_es: 'Rodilla Derecha',         dbValue: 'r_anterior_knee',         x: 60,  y: 118, w: 16, h: 12 },
  { id: 'left-shin',              label_en: 'Left Shin',            label_es: 'Espinilla Izquierda',     dbValue: 'l_shin',                  x: 34,  y: 130, w: 16, h: 28 },
  { id: 'right-shin',             label_en: 'Right Shin',           label_es: 'Espinilla Derecha',       dbValue: 'r_shin',                  x: 60,  y: 130, w: 16, h: 28 },
  { id: 'left-ankle-foot-front',  label_en: 'Left Ankle/Foot',      label_es: 'Tobillo/Pie Izquierdo',   dbValue: 'l_anterior_ankle_foot',   x: 33,  y: 158, w: 17, h: 14 },
  { id: 'right-ankle-foot-front', label_en: 'Right Ankle/Foot',     label_es: 'Tobillo/Pie Derecho',     dbValue: 'r_anterior_ankle_foot',   x: 60,  y: 158, w: 17, h: 14 },
];

const T = {
  front:    { en: 'Front',   es: 'Frente'  },
  back:     { en: 'Back',    es: 'Espalda' },
  maxToast: { en: 'Maximum 3 areas selected', es: 'Máximo 3 áreas seleccionadas' },
  tapHint:  { en: 'Tap areas to select (max 3)', es: 'Toca las áreas (máx. 3)' },
};

interface ChipProps {
  label: string;
  value: string;
  onRemove: (value: string) => void;
}

function Chip({ label, value, onRemove }: ChipProps) {
  return (
    <Pressable
      onPress={() => onRemove(value)}
      style={chipStyles.chip}
      accessibilityLabel={'Remove ' + label}
    >
      <Text style={chipStyles.chipText}>{label}</Text>
      <Text style={chipStyles.chipX}> ×</Text>
    </Pressable>
  );
}

interface ZoneBtnProps {
  zone: Zone;
  selected: boolean;
  scale: number;
  onPress: (zone: Zone) => void;
}

function ZoneBtn({ zone, selected, scale, onPress }: ZoneBtnProps) {
  const left = zone.x * scale;
  const top = zone.y * scale;
  const width = zone.w * scale;
  const height = zone.h * scale;
  const borderRadius = zone.rx != null ? Math.min(width, height) * zone.rx / 100 : 4;

  const containerStyle = {
    position: 'absolute' as const,
    left,
    top,
    width,
    height,
    borderRadius,
    backgroundColor: selected ? 'rgba(191,49,49,0.50)' : 'rgba(0,0,0,0)',
    borderWidth: selected ? 2 : 0,
    borderColor: selected ? 'rgba(191,49,49,0.85)' : 'transparent',
  };

  return (
    <Pressable
      style={containerStyle}
      onPress={() => onPress(zone)}
      accessibilityLabel={zone.label_en}
    />
  );
}

interface BodyDiagramQuestionProps {
  options: KioskQuestionOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  language: 'en' | 'es';
}

export function BodyDiagramQuestion({
  options,
  selectedValues,
  onChange,
  language,
}: BodyDiagramQuestionProps) {
  const [view, setView] = useState<'back' | 'front'>('back');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const t = useCallback((key: keyof typeof T) => T[key][language], [language]);

  // Measure the canvas area to compute scale
  const [canvasSize, setCanvasSize] = useState({ width: 260, height: 480 });
  const scale = Math.min(canvasSize.width / VW, canvasSize.height / VH);

  const optionByValue = React.useMemo(() => {
    const map: Record<string, KioskQuestionOption> = {};
    options.forEach(o => { map[o.value] = o; });
    return map;
  }, [options]);

  const getLabel = useCallback((value: string): string => {
    const opt = optionByValue[value];
    if (opt) return language === 'es' ? opt.label_es : opt.label_en;
    // Fallback: find in zone defs
    const allZones = [...BACK_ZONES, ...FRONT_ZONES];
    const zone = allZones.find(z => z.dbValue === value);
    if (zone) return language === 'es' ? zone.label_es : zone.label_en;
    return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }, [optionByValue, language]);

  const handleZonePress = useCallback((zone: Zone) => {
    const db = zone.dbValue;
    const idx = selectedValues.indexOf(db);
    if (idx >= 0) {
      onChange(selectedValues.filter(v => v !== db));
    } else {
      if (selectedValues.length >= MAX_REGIONS) {
        setToastVisible(true);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastVisible(false), TOAST_MS);
        return;
      }
      onChange([...selectedValues, db]);
    }
  }, [selectedValues, onChange]);

  const handleDeselect = useCallback((value: string) => {
    onChange(selectedValues.filter(v => v !== value));
  }, [selectedValues, onChange]);

  const zones = view === 'back' ? BACK_ZONES : FRONT_ZONES;
  const canvasW = scale * VW;
  const canvasH = scale * VH;

  return (
    <View style={styles.wrapper}>
      {/* Toast */}
      {toastVisible ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{t('maxToast')}</Text>
        </View>
      ) : null}

      {/* Front/Back toggle */}
      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => setView('back')}
          style={view === 'back' ? styles.toggleBtnActive : styles.toggleBtn}
        >
          <Text style={view === 'back' ? styles.toggleBtnTextActive : styles.toggleBtnText}>
            {t('back')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setView('front')}
          style={view === 'front' ? styles.toggleBtnActive : styles.toggleBtn}
        >
          <Text style={view === 'front' ? styles.toggleBtnTextActive : styles.toggleBtnText}>
            {t('front')}
          </Text>
        </Pressable>
      </View>

      {/* Canvas */}
      <View
        style={styles.figureOuter}
        onLayout={e => {
          const { width, height } = e.nativeEvent.layout;
          setCanvasSize({ width, height });
        }}
      >
        <View
          style={{
            width: canvasW,
            height: canvasH,
            position: 'relative',
            alignSelf: 'center',
          }}
        >
          <Image
            source={{ uri: BODY_IMAGES[view] }}
            style={styles.bodyImage}
            contentFit="contain"
            transition={150}
          />
          {zones.map(zone => (
            <ZoneBtn
              key={zone.id}
              zone={zone}
              selected={selectedValues.indexOf(zone.dbValue) >= 0}
              scale={scale}
              onPress={handleZonePress}
            />
          ))}
        </View>

        {/* Hint label */}
        <View style={styles.hintRow} pointerEvents="none">
          <Text style={styles.hintText}>{t('tapHint')}</Text>
        </View>
      </View>

      {/* Selected region chips */}
      {selectedValues.length > 0 ? (
        <View style={styles.chipsArea}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {selectedValues.map(value => (
              <Chip
                key={value}
                value={value}
                label={getLabel(value)}
                onRemove={handleDeselect}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    marginRight: Spacing.sm,
  },
  chipText: {
    fontSize: Typography.caption,
    color: '#FFFFFF',
    fontWeight: Typography.semibold,
  },
  chipX: {
    fontSize: Typography.body,
    color: '#FFFFFF',
    fontWeight: Typography.bold,
  },
});

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
  },
  toast: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    zIndex: 100,
    backgroundColor: '#1E293B',
    borderRadius: 999,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: Typography.body,
    fontWeight: Typography.medium,
  },
  toggleRow: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.primary,
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  toggleBtn: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  toggleBtnActive: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
  },
  toggleBtnText: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: Colors.primary,
  },
  toggleBtnTextActive: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: '#FFFFFF',
  },
  figureOuter: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  hintRow: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
  },
  hintText: {
    fontSize: Typography.small,
    color: '#94A3B8',
  },
  chipsArea: {
    width: '100%',
    marginTop: Spacing.sm,
    minHeight: 44,
  },
  chipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
});
