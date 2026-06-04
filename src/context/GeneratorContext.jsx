import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import {
  createClassSession,
  rotateToken,
  endClassSession,
  ROTATE_SECONDS,
  SESSION_MINUTES
} from '../services/sessions';

// Полное время сессии в секундах (15 минут)
const TOTAL_SECONDS = SESSION_MINUTES * 60;

const GeneratorContext = createContext(null);

// Провайдер живёт ВЫШЕ роутера, поэтому сессия QR и её таймер не сбрасываются
// при переходе между страницами (главная <-> статистика).
export function GeneratorProvider({ children }) {
  const [active, setActive] = useState(false); // показывается ли сейчас QR-блок
  const [classSessionId, setClassSessionId] = useState('');
  const [token, setToken] = useState('');
  const [nextCountdown, setNextCountdown] = useState(ROTATE_SECONDS);
  const [totalRemaining, setTotalRemaining] = useState(TOTAL_SECONDS);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState('');

  // Рефы для работы внутри интервала без устаревших замыканий
  const classSessionIdRef = useRef('');
  const currentTokenRef = useRef('');
  const nextRef = useRef(ROTATE_SECONDS);
  const totalRef = useRef(TOTAL_SECONDS);
  const rotatingRef = useRef(false);

  const startSession = useCallback(() => {
    // Сбрасываем счётчики на новую 15-минутную сессию
    nextRef.current = ROTATE_SECONDS;
    totalRef.current = TOTAL_SECONDS;
    setNextCountdown(ROTATE_SECONDS);
    setTotalRemaining(TOTAL_SECONDS);
    setExpired(false);
    setError('');
    setClassSessionId('');
    setToken('');
    setActive(true);

    const begin = (generatorLat, generatorLng) => {
      createClassSession({ generatorLat, generatorLng })
        .then(({ classSessionId, token }) => {
          classSessionIdRef.current = classSessionId;
          currentTokenRef.current = token;
          setClassSessionId(classSessionId);
          setToken(token);
        })
        .catch((err) => {
          console.error('Сессияны құру қатесі:', err);
          setError('qr.createError');
        });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => begin(pos.coords.latitude, pos.coords.longitude),
        () => begin(null, null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      begin(null, null);
    }
  }, []);

  // Единый секундный интервал ведёт оба отсчёта; живёт в провайдере
  useEffect(() => {
    if (!active || !classSessionId || expired) return;

    const doRotate = () => {
      if (rotatingRef.current) return;
      rotatingRef.current = true;
      const previous = currentTokenRef.current;
      rotateToken(classSessionIdRef.current, previous)
        .then((newToken) => {
          currentTokenRef.current = newToken;
          setToken(newToken);
        })
        .catch(() => {})
        .finally(() => {
          rotatingRef.current = false;
        });
    };

    const doEnd = () => {
      endClassSession(classSessionIdRef.current).catch(() => {});
      setExpired(true);
    };

    const id = setInterval(() => {
      totalRef.current -= 1;
      nextRef.current -= 1;

      if (totalRef.current <= 0) {
        totalRef.current = 0;
        nextRef.current = 0;
        setTotalRemaining(0);
        setNextCountdown(0);
        doEnd();
        return;
      }

      if (nextRef.current <= 0) {
        nextRef.current = ROTATE_SECONDS;
        doRotate();
      }

      setTotalRemaining(totalRef.current);
      setNextCountdown(nextRef.current);
    }, 1000);

    return () => clearInterval(id);
  }, [active, classSessionId, expired]);

  // Закрыть: завершить сессию и спрятать QR-блок
  const closeSession = useCallback(() => {
    if (classSessionIdRef.current) {
      endClassSession(classSessionIdRef.current).catch(() => {});
    }
    setActive(false);
  }, []);

  // Обновить: новая 15-минутная сессия
  const refreshSession = useCallback(() => {
    startSession();
  }, [startSession]);

  const value = {
    active,
    classSessionId,
    token,
    nextCountdown,
    totalRemaining,
    expired,
    error,
    startSession,
    closeSession,
    refreshSession
  };

  return <GeneratorContext.Provider value={value}>{children}</GeneratorContext.Provider>;
}

export function useGenerator() {
  const ctx = useContext(GeneratorContext);
  if (!ctx) throw new Error('useGenerator GeneratorProvider ішінде қолданылуы керек');
  return ctx;
}
