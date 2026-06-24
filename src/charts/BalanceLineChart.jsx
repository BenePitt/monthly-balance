import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useApp } from '../context/AppContext';
import {
  calculateDailyPeriodStats,
  calculateStartBalanceFromCurrentBalance,
} from '../domain/balanceCalculator';
import { formatCurrency, formatDate, euroAxisFormatter } from '../utils/formatting';

function formatAxisDate(isoDate) {
  const [, month, day] = isoDate.split('-');
  return `${day}.${month}.`;
}

export default function BalanceLineChart() {
  const {
    filteredTransactions,
    dateRange,
    lineChartBalanceMode,
    lineChartStartBalance,
    lineChartCurrentBalance,
  } = useApp();
  const { startYear, startMonth, endYear, endMonth } = dateRange;

  const effectiveStartBalance = useMemo(() => {
    if (lineChartBalanceMode !== 'current') return lineChartStartBalance;
    return calculateStartBalanceFromCurrentBalance(
      filteredTransactions, startYear, startMonth, endYear, endMonth, lineChartCurrentBalance
    );
  }, [lineChartBalanceMode, lineChartStartBalance, filteredTransactions, startYear, startMonth, endYear, endMonth, lineChartCurrentBalance]);

  const data = useMemo(() => {
    const stats = calculateDailyPeriodStats(
      filteredTransactions, startYear, startMonth, endYear, endMonth, effectiveStartBalance
    );
    return stats.days.map((day) => ({
      name: day.date,
      Einnahmen: day.income,
      Ausgaben: day.expense,
      Bilanz: day.balance,
    }));
  }, [filteredTransactions, startYear, startMonth, endYear, endMonth, effectiveStartBalance]);

  const showDots = data.length <= 45;

  if (data.length === 0) {
    return <div className="chart-empty">Kein Zeitraum ausgewählt.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="name"
          tickFormatter={formatAxisDate}
          tick={{ fontSize: 12 }}
          minTickGap={24}
        />
        <YAxis tickFormatter={euroAxisFormatter} tick={{ fontSize: 12 }} width={80} />
        <Tooltip
          labelFormatter={(value) => formatDate(value)}
          formatter={(value, name) => [formatCurrency(value), name]}
          contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
        />
        <Legend />
        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
        <Line
          type="linear"
          dataKey="Einnahmen"
          stroke="#22c55e"
          strokeWidth={2.5}
          dot={showDots ? { r: 3 } : false}
          activeDot={{ r: 6 }}
        />
        <Line
          type="linear"
          dataKey="Ausgaben"
          stroke="#ef4444"
          strokeWidth={2.5}
          dot={showDots ? { r: 3 } : false}
          activeDot={{ r: 6 }}
        />
        <Line
          type="linear"
          dataKey="Bilanz"
          stroke="#3b82f6"
          strokeWidth={3}
          dot={showDots ? { r: 3.5 } : false}
          activeDot={{ r: 7 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
