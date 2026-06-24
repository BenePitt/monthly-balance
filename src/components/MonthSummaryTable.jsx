import { memo } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatMonthYear } from '../utils/formatting';

function MonthSummaryTable() {
  const { periodStats } = useApp();
  const { months } = periodStats;

  if (months.length === 0) {
    return <p className="text-muted">Kein Zeitraum ausgewählt.</p>;
  }

  return (
    <div className="table-wrapper">
      <table className="transaction-table month-summary-table">
        <thead>
          <tr>
            <th>Monat</th>
            <th className="text-right">Einnahmen</th>
            <th className="text-right">Ausgaben</th>
            <th className="text-right">Bilanz</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={`${m.year}-${m.month}`} className={m.balance >= 0 ? 'month-row--positive' : 'month-row--negative'}>
              <td>{formatMonthYear(m.year, m.month)}</td>
              <td className="text-right tx-amount--income">{formatCurrency(m.income)}</td>
              <td className="text-right tx-amount--expense">{formatCurrency(m.expense)}</td>
              <td className={`text-right ${m.balance >= 0 ? 'tx-amount--income' : 'tx-amount--expense'}`}>
                {formatCurrency(m.balance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(MonthSummaryTable);
