import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import BalanceBarChart from './BalanceBarChart';
import BalanceLineChart from './BalanceLineChart';
import BalanceStackedTrendChart from './BalanceStackedTrendChart';
import { calculateStartBalanceFromCurrentBalance } from '../domain/balanceCalculator';
import { formatCurrency } from '../utils/formatting';

const GROUP_OPTIONS = [
  { value: null, label: 'Standard (Einnahmen / Ausgaben / Bilanz)' },
  { value: 'category', label: 'Nach Kategorie' },
  { value: 'partner', label: 'Nach Transaktionspartner' },
];

export default function ChartContainer({ showGroupingOptions = false }) {
  const {
    chartType,
    barGroupBy,
    lineChartBalanceMode,
    lineChartStartBalance,
    lineChartCurrentBalance,
    filteredTransactions,
    dateRange,
    dispatch,
  } = useApp();
  const { startYear, startMonth, endYear, endMonth } = dateRange;
  const calculatedStartBalance = useMemo(() => calculateStartBalanceFromCurrentBalance(
    filteredTransactions,
    startYear,
    startMonth,
    endYear,
    endMonth,
    lineChartCurrentBalance
  ), [filteredTransactions, startYear, startMonth, endYear, endMonth, lineChartCurrentBalance]);

  function handleStartBalanceChange(event) {
    const value = event.target.value;
    const parsed = Number(value);
    dispatch({
      type: 'SET_LINE_CHART_START_BALANCE',
      payload: value === '' || !Number.isFinite(parsed) ? 0 : parsed,
    });
  }

  function handleCurrentBalanceChange(event) {
    const value = event.target.value;
    const parsed = Number(value);
    dispatch({
      type: 'SET_LINE_CHART_CURRENT_BALANCE',
      payload: value === '' || !Number.isFinite(parsed) ? 0 : parsed,
    });
  }

  return (
    <div className="chart-container">
      <div className="chart-controls">
        <div className="chart-type-toggle">
          <button
            className={`btn btn-sm${chartType === 'bar' ? ' btn-primary' : ' btn-outline'}`}
            onClick={() => dispatch({ type: 'SET_CHART_TYPE', payload: 'bar' })}
          >
            Säulendiagramm
          </button>
          <button
            className={`btn btn-sm${chartType === 'line' ? ' btn-primary' : ' btn-outline'}`}
            onClick={() => dispatch({ type: 'SET_CHART_TYPE', payload: 'line' })}
          >
            Liniendiagramm
          </button>
          <button
            className={`btn btn-sm${chartType === 'verlauf' ? ' btn-primary' : ' btn-outline'}`}
            onClick={() => dispatch({ type: 'SET_CHART_TYPE', payload: 'verlauf' })}
          >
            Verlauf
          </button>
        </div>

        {showGroupingOptions && chartType === 'bar' && (
          <div className="chart-grouping">
            <label className="form-label" style={{ marginBottom: 0 }}>
              Gruppierung:
              <select
                className="form-input form-select"
                value={barGroupBy ?? ''}
                onChange={(e) => dispatch({
                  type: 'SET_BAR_GROUP_BY',
                  payload: e.target.value || null,
                })}
              >
                {GROUP_OPTIONS.map((opt) => (
                  <option key={String(opt.value)} value={opt.value ?? ''}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {chartType === 'line' && (
          <div className="chart-balance-control">
            <div className="radio-group">
              <label className={`radio-option${lineChartBalanceMode === 'start' ? ' radio-option--active' : ''}`}>
                <input
                  type="radio"
                  name="line-chart-balance-mode"
                  checked={lineChartBalanceMode === 'start'}
                  onChange={() => dispatch({ type: 'SET_LINE_CHART_BALANCE_MODE', payload: 'start' })}
                />
                Startkontostand
              </label>
              <label className={`radio-option${lineChartBalanceMode === 'current' ? ' radio-option--active' : ''}`}>
                <input
                  type="radio"
                  name="line-chart-balance-mode"
                  checked={lineChartBalanceMode === 'current'}
                  onChange={() => dispatch({ type: 'SET_LINE_CHART_BALANCE_MODE', payload: 'current' })}
                />
                Aktueller Kontostand
              </label>
            </div>

            {lineChartBalanceMode === 'start' ? (
              <label className="form-label" style={{ marginBottom: 0 }}>
                Startkontostand:
                <input
                  type="number"
                  className="form-input"
                  step="0.01"
                  value={lineChartStartBalance}
                  onChange={handleStartBalanceChange}
                />
              </label>
            ) : (
              <>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Aktueller Kontostand:
                  <input
                    type="number"
                    className="form-input"
                    step="0.01"
                    value={lineChartCurrentBalance}
                    onChange={handleCurrentBalanceChange}
                  />
                </label>
                <span className="chart-balance-note">
                  Start: {formatCurrency(calculatedStartBalance)}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="chart-body">
        {chartType === 'bar' ? <BalanceBarChart /> :
         chartType === 'verlauf' ? <BalanceStackedTrendChart /> :
         <BalanceLineChart />}
      </div>
    </div>
  );
}
