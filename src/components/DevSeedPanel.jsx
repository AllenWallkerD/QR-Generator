import React, { useState } from 'react';
import { MdClose } from 'react-icons/md';
import { seedRealistic } from '../services/devSeed';
import '../styles/DevSeedPanel.css';

// Скрытая панель сида. Открывается тайным тапом по логотипу (см. Sidebar).
// Один сид: чистит прошлые данные и пишет реалистичный набор записей, из которых
// сами собой считаются и таблица на главной, и статистика.
export default function DevSeedPanel({ onClose }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setStatus('Жүктелуде...');
    try {
      const r = await seedRealistic();
      if (r.error === 'no-users') {
        setStatus('Алдымен студенттерді тіркеңіз');
      } else {
        setStatus(`✓ ${r.students} студент · ${r.sessions} сабақ · ${r.attendance} жазба`);
      }
    } catch (e) {
      console.error(e);
      setStatus('Қате (консольды қараңыз)');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dev-panel">
      <div className="dev-panel-head">
        <span className="dev-panel-title">SEED</span>
        <button className="dev-panel-close" onClick={onClose} title="Жабу">
          <MdClose />
        </button>
      </div>

      <button className="dev-panel-btn seed2" disabled={busy} onClick={run}>
        Демо деректерді жасау
      </button>

      {status && <div className="dev-panel-status">{status}</div>}
    </div>
  );
}
