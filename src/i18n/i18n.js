import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Доступные языки (порядок = порядок в переключателе)
export const LANGUAGES = [
  { code: 'kz', short: 'ҚАЗ', label: 'Қазақша' },
  { code: 'ru', short: 'РУС', label: 'Русский' },
  { code: 'en', short: 'ENG', label: 'English' }
];

const STORAGE_KEY = 'app_lang';
const DEFAULT_LANG = 'kz';

// Словари переводов. Источник — казахский.
const translations = {
  kz: {
    'app.title': 'QR Қатысу',
    'nav.home': 'Басты бет',
    'nav.stats': 'Қатысу статистикасы',
    'common.loading': 'Жүктелуде...',

    'geo.allow': 'Геолокацияға рұқсат беру',
    'geo.makeQR': 'QR код жасау',
    'geo.needFirst': 'Алдын ала геолокацияға рұқсат беріңіз',
    'geo.denied': 'Пайдаланушы геолокация рұқсатынан бас тартты.',
    'geo.unsupported': 'Бұл браузер геолокацияны қолдамайды.',
    'geo.unavailable': 'Геолокацияны анықтау мүмкін болмады. Wi-Fi мен Локация қызметтерін қосыңыз.',
    'geo.timeout': 'Геолокацияны алу уақыты бітті. Қайталап көріңіз.',
    'geo.error': 'Геолокацияны алу кезінде қате.',
    'dashboard.tableTitle': 'Студенттердің сабаққа қатысу кестесі',

    'qr.expired': 'QR кодтың мерзімі аяқталды',
    'qr.createError': 'Сессияны құру мүмкін болмады. Firestore ережелерін/қосылымды тексеріңіз.',
    'qr.nextCode': 'Келесі код: {n}с',
    'qr.endsIn': 'Сабақ аяқталуына: {time}',
    'qr.close': 'Жою',
    'qr.refresh': 'Жаңарту',

    'table.title': 'Сабақтағы студенттер',
    'table.name': 'Аты',
    'table.studentId': 'Студент ID',
    'table.time': 'Уақыт',
    'table.status': 'Статус',
    'table.distance': 'Арақашықтық (м)',
    'table.clearing': 'Тазартуда...',
    'table.refresh': 'Жаңарту',
    'table.clear': 'Тазарту',
    'table.prev': 'Алдыңғы',
    'table.next': 'Келесі',
    'status.present': 'Қатысты',
    'status.late': 'Кешікті',
    'export.allowed': 'Рұқсат етілген қашықтықта',
    'export.yes': 'Иә',
    'export.no': 'Жоқ',
    'export.sheet': 'Сабаққа Қатысу',

    'stats.pageTitle': 'Қатысу статистикасы мен талдау',
    'stats.cardStudents': 'Студенттер',
    'stats.cardSessions': 'Сабақтар',
    'stats.cardAvg': 'Орташа қатысу',
    'stats.cardRisk': 'Тәуекелде',
    'stats.colName': 'Аты',
    'stats.colAttendance': 'Қатысу %',
    'stats.colLate': 'Кешіккен',
    'stats.colTrend': 'Динамика',
    'stats.colRisk': 'Тәуекел деңгейі',
    'risk.low': 'Төмен',
    'risk.medium': 'Орташа',
    'risk.high': 'Жоғары',
    'trend.up': 'Өсуде',
    'trend.down': 'Төмендеуде',
    'trend.flat': 'Тұрақты',
    'stats.suspicious': 'күмәнді: {n}',
    'stats.note': 'Қатысу % есебі: уақытылы келу = 1, кешігу = 0.5, қашықтық бұзылса (күмәнді) = жартысы. Есеп студент алғаш қатысқан сабақтан басталады.',
    'stats.warnTitle': 'Ескерту: соңғы {n} сабаққа қатарынан қатыспағандар',
    'stats.warnEmpty': 'Ескерту жоқ',
    'stats.warnItem': '{name} ({id}) — {n} сабақ қатарынан'
  },

  ru: {
    'app.title': 'QR Посещаемость',
    'nav.home': 'Главная',
    'nav.stats': 'Статистика посещаемости',
    'common.loading': 'Загрузка...',

    'geo.allow': 'Разрешить геолокацию',
    'geo.makeQR': 'Создать QR-код',
    'geo.needFirst': 'Сначала разрешите геолокацию',
    'geo.denied': 'Пользователь отклонил доступ к геолокации.',
    'geo.unsupported': 'Этот браузер не поддерживает геолокацию.',
    'geo.unavailable': 'Не удалось определить геолокацию. Включите Wi-Fi и службы геолокации.',
    'geo.timeout': 'Время получения геолокации истекло. Повторите попытку.',
    'geo.error': 'Ошибка при получении геолокации.',
    'dashboard.tableTitle': 'Таблица посещаемости студентов',

    'qr.expired': 'Срок действия QR-кода истёк',
    'qr.createError': 'Не удалось создать сессию. Проверьте правила Firestore / подключение.',
    'qr.nextCode': 'Следующий код: {n}с',
    'qr.endsIn': 'До конца урока: {time}',
    'qr.close': 'Удалить',
    'qr.refresh': 'Обновить',

    'table.title': 'Студенты на уроке',
    'table.name': 'Имя',
    'table.studentId': 'ID студента',
    'table.time': 'Время',
    'table.status': 'Статус',
    'table.distance': 'Расстояние (м)',
    'table.clearing': 'Очистка...',
    'table.refresh': 'Обновить',
    'table.clear': 'Очистить',
    'table.prev': 'Предыдущая',
    'table.next': 'Следующая',
    'status.present': 'Присутствовал',
    'status.late': 'Опоздал',
    'export.allowed': 'В пределах допустимого расстояния',
    'export.yes': 'Да',
    'export.no': 'Нет',
    'export.sheet': 'Посещаемость',

    'stats.pageTitle': 'Статистика и анализ посещаемости',
    'stats.cardStudents': 'Студенты',
    'stats.cardSessions': 'Уроки',
    'stats.cardAvg': 'Средняя посещаемость',
    'stats.cardRisk': 'В зоне риска',
    'stats.colName': 'Имя',
    'stats.colAttendance': 'Посещаемость %',
    'stats.colLate': 'Опоздания',
    'stats.colTrend': 'Динамика',
    'stats.colRisk': 'Уровень риска',
    'risk.low': 'Низкий',
    'risk.medium': 'Средний',
    'risk.high': 'Высокий',
    'trend.up': 'Растёт',
    'trend.down': 'Падает',
    'trend.flat': 'Стабильно',
    'stats.suspicious': 'сомнит.: {n}',
    'stats.note': 'Расчёт посещаемости %: вовремя = 1, опоздание = 0.5, нарушение дистанции (сомнит.) = половина. Отсчёт начинается с первого посещения студента.',
    'stats.warnTitle': 'Внимание: пропустили последние {n} урока подряд',
    'stats.warnEmpty': 'Предупреждений нет',
    'stats.warnItem': '{name} ({id}) — {n} урока подряд'
  },

  en: {
    'app.title': 'QR Attendance',
    'nav.home': 'Home',
    'nav.stats': 'Attendance stats',
    'common.loading': 'Loading...',

    'geo.allow': 'Allow geolocation',
    'geo.makeQR': 'Create QR code',
    'geo.needFirst': 'Please allow geolocation first',
    'geo.denied': 'User denied geolocation access.',
    'geo.unsupported': 'This browser does not support geolocation.',
    'geo.unavailable': 'Could not determine location. Turn on Wi-Fi and Location Services.',
    'geo.timeout': 'Geolocation request timed out. Please try again.',
    'geo.error': 'Error getting geolocation.',
    'dashboard.tableTitle': 'Student attendance table',

    'qr.expired': 'QR code has expired',
    'qr.createError': 'Could not create a session. Check Firestore rules / connection.',
    'qr.nextCode': 'Next code: {n}s',
    'qr.endsIn': 'Class ends in: {time}',
    'qr.close': 'Delete',
    'qr.refresh': 'Refresh',

    'table.title': 'Students in class',
    'table.name': 'Name',
    'table.studentId': 'Student ID',
    'table.time': 'Time',
    'table.status': 'Status',
    'table.distance': 'Distance (m)',
    'table.clearing': 'Clearing...',
    'table.refresh': 'Refresh',
    'table.clear': 'Clear',
    'table.prev': 'Previous',
    'table.next': 'Next',
    'status.present': 'Present',
    'status.late': 'Late',
    'export.allowed': 'Within allowed distance',
    'export.yes': 'Yes',
    'export.no': 'No',
    'export.sheet': 'Attendance',

    'stats.pageTitle': 'Attendance statistics and analysis',
    'stats.cardStudents': 'Students',
    'stats.cardSessions': 'Classes',
    'stats.cardAvg': 'Average attendance',
    'stats.cardRisk': 'At risk',
    'stats.colName': 'Name',
    'stats.colAttendance': 'Attendance %',
    'stats.colLate': 'Late',
    'stats.colTrend': 'Trend',
    'stats.colRisk': 'Risk level',
    'risk.low': 'Low',
    'risk.medium': 'Medium',
    'risk.high': 'High',
    'trend.up': 'Rising',
    'trend.down': 'Falling',
    'trend.flat': 'Stable',
    'stats.suspicious': 'suspicious: {n}',
    'stats.note': "Attendance % formula: on time = 1, late = 0.5, distance violation (suspicious) = half. Counting starts from the student's first attendance.",
    'stats.warnTitle': 'Warning: missed the last {n} classes in a row',
    'stats.warnEmpty': 'No warnings',
    'stats.warnItem': '{name} ({id}) — {n} classes in a row'
  }
};

const I18nContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && translations[saved] ? saved : DEFAULT_LANG;
  });

  const setLang = useCallback((code) => {
    if (!translations[code]) return;
    localStorage.setItem(STORAGE_KEY, code);
    setLangState(code);
  }, []);

  // Перевод по ключу с подстановкой {переменных}
  const t = useCallback(
    (key, vars) => {
      const dict = translations[lang] || translations[DEFAULT_LANG];
      let str = dict[key];
      if (str == null) str = translations[DEFAULT_LANG][key];
      if (str == null) str = key;
      if (vars) {
        Object.keys(vars).forEach((k) => {
          str = str.split(`{${k}}`).join(vars[k]);
        });
      }
      return str;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n LanguageProvider ішінде қолданылуы керек');
  return ctx;
}
