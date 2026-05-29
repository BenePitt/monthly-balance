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
import { formatCurrency, formatDate } from '../utils/formatting';

function euroAxisFormatter(value) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k €`;
  return `${value} €`;
}

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
  const effectiveStartBalance = lineChartBalanceMode === 'current'
    ? calculateStartBalanceFromCurrentBalance(
      filteredTransactions,
      startYear,
      startMonth,
      endYear,
      endMonth,
      lineChartCurrentBalance
    )
    : lineChartStartBalance;
  const dailyStats = calculateDailyPeriodStats(
    filteredTransactions,
    startYear,
    startMonth,
    endYear,
    endMonth,
    effectiveStartBalance
  );
  const { days } = dailyStats;

  if (days.length === 0) {
    return <div className="chart-empty">Kein Zeitraum ausgewählt.</div>;
  }

  const data = days.map((day) => ({
    name: day.date,
    Einnahmen: day.income,
    Ausgaben: day.expense,
    Bilanz: day.balance,
  }));
  const showDots = data.length <= 45;

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
