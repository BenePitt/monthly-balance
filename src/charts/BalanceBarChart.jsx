import { useMemo } from 'react';
import { BarChart, Bar, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatMonthShort } from '../utils/formatting';
import { buildGroupedChartData } from '../domain/balanceCalculator';
import {
  CHART_COLORS,
  DIMENSION_LABELS,
  tooltipBoxStyle,
  renderChartAxes,
  useMonthDrillDown,
} from './chartShared';

function SingleBarTooltip({ active, payload, barGroupBy }) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  return (
    <div style={tooltipBoxStyle}>
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

  const { handleChartClick, handleDoubleClick } = useMonthDrillDown(
    months,
    (m) => ({ startYear: m.year, startMonth: m.month, endYear: m.year, endMonth: m.month }),
    (range) => dispatch({ type: 'SET_DATE_RANGE', payload: range })
  );

  const defaultData = useMemo(
    () =>
      months.map((m) => ({
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
          <BarChart
            data={defaultData}
            margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            onClick={handleChartClick}
          >
            {renderChartAxes({ xDataKey: 'name' })}
            <Tooltip
              formatter={(value, name) => [formatCurrency(value), name]}
              contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
            />
            <Legend />
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
        <BarChart
          data={data}
          margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
          onClick={handleChartClick}
        >
          {renderChartAxes({ xDataKey: 'name' })}
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
