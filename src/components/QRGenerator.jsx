import React from 'react';
import { MdClose, MdRefresh } from 'react-icons/md';
import QRCode from 'react-qr-code';
import { useGenerator } from '../context/GeneratorContext';
import { useI18n } from '../i18n/i18n';
import '../styles/QRGenerator.css';

// Чисто презентационный компонент: всё состояние и таймер — в GeneratorContext,
// поэтому QR не пропадает при переходе на другую страницу.
export default function QRGenerator() {
  const { t } = useI18n();
  const {
    classSessionId,
    token,
    nextCountdown,
    totalRemaining,
    expired,
    error,
    closeSession,
    rotateNow,
    refreshSession
  } = useGenerator();

  if (expired) {
    return (
      <div className="qr-generator-container">
        <div className="qr-box expired">
          <p className="expired-text">{t('qr.expired')}</p>
        </div>
        <div className="button-group">
          <button className="btn retrieve-btn" onClick={closeSession} title={t('qr.close')}><MdClose /></button>
          <button className="btn refresh-btn" onClick={refreshSession} title={t('qr.refresh')}><MdRefresh /></button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="qr-generator-container">
        <div className="qr-box error">
          <p className="error-text">{t(error)}</p>
        </div>
        <div className="button-group">
          <button className="btn retrieve-btn" onClick={closeSession} title={t('qr.close')}><MdClose /></button>
          <button className="btn refresh-btn" onClick={refreshSession} title={t('qr.refresh')}><MdRefresh /></button>
        </div>
      </div>
    );
  }

  if (!classSessionId) {
    return (
      <div className="qr-generator-container">
        <div className="qr-box">
          <p className="expired-text">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const qrValue = JSON.stringify({ classSessionId, token });
  const mm = Math.floor(totalRemaining / 60).toString().padStart(2, '0');
  const ss = (totalRemaining % 60).toString().padStart(2, '0');

  return (
    <div className="qr-generator-container">
      <div className="qr-box">
        <QRCode value={qrValue} />
      </div>
      <p className="expires-info">{t('qr.nextCode', { n: nextCountdown })}</p>
      <p className="session-info">{t('qr.endsIn', { time: `${mm}:${ss}` })}</p>
      <div className="button-group">
        <button className="btn retrieve-btn" onClick={closeSession} title={t('qr.close')}><MdClose /></button>
        <button className="btn refresh-btn" onClick={rotateNow} title={t('qr.refresh')}><MdRefresh /></button>
      </div>
    </div>
  );
}
