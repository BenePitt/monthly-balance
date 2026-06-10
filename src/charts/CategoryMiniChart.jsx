import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { calculatePeriodStats } from '../domain/balanceCalculator';
import { formatCurrency, formatMonthShort, formatDate } from '../utils/formatting';
import { TYPE_LABELS, RECURRENCE_LABELS } from '../domain/transaction';

function euroAxisFormatter(value) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${value}`;
}

function TxTooltip({ tx, pos }) {
  if (!tx) return null;

  const style = {
    position: 'fixed',
    left: pos.x + 14,
    top: pos.y - 8,
    zIndex: 9999,
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    padding: '10px 14px',
    fontSize: 12,
    minWidth: 200,
    maxWidth: 300,
    pointerEvents: 'none',
  };

  return (
    <div style={style}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 12 }}>
        <span style={{ color: '#64748b' }}>{formatDate(tx.date)}</span>
        <span style={{
          fontWeight: 600,
          color: tx.type === 'income' ? '#16a34a' : '#dc2626',
        }}>
          {tx.type === 'expense' ? '−' : '+'}{formatCurrency(tx.amount)}
        </span>
      </div>
      {tx.purpose && (
        <div style={{ color: '#374151', marginBottom: 4, wordBreak: 'break-word' }}>
          {tx.purpose}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', color: '#64748b', marginTop: 4 }}>
        {tx.partner && <span>Partner: {tx.partner}</span>}
        <span>{TYPE_LABELS[tx.type]}</span>
        <span>{RECURRENCE_LABELS[tx.recurrence]}</span>
      </div>
    </div>
  );
}

export default function CategoryMiniChart({ category, transactions, dateRange }) {
  const { startYear, startMonth, endYear, endMonth } = dateRange;
  const [hoveredTx, setHoveredTx] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const categoryTransactions = useMemo(
    () => transactions.filter((t) => t.category === category),
    [transactions, category]
  );

  const periodStats = useMemo(
    () => calculatePeriodStats(categoryTransactions, startYear, startMonth, endYear, endMonth),
    [categoryTransactions, startYear, startMonth, endYear, endMonth]
  );

  const chartData = useMemo(
    () => periodStats.months.map((m) => ({
      name: formatMonthShort(m.year, m.month),
      Einnahmen: m.income,
      Ausgaben: m.expense,
      Bilanz: m.balance,
    })),
    [periodStats]
  );

  const recentTransactions = useMemo(() => {
    const inRange = categoryTransactions.filter((t) => {
      const [ty, tm] = t.date.split('-').map(Number);
      const txYM = ty * 12 + tm;
      return txYM >= startYear * 12 + startMonth && txYM <= endYear * 12 + endMonth;
    });
    return [...inRange]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [categoryTransactions, startYear, startMonth, endYear, endMonth]);

  function handleMouseEnter(t, e) {
    setHoveredTx(t);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }

  function handleMouseMove(e) {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }

  function handleMouseLeave() {
    setHoveredTx(null);
  }

  const lastMonth = periodStats.months.at(-1);

  return (
    <div className="category-mini-card">
      <h3 className="category-mini-title">{category}</h3>

      {lastMonth && (
        <div className="category-mini-stats">
          <span className="category-mini-stat category-mini-stat--income">
            +{formatCurrency(lastMonth.income)}
          </span>
          <span className="category-mini-stat category-mini-stat--expense">
            −{formatCurrency(lastMonth.expense)}
          </span>
          <span className="category-mini-stat category-mini-stat--balance">
            ={formatCurrency(lastMonth.balance)}
          </span>
        </div>
      )}

      <div className="category-mini-chart-wrap">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 6, right: 8, left: 0, bottom: 2 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={euroAxisFormatter} tick={{ fontSize: 10 }} width={40} />
            <Tooltip
              formatter={(value, name) => [formatCurrency(value), name]}
              contentStyle={{ borderRadius: '6px', fontSize: '11px' }}
            />
            <ReferenceLine y={0} stroke="#94a3b8" />
            <Bar dataKey="Einnahmen" fill="#22c55e" maxBarSize={14} radius={[2, 2, 0, 0]} />
            <Bar dataKey="Ausgaben" fill="#ef4444" maxBarSize={14} radius={[2, 2, 0, 0]} />
            <Bar dataKey="Bilanz" fill="#3b82f6" maxBarSize={14} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {recentTransactions.length > 0 && (
        <table className="category-mini-table">
          <tbody>
            {recentTransactions.map((t) => (
              <tr
                key={t.id}
                className={`category-mini-row category-mini-row--${t.type}`}
                onMouseEnter={(e) => handleMouseEnter(t, e)}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <td className="category-mini-date">{formatDate(t.date)}</td>
                <td className="category-mini-purpose">{t.purpose || t.partner || '–'}</td>
                <td className="category-mini-amount">
                  {t.type === 'expense' ? '−' : '+'}{formatCurrency(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {recentTransactions.length === 0 && (
        <p className="category-mini-empty">Keine Transaktionen im Zeitraum</p>
      )}

      <TxTooltip tx={hoveredTx} pos={tooltipPos} />
    </div>
  );
}
