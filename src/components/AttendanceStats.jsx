import React, { useEffect, useState, useMemo } from 'react';
import {
  subscribeToUsers,
  subscribeToAttendance,
  subscribeToSessions
} from '../services/firestore';
import { useI18n } from '../i18n/i18n';
import '../styles/AttendanceStats.css';

// Веса для взвешенного балла посещаемости
const WEIGHT_PRESENT = 1;     // вовремя
const WEIGHT_LATE = 0.5;      // опоздание
const INVALID_FACTOR = 0.5;   // нарушение дистанции — половина веса
const TREND_WINDOW = 5;       // сколько последних уроков берём для динамики
const ABSENCE_WARN = 3;       // серия пропусков подряд для предупреждения

// Числовые порядки для сортировки по колонкам
const RISK_SORT = { low: 0, medium: 1, high: 2 };
const TREND_SORT = { down: 0, flat: 1, up: 2 };

// Колонки таблицы и поле, по которому сортируем при клике на заголовок
const COLUMNS = [
  { key: 'name', labelKey: 'stats.colName' },
  { key: 'percent', labelKey: 'stats.colAttendance' },
  { key: 'late', labelKey: 'stats.colLate' },
  { key: 'trend', labelKey: 'stats.colTrend' },
  { key: 'risk', labelKey: 'stats.colRisk' }
];

// Сравнение двух строк по выбранной колонке
function compareBy(key, a, b) {
  switch (key) {
    case 'name':
      return (a.name || '').localeCompare(b.name || '');
    case 'percent':
      return a.percent - b.percent;
    case 'late':
      return a.late - b.late;
    case 'trend':
      return TREND_SORT[a.trend] - TREND_SORT[b.trend];
    case 'risk':
      return RISK_SORT[a.risk] - RISK_SORT[b.risk];
    default:
      return 0;
  }
}

// Уровень риска (ключ) по проценту посещаемости + серии пропусков; подпись — через t().
// Низкий риск = хорошая посещаемость, высокий = плохая.
function riskLevel(percent, absenceStreak) {
  if (absenceStreak >= ABSENCE_WARN) return 'high';
  if (percent >= 90) return 'low';
  if (percent >= 70) return 'medium';
  return 'high';
}

// Взвешенный балл по списку уроков (null, если уроков нет)
function scoreOf(sessionList, recMap) {
  if (sessionList.length === 0) return null;
  let weighted = 0;
  sessionList.forEach((s) => {
    const rec = recMap.get(s.id);
    if (!rec) return; // отсутствовал
    const factor = rec.valid ? 1 : INVALID_FACTOR;
    weighted += (rec.status === 'late' ? WEIGHT_LATE : WEIGHT_PRESENT) * factor;
  });
  return weighted / sessionList.length;
}

// Расчёт всех показателей по одному студенту
function computeStudentStats(user, sessionsAsc, recMap) {
  // Первый урок, на котором студент появился
  let firstSeen = Infinity;
  sessionsAsc.forEach((s) => {
    if (recMap.has(s.id) && s.startedAt < firstSeen) firstSeen = s.startedAt;
  });

  // Зачётные уроки: с момента первого появления (или все, если ни разу не был)
  const eligible =
    firstSeen === Infinity
      ? sessionsAsc
      : sessionsAsc.filter((s) => s.startedAt >= firstSeen);

  let weighted = 0;
  let attended = 0;
  let late = 0;
  let invalid = 0;

  eligible.forEach((s) => {
    const rec = recMap.get(s.id);
    if (!rec) return; // отсутствовал
    const factor = rec.valid ? 1 : INVALID_FACTOR;
    if (!rec.valid) invalid += 1;
    attended += 1;
    if (rec.status === 'late') {
      late += 1;
      weighted += WEIGHT_LATE * factor;
    } else {
      weighted += WEIGHT_PRESENT * factor;
    }
  });

  const eligibleCount = eligible.length;
  const percent = eligibleCount > 0 ? Math.round((weighted / eligibleCount) * 100) : 0;

  // Динамика: последние N уроков против остальных
  const recent = scoreOf(eligible.slice(-TREND_WINDOW), recMap);
  const earlier = scoreOf(eligible.slice(0, Math.max(0, eligibleCount - TREND_WINDOW)), recMap);
  let trend = 'flat';
  if (recent != null && earlier != null) {
    if (recent > earlier + 0.1) trend = 'up';
    else if (recent < earlier - 0.1) trend = 'down';
  }

  // Текущая серия пропусков подряд (с конца зачётных уроков)
  let absenceStreak = 0;
  for (let i = eligibleCount - 1; i >= 0; i--) {
    if (recMap.has(eligible[i].id)) break;
    absenceStreak += 1;
  }

  return {
    studentId: user.studentId,
    name: user.name,
    email: user.email,
    attended,
    late,
    invalid,
    percent,
    trend,
    absenceStreak,
    risk: riskLevel(percent, absenceStreak)
  };
}

const TREND_VIEW = {
  up: { symbol: '↑', titleKey: 'trend.up' },
  down: { symbol: '↓', titleKey: 'trend.down' },
  flat: { symbol: '→', titleKey: 'trend.flat' }
};

