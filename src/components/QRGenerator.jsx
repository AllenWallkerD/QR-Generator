// src/pages/QRGenerator.jsx
import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import '../styles/QRGenerator.css';

// Default geolocation values
const DEFAULT_LAT = 43.218843810825405;
const DEFAULT_LNG = 76.92844706286535;

const QRGenerator = ({ onRetrieve }) => {
  const [sessionId, setSessionId] = useState('');
  const [countdown, setCountdown] = useState(60);

  const generateNewSession = () => {
    const newSession = `session-${Date.now()}`;
    console.log("Generated new session:", newSession);
    setSessionId(newSession);
    setCountdown(60);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          localStorage.setItem("teacherLatitude", latitude);
          localStorage.setItem("teacherLongitude", longitude);
          console.log("Teacher geolocation stored:", latitude, longitude);
        },
        (error) => {
          console.error("Error obtaining geolocation:", error);
          // If permission is denied or an error occurs, store the default values
          localStorage.setItem("teacherLatitude", DEFAULT_LAT);
          localStorage.setItem("teacherLongitude", DEFAULT_LNG);
        }
      );
    } else {
      // If geolocation is not supported, use defaults.
      localStorage.setItem("teacherLatitude", DEFAULT_LAT);
      localStorage.setItem("teacherLongitude", DEFAULT_LNG);
    }
  };

  useEffect(() => {
    generateNewSession();
  }, []);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  if (!sessionId) return null;

  if (countdown <= 0) {
    return (
      <div className="qr-generator-container">
        <div className="qr-box expired">
          <p className="expired-text">QR кодтың мерзімі аяқталды</p>
        </div>
        <div className="button-group">
          <button className="btn retrieve-btn" onClick={onRetrieve}>Жою</button>
          <button className="btn refresh-btn" onClick={generateNewSession}>Жаңарту</button>
        </div>
      </div>
    );
  }

  // Use the sessionId as the QR code content.
  const qrValue = sessionId;
  console.log("QR value being encoded:", qrValue);

  return (
    <div className="qr-generator-container">
      <div className="qr-box">
        <QRCode value={qrValue} />
      </div>
      <p className="session-info">Session: {sessionId}</p>
      <p className="expires-info">QR мерзімі: {countdown}с</p>
      <div className="button-group">
        <button className="btn retrieve-btn" onClick={onRetrieve}>Жою</button>
        <button className="btn refresh-btn" onClick={generateNewSession}>Жаңарту</button>
      </div>
    </div>
  );
};

export default QRGenerator;
