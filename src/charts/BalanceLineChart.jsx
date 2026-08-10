import { useMemo } from 'react';
import { LineChart, Line, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useApp } from '../context/AppContext';
import {
  calculateDailyPeriodStats,
  calculateStartBalanceFromCurrentBalance,
} from '../domain/balanceCalculator';
import { formatCurrency, formatDate } from '../utils/formatting';
import { renderChartAxes, useMonthDrillDown } from './chartShared';

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
    dispatch,
  } = useApp();
  const { startYear, startMonth, endYear, endMonth } = dateRange;

  const effectiveStartBalance = useMemo(() => {
    if (lineChartBalanceMode !== 'current') return lineChartStartBalance;
    return calculateStartBalanceFromCurrentBalance(
      filteredTransactions,
      startYear,
      startMonth,
      endYear,
      endMonth,
      lineChartCurrentBalance
    );
  }, [
    lineChartBalanceMode,
    lineChartStartBalance,
    filteredTransactions,
    startYear,
    startMonth,
    endYear,
    endMonth,
    lineChartCurrentBalance,
  ]);

  const data = useMemo(() => {
    const stats = calculateDailyPeriodStats(
      filteredTransactions,
      startYear,
      startMonth,
      endYear,
      endMonth,
      effectiveStartBalance
    );
    return stats.days.map((day) => ({
      name: day.date,
      Einnahmen: day.income,
      Ausgaben: day.expense,
      Bilanz: day.balance,
    }));
  }, [filteredTransactions, startYear, startMonth, endYear, endMonth, effectiveStartBalance]);

  const { handleChartClick, handleDoubleClick } = useMonthDrillDown(
    data,
    (day) => {
      const [yearStr, monthStr] = day.name.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);
      return { startYear: year, startMonth: month, endYear: year, endMonth: month };
    },
    (range) => dispatch({ type: 'SET_DATE_RANGE', payload: range })
  );

  const showDots = data.length <= 45;

  if (data.length === 0) {
    return <div className="chart-empty">Kein Zeitraum ausgewählt.</div>;
  }

  return (
    <div onDoubleClick={handleDoubleClick} style={{ cursor: 'pointer' }}>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
          onClick={handleChartClick}
        >
          {renderChartAxes({
            xDataKey: 'name',
            xTickFormatter: formatAxisDate,
            xProps: { minTickGap: 24 },
            refLineDasharray: '4 4',
          })}
          <Tooltip
            labelFormatter={(value) => formatDate(value)}
            formatter={(value, name) => [formatCurrency(value), name]}
            contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
          />
          <Legend />
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
    </div>
  );
}
