import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './i18n/i18n';
import { GeneratorProvider } from './context/GeneratorContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import StatsPage from './pages/StatsPage';

function App() {
  return (
    // Провайдеры языка и генератора оборачивают весь интерфейс.
    // GeneratorProvider — выше роутера, чтобы QR-сессия жила между страницами.
    <LanguageProvider>
      <GeneratorProvider>
        <div className="app-layout">
          <Sidebar />
          <div className="app-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/stats" element={<StatsPage />} />
            </Routes>
          </div>
        </div>
      </GeneratorProvider>
    </LanguageProvider>
  );
}

export default App;
