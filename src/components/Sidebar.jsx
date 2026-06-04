import React, { useState, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { MdQrCode2, MdInsertChart } from 'react-icons/md';
import { useI18n, LANGUAGES } from '../i18n/i18n';
import DevSeedPanel from './DevSeedPanel';
import '../styles/Sidebar.css';

// Боковая навигация: активный маршрут подсвечивается через NavLink,
// внизу — переключатель языка. Тайные 3 клика по логотипу открывают панель сидов.
export default function Sidebar() {
  const { t, lang, setLang } = useI18n();
  const [panelVisible, setPanelVisible] = useState(false);
  const clickRef = useRef({ count: 0, timer: null });

  const linkClass = ({ isActive }) =>
    `sidebar-link ${isActive ? 'active' : ''}`;

  // 3 клика подряд (в пределах 600 мс) по названию — показать/скрыть панель сидов
  const handleTitleClick = () => {
    const c = clickRef.current;
    if (c.timer) clearTimeout(c.timer);
    c.count += 1;
    if (c.count >= 3) {
      c.count = 0;
      setPanelVisible((v) => !v);
      return;
    }
    c.timer = setTimeout(() => {
      c.count = 0;
    }, 600);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-title" onClick={handleTitleClick}>
        {t('app.title')}
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={linkClass}>
          <MdQrCode2 className="sidebar-icon" />
          <span className="sidebar-label">{t('nav.home')}</span>
        </NavLink>
        <NavLink to="/stats" className={linkClass}>
          <MdInsertChart className="sidebar-icon" />
          <span className="sidebar-label">{t('nav.stats')}</span>
        </NavLink>
      </nav>

      {/* Переключатель языка прижат к низу сайдбара */}
      <div className="lang-switcher">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            className={`lang-option ${lang === l.code ? 'active' : ''}`}
            onClick={() => setLang(l.code)}
            title={l.label}
          >
            {l.short}
          </button>
        ))}
      </div>

      {panelVisible && <DevSeedPanel onClose={() => setPanelVisible(false)} />}
    </aside>
  );
}
