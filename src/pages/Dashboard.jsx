import React, { useState } from 'react';
import QRGenerator from '../components/QRGenerator';
import StudentDataTable from '../components/StudentDataTable';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [showQR, setShowQR] = useState(false);

  const handleRetrieve = () => {
    setShowQR(false);
  };

  return (
    <div className="dashboard-container">

      <main className="dashboard-main">

        {!showQR ? (
          <button className="qr-button" onClick={() => setShowQR(true)}>
            QR код жасау
          </button>
        ) : (
          <QRGenerator onRetrieve={handleRetrieve} />
        )}

        <h2 className="section-title">Студенттердің сабаққа қатысу кестесі</h2>

        <div className="attendance-container">
          <StudentDataTable />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
