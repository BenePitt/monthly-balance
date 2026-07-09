import { useMemo, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatMonthShort, euroAxisFormatter } from '../utils/formatting';
import { buildGroupedChartData } from '../domain/balanceCalculator';

const CHART_COLORS = [
  '#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

const DIMENSION_LABELS = {
  category: 'Kategorie',
  purpose: 'Verwendungszweck',
  partner: 'Transaktionspartner',
};

function euroTooltipFormatter(value) {
  return [formatCurrency(value), ''];
}

function SingleBarTooltip({ active, payload, barGroupBy }) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '13px',
    }}>
      <div style={{ color: '#64748b', marginBottom: 4 }}>{DIMENSION_LABELS[barGroupBy]}</div>
      <div style={{ fontWeight: 600, color: entry.color }}>
        {entry.name}: {formatCurrency(entry.value)}
      </div>
    </div>
  );
}

export default function BalanceBarChart() {
  const { periodStats, barGroupBy, dispatch } = useApp();
  const { months } = periodStats;
  const lastIndexRef = useRef(null);

  function handleChartClick(data) {
    if (data?.activeTooltipIndex !== undefined) lastIndexRef.current = data.activeTooltipIndex;
  }

  function handleDoubleClick() {
    const idx = lastIndexRef.current;
    if (idx != null && months[idx]) {
      const { year, month } = months[idx];
      dispatch({ type: 'SET_DATE_RANGE', payload: { startYear: year, startMonth: month, endYear: year, endMonth: month } });
    }
  }

  const defaultData = useMemo(
    () => months.map((m) => ({
      name: formatMonthShort(m.year, m.month),
      Einnahmen: m.income,
      Ausgaben: m.expense,
      Bilanz: m.balance,
    })),
    [months]
  );

  const groupedChartResult = useMemo(() => {
    if (!barGroupBy) return null;
    const { series } = buildGroupedChartData(periodStats, barGroupBy);
    const data = months.map((m, i) => {
      const entry = { name: formatMonthShort(m.year, m.month) };
      for (const s of series) {
        entry[s.name] = s.data[i];
      }
      return entry;
    });
    return { series, data };
  }, [periodStats, barGroupBy, months]);

  if (months.length === 0) {
    return <div className="chart-empty">Kein Zeitraum ausgewählt.</div>;
  }

  // Default: 3 bars per month (Einnahmen, Ausgaben, Bilanz)
  if (!barGroupBy) {
    return (
      <div onDoubleClick={handleDoubleClick} style={{ cursor: 'pointer' }}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={defaultData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }} onClick={handleChartClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={euroAxisFormatter} tick={{ fontSize: 12 }} width={80} />
            <Tooltip
              formatter={(value, name) => [formatCurrency(value), name]}
              contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
            />
            <Legend />
            <ReferenceLine y={0} stroke="#94a3b8" />
            <Bar dataKey="Einnahmen" fill="#22c55e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Ausgaben" fill="#ef4444" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Bilanz" fill="#3b82f6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Grouped: one series per unique dimension value, net amount per month
  const { series, data } = groupedChartResult;
  const isSingleMonth = months.length === 1;

  return (
    <div onDoubleClick={handleDoubleClick} style={{ cursor: 'pointer' }}>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }} onClick={handleChartClick}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={euroAxisFormatter} tick={{ fontSize: 12 }} width={80} />
          {isSingleMonth ? (
            <Tooltip
              shared={false}
              content={(props) => <SingleBarTooltip {...props} barGroupBy={barGroupBy} />}
            />
          ) : (
            <Tooltip
              formatter={(value, name) => [formatCurrency(value), name]}
              contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
            />
          )}
          <Legend />
          <ReferenceLine y={0} stroke="#94a3b8" />
          {series.map((s, i) => (
            <Bar
              key={s.name}
              dataKey={s.name}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
