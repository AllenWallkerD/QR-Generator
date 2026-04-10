import React, { useEffect, useState, useRef } from 'react';
import { MdRefresh, MdDeleteSweep, MdFileDownload } from 'react-icons/md';
import { fetchAllAttendance, subscribeToAttendance, deleteAllAttendanceRecords } from '../services/firestore';
import '../styles/StudentDataTable.css';
import * as XLSX from 'xlsx';

function formatTimeOnly(date) {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export default function StudentDataTable() {
  const [attendanceList, setAttendanceList] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newIds, setNewIds] = useState(new Set());
  const knownIdsRef = useRef(new Set());

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
      await deleteAllAttendanceRecords();
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
        'Аты': item.name || '',
        'Студент ID': item.studentId || '',
        'Уақыт': timeText,
        'Арақашықтық (м)': item.distance != null ? Math.round(item.distance) : '',
        'Рұқсат етілген қашықтықта': item.valid ? 'Иә' : 'Жоқ'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Сабаққа Қатысу');
    XLSX.writeFile(workbook, 'attendance.xlsx');
  };

  return (
    <div className="table-container">
      <h2 className="table-title">Сабақтағы студенттер</h2>

      <div className="export-button-container">
        <button className="refresh-button" onClick={handleRefresh} title="Жаңарту">
          <MdRefresh />
        </button>
        <button
          className="clean-button"
          onClick={handleClearAll}
          disabled={isDeleting}
          title="Тазарту"
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
            Тазартуда...
          </p>
        </div>
      ) : (
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Аты</th>
              <th>Студент ID</th>
              <th>Уақыт</th>
              <th>Арақашықтық (м)</th>
            </tr>
          </thead>
          <tbody>
            {attendanceList.map((item) => {
              const { _id, name, studentId, scannedAt, valid, distance } = item;

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
                  <td>{distance != null ? Math.round(distance) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
