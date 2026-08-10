import { useRef } from 'react';
import { CartesianGrid, XAxis, YAxis, ReferenceLine } from 'recharts';
import { euroAxisFormatter } from '../utils/formatting';

export const CHART_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#ef4444',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#f97316',
  '#6366f1',
];

export const DIMENSION_LABELS = {
  category: 'Kategorie',
  purpose: 'Verwendungszweck',
  partner: 'Transaktionspartner',
};

export const tooltipBoxStyle = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
};

/**
 * Returns the shared CartesianGrid/XAxis/YAxis/ReferenceLine elements as a plain
 * array (not a wrapping component), since Recharts inspects the direct children
 * of BarChart/LineChart by type — a custom wrapper component would break that.
 */
export function renderChartAxes({ xDataKey, xTickFormatter, xProps, refLineDasharray }) {
  return [
    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" key="grid" />,
    <XAxis
      dataKey={xDataKey}
      tickFormatter={xTickFormatter}
      tick={{ fontSize: 12 }}
      key="x"
      {...xProps}
    />,
    <YAxis tickFormatter={euroAxisFormatter} tick={{ fontSize: 12 }} width={80} key="y" />,
    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray={refLineDasharray} key="ref" />,
  ];
}

/**
 * Tracks the last active chart index on click and resolves it to a month range
 * on double-click, so a chart can support "double-click to drill into that month".
 */
export function useMonthDrillDown(items, indexToRange, onDrill) {
  const lastIndexRef = useRef(null);

  function handleChartClick(data) {
    if (data?.activeTooltipIndex !== undefined) lastIndexRef.current = data.activeTooltipIndex;
  }

  function handleDoubleClick() {
    const idx = lastIndexRef.current;
    const item = idx != null ? items[idx] : null;
    if (!item) return;
    const range = indexToRange(item);
    if (range) onDrill(range);
  }

  return { handleChartClick, handleDoubleClick };
}
