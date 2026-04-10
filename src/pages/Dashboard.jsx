import React, { useState } from 'react';
import { MdLocationOn, MdQrCode2 } from 'react-icons/md';
import QRGenerator from '../components/QRGenerator';
import StudentDataTable from '../components/StudentDataTable';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const [geoAllowed, setGeoAllowed] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [geoError, setGeoError] = useState('');

  const handleAllowGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setGeoAllowed(true);
          setGeoError('');
        },
        () => {
          setGeoError('Пайдаланушы геолокация рұқсатынан бас тартты.');
          setGeoAllowed(false);
        }
      );
    } else {
      setGeoError('Бұл браузер геолокацияны қолдамайды.');
      setGeoAllowed(false);
    }
  };

  const handleRetrieve = () => {
    setShowQR(false);
  };

  const handleMakeQR = () => {
    if (!geoAllowed) {
      setGeoError('Алдын ала геолокацияға рұқсат беріңіз');
      return;
    }
    setGeoError('');
    setShowQR(true);
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
            Геолокацияға рұқсат беру
          </button>
          {!showQR && (
            <>
              <button
                className="qr-button"
                onClick={handleMakeQR}
                disabled={!geoAllowed}
                style={{ marginLeft: '10px' }}
              >
                <MdQrCode2 style={{ verticalAlign: 'middle', marginRight: 6 }} />
                QR код жасау
              </button>
              {geoError && (
                <p style={{ color: 'red', marginTop: '8px' }}>{geoError}</p>
              )}
            </>
          )}
          {showQR && <QRGenerator onRetrieve={handleRetrieve} />}
        </div>

        <h2 className="section-title">Студенттердің сабаққа қатысу кестесі</h2>
        <div className="attendance-container">
          <StudentDataTable />
        </div>
      </main>
    </div>
  );
}
