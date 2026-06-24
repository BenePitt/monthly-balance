import { useMemo, useState, useCallback } from 'react';
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
  Customized,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatMonthShort, euroAxisFormatter } from '../utils/formatting';

const CHART_COLORS = [
  '#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

function buildTrendData(months, type) {
  const allCategories = new Set();
  for (const m of months) {
    for (const t of m.transactions) {
      allCategories.add(t.category || '(unbekannt)');
    }
  }
  const categories = Array.from(allCategories);

  const data = months.map((m) => {
    const entry = { name: formatMonthShort(m.year, m.month) };
    for (const cat of categories) {
      let value = 0;
      for (const t of m.transactions) {
        const k = t.category || '(unbekannt)';
        if (k !== cat) continue;
        if (type === 'income' && t.type === 'income') value += t.amount;
        else if (type === 'expense' && t.type === 'expense') value += t.amount;
      }
      entry[cat] = value;
    }
    return entry;
  });

  return { data, categories };
}

function SankeyConnectors({ formattedGraphicalItems, colors }) {
  if (!formattedGraphicalItems?.length) return null;

  const numMonths = formattedGraphicalItems[0]?.props?.data?.length ?? 0;
  if (numMonths < 2) return null;

  const paths = [];

  for (let mi = 0; mi < numMonths - 1; mi++) {
    for (let ci = 0; ci < formattedGraphicalItems.length; ci++) {
      const series = formattedGraphicalItems[ci];
      const left = series?.props?.data?.[mi];
      const right = series?.props?.data?.[mi + 1];

      if (!left || !right) continue;
      if (!(left.height > 0) || !(right.height > 0)) continue;

      const x1 = left.x + left.width;
      const x2 = right.x;
      const mx = (x1 + x2) / 2;
      const y1t = left.y;
      const y1b = left.y + left.height;
      const y2t = right.y;
      const y2b = right.y + right.height;

      const d = [
        `M ${x1} ${y1t}`,
        `C ${mx} ${y1t} ${mx} ${y2t} ${x2} ${y2t}`,
        `L ${x2} ${y2b}`,
        `C ${mx} ${y2b} ${mx} ${y1b} ${x1} ${y1b}`,
        'Z',
      ].join(' ');

      paths.push(
        <path
          key={`ribbon-${mi}-${ci}`}
          d={d}
          fill={colors[ci % colors.length]}
          fillOpacity={0.3}
          stroke="none"
        />
      );
    }
  }

  return <g>{paths}</g>;
}

function TrendTooltip({ active, payload, label, hoveredCat }) {
  if (!active || !payload?.length || !hoveredCat) return null;
  const entry = payload.find((p) => p.dataKey === hoveredCat);
  if (!entry || entry.value === 0) return null;

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 13,
    }}>
      <p style={{ margin: 0, color: '#64748b', marginBottom: 4 }}>{label}</p>
      <p style={{ margin: 0, fontWeight: 600, color: entry.fill }}>
        {entry.dataKey}: {formatCurrency(entry.value)}
      </p>
    </div>
  );
}

function TrendPanel({ title, months, type, colors }) {
  const [hoveredCat, setHoveredCat] = useState(null);

  const { data, categories } = useMemo(
    () => buildTrendData(months, type),
    [months, type]
  );

  const handleMouseEnter = useCallback((cat) => () => setHoveredCat(cat), []);
  const handleMouseLeave = useCallback(() => setHoveredCat(null), []);

  if (months.length === 0) return null;

  return (
    <div className="verlauf-panel">
      <h3 className="verlauf-panel-title">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={euroAxisFormatter} tick={{ fontSize: 12 }} width={80} />
          <Tooltip content={<TrendTooltip hoveredCat={hoveredCat} />} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Customized component={(props) => (
            <SankeyConnectors {...props} colors={colors} />
          )} />
          {categories.map((cat, i) => (
            <Bar
              key={`bar-${cat}`}
              dataKey={cat}
              stackId="stack"
              fill={colors[i % colors.length]}
              maxBarSize={40}
              onMouseEnter={handleMouseEnter(cat)}
              onMouseLeave={handleMouseLeave}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SimpleBalancePanel({ months }) {
  const data = useMemo(
    () => months.map((m) => ({
      name: formatMonthShort(m.year, m.month),
      Einnahmen: m.income,
      Ausgaben: m.expense,
      Bilanz: m.balance,
    })),
    [months]
  );

  return (
    <div className="verlauf-panel">
      <h3 className="verlauf-panel-title">Bilanz</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
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

export default function BalanceStackedTrendChart() {
  const { periodStats } = useApp();
  const { months } = periodStats;

  if (months.length === 0) {
    return <div className="chart-empty">Kein Zeitraum ausgewählt.</div>;
  }

  return (
    <div className="verlauf-charts">
      <TrendPanel title="Einnahmen" months={months} type="income" colors={CHART_COLORS} />
      <TrendPanel title="Ausgaben" months={months} type="expense" colors={CHART_COLORS} />
      <SimpleBalancePanel months={months} />
    </div>
  );
}
