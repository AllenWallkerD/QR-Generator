import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import '../styles/QRGenerator.css';

const QRGenerator = ({ onRetrieve }) => {
  const [sessionId, setSessionId] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [geoErrorMsg, setGeoErrorMsg] = useState('');

  const generateNewSession = () => {
    const newSession = `session-${Date.now()}`;
    console.log("Generated new session:", newSession);
    setSessionId(newSession);
    setCountdown(60);
    setGeoErrorMsg('');

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
          setGeoErrorMsg("Геолокацияны алу кезінде қате болды. Өтінеміз, браузер параметрлерінен геолокацияны қосыңыз.");
        }
      );
    } else {
      setGeoErrorMsg("Браузер геолокацияны қолдамайды.");
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

  if (geoErrorMsg) {
    return (
      <div className="qr-generator-container">
        <div className="qr-box error">
          <p className="error-text">{geoErrorMsg}</p>
        </div>
        <div className="button-group">
          <button className="btn refresh-btn" onClick={generateNewSession}>Refresh</button>
        </div>
      </div>
    );
  }

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