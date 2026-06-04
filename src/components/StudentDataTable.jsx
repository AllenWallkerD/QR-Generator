import React, { useEffect, useState, useRef } from 'react';
import { MdRefresh, MdDeleteSweep, MdFileDownload, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { fetchAllAttendance, subscribeToAttendance, deleteAllAttendanceRecords, deleteAllSessions } from '../services/firestore';
import { useI18n } from '../i18n/i18n';
import '../styles/StudentDataTable.css';
import * as XLSX from 'xlsx';

function formatTimeOnly(date) {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

// Локализованная подпись статуса посещения
function statusLabel(status, t) {
  if (status === 'present') return t('status.present');
  if (status === 'late') return t('status.late');
  return '—';
}

const PAGE_SIZE = 10; // строк на страницу

export default function StudentDataTable() {
  const { t } = useI18n();
  const [attendanceList, setAttendanceList] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newIds, setNewIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const knownIdsRef = useRef(new Set());

  // Если данных стало меньше — не «зависаем» на несуществующей странице
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(attendanceList.length / PAGE_SIZE));
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [attendanceList.length]);

  useEffect(() => {
    const unsubscribe = subscribeToAttendance((data) => {
      const incoming = new Set(data.map((d) => d._id));
      const fresh = new Set();
      incoming.forEach((id) => {
        if (!knownIdsRef.current.has(id)) {
          fresh.add(id);
        }
      });
      knownIdsRef.current = incoming;
      if (fresh.size > 0) {
        setNewIds(fresh);
        setTimeout(() => setNewIds(new Set()), 600);
      }
      setAttendanceList(data);
      setLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  const handleRefresh = async () => {
    try {
      const data = await fetchAllAttendance();
      setAttendanceList(data);
      knownIdsRef.current = new Set(data.map((d) => d._id));
    } catch {}
  };

  const handleClearAll = async () => {
    setIsDeleting(true);
    try {
      // Чистим и посещения, и сессии, чтобы статистика не оставалась «грязной»
      await Promise.all([deleteAllAttendanceRecords(), deleteAllSessions()]);
      knownIdsRef.current = new Set();
    } catch {}
    setIsDeleting(false);
  };

  const handleExportExcel = () => {
    const exportData = attendanceList.map((item) => {
      const dateObj = item.scannedAt
        ? (item.scannedAt.toDate ? item.scannedAt.toDate() : new Date(item.scannedAt))
        : null;
      const timeText = dateObj ? formatTimeOnly(dateObj) : '';

      return {
        [t('table.name')]: item.name || '',
        [t('table.studentId')]: item.studentId || '',
        [t('table.time')]: timeText,
        [t('table.status')]: statusLabel(item.status, t),
        [t('table.distance')]: item.distance != null ? Math.round(item.distance) : '',
        [t('export.allowed')]: item.valid ? t('export.yes') : t('export.no')
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t('export.sheet'));
    XLSX.writeFile(workbook, 'attendance.xlsx');
  };

  // Пагинация: показываем только строки текущей страницы
  const totalPages = Math.max(1, Math.ceil(attendanceList.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageRows = attendanceList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="table-container">
      <h2 className="table-title">{t('table.title')}</h2>

      <div className="export-button-container">
        <button className="refresh-button" onClick={handleRefresh} title={t('table.refresh')}>
          <MdRefresh />
        </button>
        <button
          className="clean-button"
          onClick={handleClearAll}
          disabled={isDeleting}
          title={t('table.clear')}
        >
          <MdDeleteSweep />
        </button>
        <button className="export-button" onClick={handleExportExcel}>
          <MdFileDownload style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Excel
        </button>
      </div>

      {isDeleting ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '200px'
          }}
        >
          <p
            style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#fff'
            }}
          >
            {t('table.clearing')}
          </p>
        </div>
      ) : !loaded ? (
        <div className="table-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="skeleton skeleton-row" key={i} />
          ))}
        </div>
      ) : (
        <table className="attendance-table">
          <thead>
            <tr>
              <th>{t('table.name')}</th>
              <th>{t('table.studentId')}</th>
              <th>{t('table.time')}</th>
              <th>{t('table.status')}</th>
              <th>{t('table.distance')}</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((item) => {
              const { _id, name, studentId, scannedAt, valid, distance, status } = item;

              let timeText = '';
              if (scannedAt) {
                const d = scannedAt.toDate ? scannedAt.toDate() : new Date(scannedAt);
                timeText = formatTimeOnly(d);
              }
              const v = valid ? 'yes' : 'no';
              const isNew = newIds.has(_id);

              return (
                <tr key={_id} className={isNew ? 'row-new' : ''}>
                  <td className="name-cell">
                    <span className={`valid-indicator ${v}`} />
                    <span className="name-text">{name}</span>
                  </td>
                  <td>{studentId}</td>
                  <td>{timeText}</td>
                  <td>{statusLabel(status, t)}</td>
                  <td>{distance != null ? Math.round(distance) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {!isDeleting && loaded && totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            title={t('table.prev')}
          >
            <MdChevronLeft />
          </button>
          <span className="page-info">{safePage} / {totalPages}</span>
          <button
            className="page-btn"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            title={t('table.next')}
          >
            <MdChevronRight />
          </button>
        </div>
      )}
    </div>
  );
}
