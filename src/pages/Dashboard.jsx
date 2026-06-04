import React, { useState } from 'react';
import { MdLocationOn, MdQrCode2 } from 'react-icons/md';
import QRGenerator from '../components/QRGenerator';
import StudentDataTable from '../components/StudentDataTable';
import { useGenerator } from '../context/GeneratorContext';
import { useI18n } from '../i18n/i18n';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const { t } = useI18n();
  const { active, startSession } = useGenerator();
  const [geoAllowed, setGeoAllowed] = useState(false);
  // В состоянии храним КЛЮЧ ошибки, перевод делаем при рендере (чтобы реагировал на смену языка)
  const [geoErrorKey, setGeoErrorKey] = useState('');

  const handleAllowGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setGeoAllowed(true);
          setGeoErrorKey('');
        },
        (err) => {
          // Разные коды ошибки геолокации — разные причины
          let key;
          if (err.code === err.PERMISSION_DENIED) {
            key = 'geo.denied';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            key = 'geo.unavailable';
          } else if (err.code === err.TIMEOUT) {
            key = 'geo.timeout';
          } else {
            key = 'geo.error';
          }
          setGeoErrorKey(key);
          setGeoAllowed(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setGeoErrorKey('geo.unsupported');
      setGeoAllowed(false);
    }
  };

  const handleMakeQR = () => {
    if (!geoAllowed) {
      setGeoErrorKey('geo.needFirst');
      return;
    }
    setGeoErrorKey('');
    startSession();
  };

  return (
    <div className="dashboard-container">
      <main className="dashboard-main">
        <div style={{ marginBottom: '20px' }}>
          <button
            className="geo-button"
            onClick={handleAllowGeolocation}
            disabled={geoAllowed}
          >
            <MdLocationOn style={{ verticalAlign: 'middle', marginRight: 6 }} />
            {t('geo.allow')}
          </button>
          {!active && (
            <>
              <button
                className="qr-button"
                onClick={handleMakeQR}
                disabled={!geoAllowed}
                style={{ marginLeft: '10px' }}
              >
                <MdQrCode2 style={{ verticalAlign: 'middle', marginRight: 6 }} />
                {t('geo.makeQR')}
              </button>
              {geoErrorKey && (
                <p style={{ color: 'red', marginTop: '8px' }}>{t(geoErrorKey)}</p>
              )}
            </>
          )}
          {active && <QRGenerator />}
        </div>

        <h2 className="section-title">{t('dashboard.tableTitle')}</h2>
        <div className="attendance-container">
          <StudentDataTable />
        </div>
      </main>
    </div>
  );
}
