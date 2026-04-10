import React, { useState, useEffect } from 'react';
import { MdClose, MdRefresh } from 'react-icons/md';
import QRCode from 'react-qr-code';
import '../styles/QRGenerator.css';

export default function QRGenerator({ onRetrieve }) {
  const [sessionId, setSessionId] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [generatorLat, setGeneratorLat] = useState(null);
  const [generatorLng, setGeneratorLng] = useState(null);

  const generateNewSession = () => {
    const s = `session-${Date.now()}`;
    setSessionId(s);
    setCountdown(60);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeneratorLat(pos.coords.latitude);
          setGeneratorLng(pos.coords.longitude);
        },
        () => {
          setGeneratorLat(null);
          setGeneratorLng(null);
        }
      );
    } else {
      setGeneratorLat(null);
      setGeneratorLng(null);
    }
  };

  useEffect(() => {
    generateNewSession();
  }, []);

  useEffect(() => {
    let t;
    if (countdown > 0) {
      t = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(t);
  }, [countdown]);

  if (!sessionId) return null;

  if (countdown <= 0) {
    return (
      <div className="qr-generator-container">
        <div className="qr-box expired">
          <p className="expired-text">QR кодтың мерзімі аяқталды</p>
        </div>
        <div className="button-group">
          <button className="btn retrieve-btn" onClick={onRetrieve} title="Жою"><MdClose /></button>
          <button className="btn refresh-btn" onClick={generateNewSession} title="Жаңарту"><MdRefresh /></button>
        </div>
      </div>
    );
  }

  const qrValue = JSON.stringify({ sessionId, generatorLat, generatorLng });

  return (
    <div className="qr-generator-container">
      <div className="qr-box">
        <QRCode value={qrValue} />
      </div>
      <p className="session-info">Session: {sessionId}</p>
      <p className="expires-info">QR мерзімі: {countdown}с</p>
      <div className="button-group">
        <button className="btn retrieve-btn" onClick={onRetrieve} title="Жою"><MdClose /></button>
        <button className="btn refresh-btn" onClick={generateNewSession} title="Жаңарту"><MdRefresh /></button>
      </div>
    </div>
  );
}
