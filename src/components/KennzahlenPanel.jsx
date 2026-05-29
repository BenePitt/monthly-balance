import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatting';

export default function KennzahlenPanel() {
  const { periodStats } = useApp();
  const { totalIncome, totalExpense, totalBalance, avgMonthlyBalance } = periodStats;

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
    </div>
  );
}

function KennzahlCard({ label, value, className }) {
  return (
    <div className={`kpi-card ${className}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}
