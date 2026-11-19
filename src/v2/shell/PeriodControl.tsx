// The period control of the control panel: Sales Pulse 2.0's period picker
// (src/v2/ui/period-picker), reading and writing Supply Chain Pulse's store.
// A choice that matches a preset is stored as that preset, so "Month to date"
// keeps following today; any other range is a custom window.

import { PeriodPicker, type PeriodValue } from '@/v2/ui/period-picker';
import { COMPARE_ON, presetWindow, todayIso, type PresetKey } from '@/v2/features/period';
import { useStore } from '@/v2/features/store';

const PRESET_KEYS: Exclude<PresetKey, 'custom'>[] = ['mtd', 'lastMonth', 'qtd', 'ytd'];

export function PeriodControl() {
  const st = useStore();
  const value: PeriodValue = {
    start: st.window.start,
    end: st.window.end,
    compare: st.compare === 'prev' ? 'previous' : 'off',
    ly: st.compare === 'ly',
  };
  const apply = (v: PeriodValue) => {
    const today = todayIso();
    const preset = PRESET_KEYS.find((k) => {
      const w = presetWindow(k, today);
      return w.start === v.start && w.end === v.end;
    });
    if (preset) st.setPreset(preset);
    else st.setCustom({ start: v.start, end: v.end });
    // One comparison at a time here: last year when it is ticked, otherwise the previous period.
    if (COMPARE_ON) st.setCompare(v.ly ? 'ly' : 'prev');
  };
  // No dataAsOf: Supply Chain's month to date runs to today (presetWindow), so the
  // picker's "Month to date" must too, or choosing it would become a fixed custom range.
  return <PeriodPicker value={value} onApply={apply} compareEnabled={COMPARE_ON} />;
}
