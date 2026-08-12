import { memo, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { calculateCurrentBalance } from '../domain/balanceCalculator';
import { formatCurrency } from '../utils/formatting';

function KennzahlenPanel() {
  const { periodStats, filteredTransactions, dateRange } = useApp();
  const { totalIncome, totalExpense, totalBalance, avgMonthlyBalance } = periodStats;
  const { endYear, endMonth } = dateRange;

  const currentBalance = useMemo(
    () => calculateCurrentBalance(filteredTransactions, endYear, endMonth),
    [filteredTransactions, endYear, endMonth]
  );

  return (
    <div className="kennzahlen-panel">
      <KennzahlCard
        label="Einnahmen gesamt"
        value={formatCurrency(totalIncome)}
        className="kpi-income"
      />
      <KennzahlCard
        label="Ausgaben gesamt"
        value={formatCurrency(totalExpense)}
        className="kpi-expense"
      />
      <KennzahlCard
        label="Bilanz"
        value={formatCurrency(totalBalance)}
        className={totalBalance >= 0 ? 'kpi-balance-pos' : 'kpi-balance-neg'}
      />
      <KennzahlCard
        label="Ø Monatsbilanz"
        value={formatCurrency(avgMonthlyBalance)}
        className={avgMonthlyBalance >= 0 ? 'kpi-balance-pos' : 'kpi-balance-neg'}
      />
      <KennzahlCard
        label="Kontostand"
        value={formatCurrency(currentBalance)}
        className={currentBalance >= 0 ? 'kpi-balance-pos' : 'kpi-balance-neg'}
      />
    </div>
  );
}

export default memo(KennzahlenPanel);

function KennzahlCard({ label, value, className }) {
  return (
    <div className={`kpi-card ${className}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}
