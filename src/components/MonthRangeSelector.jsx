import { useApp } from '../context/AppContext';
import { toMonthInputValue, fromMonthInputValue } from '../utils/formatting';

export default function MonthRangeSelector() {
  const { dateRange, dispatch, transactions } = useApp();
  const { startYear, startMonth, endYear, endMonth } = dateRange;

  const startValue = toMonthInputValue(startYear, startMonth);
  const endValue = toMonthInputValue(endYear, endMonth);

  function handleStartChange(e) {
    const { year, month } = fromMonthInputValue(e.target.value);
    const newStart = year * 12 + month;
    const currentEnd = endYear * 12 + endMonth;
    if (newStart > currentEnd) {
      dispatch({ type: 'SET_DATE_RANGE', payload: { startYear: year, startMonth: month, endYear: year, endMonth: month } });
    } else {
      dispatch({ type: 'SET_DATE_RANGE', payload: { startYear: year, startMonth: month } });
    }
  }

  function handleEndChange(e) {
    const { year, month } = fromMonthInputValue(e.target.value);
    const currentStart = startYear * 12 + startMonth;
    const newEnd = year * 12 + month;
    if (newEnd < currentStart) {
      dispatch({ type: 'SET_DATE_RANGE', payload: { startYear: year, startMonth: month, endYear: year, endMonth: month } });
    } else {
      dispatch({ type: 'SET_DATE_RANGE', payload: { endYear: year, endMonth: month } });
    }
  }

  function setPreset(preset) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;

    let sY = y, sM = m, eY = y, eM = m;

    if (preset === 'current') {
      sY = y; sM = m; eY = y; eM = m;
    } else if (preset === '3months') {
      let start = m - 2;
      sY = start <= 0 ? y - 1 : y;
      sM = start <= 0 ? 12 + start : start;
      eY = y; eM = m;
    } else if (preset === '6months') {
      let start = m - 5;
      sY = start <= 0 ? y - 1 : y;
      sM = start <= 0 ? 12 + start : start;
      eY = y; eM = m;
    } else if (preset === 'year') {
      sY = y; sM = 1; eY = y; eM = 12;
    }

    dispatch({ type: 'SET_DATE_RANGE', payload: { startYear: sY, startMonth: sM, endYear: eY, endMonth: eM } });
  }

  function setAll() {
    if (transactions.length === 0) return;
    const dates = transactions.map((t) => t.date);
    const min = dates.reduce((a, b) => (a < b ? a : b));
    const max = dates.reduce((a, b) => (a > b ? a : b));
    const [sY, sM] = min.split('-').map(Number);
    const [eY, eM] = max.split('-').map(Number);
    dispatch({ type: 'SET_DATE_RANGE', payload: { startYear: sY, startMonth: sM, endYear: eY, endMonth: eM } });
  }

  return (
    <div className="month-range-selector">
      <div className="month-range-fields">
        <label className="form-label">
          Von
          <input
            type="month"
            className="form-input"
            value={startValue}
            onChange={handleStartChange}
          />
        </label>
        <label className="form-label">
          Bis
          <input
            type="month"
            className="form-input"
            value={endValue}
            min={startValue}
            onChange={handleEndChange}
          />
        </label>
      </div>
      <div className="month-range-presets">
        <button className="btn btn-sm btn-outline" onClick={() => setPreset('current')}>Aktueller Monat</button>
        <button className="btn btn-sm btn-outline" onClick={() => setPreset('3months')}>Letzte 3 Monate</button>
        <button className="btn btn-sm btn-outline" onClick={() => setPreset('6months')}>Letzte 6 Monate</button>
        <button className="btn btn-sm btn-outline" onClick={() => setPreset('year')}>Aktuelles Jahr</button>
        <button
          className="btn btn-sm btn-outline"
          onClick={setAll}
          disabled={transactions.length === 0}
        >
          Alles
        </button>
      </div>
    </div>
  );
}