export default function AttendanceStats() {
  const { t } = useI18n();
  // Живые данные — обновляются сами при сидах и при сканировании студентами
  const [users, setUsers] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [sessions, setSessions] = useState(null);
  // Сортировка по клику на заголовок (по умолчанию — высокий риск сверху)
  const [sortKey, setSortKey] = useState('risk');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    const unsubUsers = subscribeToUsers(setUsers);
    const unsubAttendance = subscribeToAttendance(setAttendance);
    const unsubSessions = subscribeToSessions(setSessions);
    return () => {
      unsubUsers();
      unsubAttendance();
      unsubSessions();
    };
  }, []);

  const loading = users === null || attendance === null || sessions === null;

  // Пересчёт статистики при любом изменении данных
  const { rows, warnings, totalClasses } = useMemo(() => {
    if (loading) return { rows: [], warnings: [], totalClasses: 0 };

    // На каждую (email, sessionId) — одна запись со статусом и валидностью дистанции
    const byEmail = new Map();
    attendance.forEach((rec) => {
      if (!rec.email || !rec.sessionId) return;
      if (!byEmail.has(rec.email)) byEmail.set(rec.email, new Map());
      const m = byEmail.get(rec.email);
      if (!m.has(rec.sessionId)) {
        m.set(rec.sessionId, {
          status: rec.status,
          valid: rec.valid !== false // неизвестное считаем валидным
        });
      }
    });

    const statRows = users.map((u) =>
      computeStudentStats(u, sessions, byEmail.get(u.email) || new Map())
    );

    const warnList = statRows.filter((r) => r.absenceStreak >= ABSENCE_WARN);

    return { rows: statRows, warnings: warnList, totalClasses: sessions.length };
  }, [users, attendance, sessions, loading]);

  // Применяем выбранную сортировку поверх посчитанных строк
  const sortedRows = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return rows.slice().sort((a, b) => dir * compareBy(sortKey, a, b));
  }, [rows, sortKey, sortDir]);

  // Клик по заголовку: та же колонка — меняем направление, новая — задаём её
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  if (loading) {
    // Скелетон загрузки: карточки + строки таблицы
    return (
      <div className="stats-container">
        <div className="stats-cards">
          {[0, 1, 2, 3].map((i) => (
            <div className="stat-card" key={i}>
              <span className="skeleton skeleton-value" />
              <span className="skeleton skeleton-label" />
            </div>
          ))}
        </div>
        <div className="stats-skeleton-table">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="skeleton skeleton-row" key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Сводные показатели для карточек
  const totalStudents = rows.length;
  const avgPercent = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.percent, 0) / rows.length)
    : 0;
  const riskCount = rows.filter((r) => r.risk === 'high').length;

  return (
    <div className="stats-container">
      {/* KPI-карточки */}
      <div className="stats-cards">
        <div className="stat-card">
          <span className="stat-value">{totalStudents}</span>
          <span className="stat-label">{t('stats.cardStudents')}</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totalClasses}</span>
          <span className="stat-label">{t('stats.cardSessions')}</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{avgPercent}%</span>
          <span className="stat-label">{t('stats.cardAvg')}</span>
        </div>
        <div className={`stat-card ${riskCount > 0 ? 'danger' : ''}`}>
          <span className="stat-value">{riskCount}</span>
          <span className="stat-label">{t('stats.cardRisk')}</span>
        </div>
      </div>

      <table className="stats-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className="sortable"
                onClick={() => handleSort(col.key)}
              >
                {t(col.labelKey)}
                {sortKey === col.key && (
                  <span className="sort-arrow">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((r, idx) => {
            const tv = TREND_VIEW[r.trend];
            return (
              // Ключ по позиции: гарантирует корректную пересортировку даже при
              // одинаковых email/studentId в данных
              <tr key={idx}>
                <td className="stats-name">
                  <div className="student-name">{r.name}</div>
                  <div className="student-id">{r.studentId}</div>
                </td>
                <td>
                  <div className="bar-cell">
                    <div className="bar-track">
                      <div
                        className={`bar-fill ${r.risk}`}
                        style={{ width: `${r.percent}%` }}
                      />
                    </div>
                    <span className="bar-value">{r.percent}%</span>
                  </div>
                  {r.invalid > 0 && (
                    <span className="suspicious-note">{t('stats.suspicious', { n: r.invalid })}</span>
                  )}
                </td>
                <td>{r.late}</td>
                <td>
                  <span className={`trend ${r.trend}`} title={t(tv.titleKey)}>{tv.symbol}</span>
                </td>
                <td>
                  <span className={`risk-badge ${r.risk}`}>{t(`risk.${r.risk}`)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="stats-note">{t('stats.note')}</p>

      <div className="warnings-block">
        <h3 className="warnings-title">{t('stats.warnTitle', { n: ABSENCE_WARN })}</h3>
        {warnings.length === 0 ? (
          <p className="warnings-empty">{t('stats.warnEmpty')}</p>
        ) : (
          <ul className="warnings-list">
            {warnings.map((r) => (
              <li key={r.email || r.studentId}>
                {t('stats.warnItem', { name: r.name, id: r.studentId, n: r.absenceStreak })}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
