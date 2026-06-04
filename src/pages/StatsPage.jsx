import React from 'react';
import AttendanceStats from '../components/AttendanceStats';
import { useI18n } from '../i18n/i18n';
import '../styles/Dashboard.css';

// Отдельная страница статистики (открывается по маршруту /stats).
// AttendanceStats сам загружает данные при монтировании.
export default function StatsPage() {
  const { t } = useI18n();
  return (
    <div className="dashboard-container">
      <main className="dashboard-main">
        <h2 className="section-title">{t('stats.pageTitle')}</h2>
        <div className="attendance-container">
          <AttendanceStats />
        </div>
      </main>
    </div>
  );
}
