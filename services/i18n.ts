
export const translations = {
  en: {
    home: "Home",
    search: "Search",
    calendar: "Calendar",
    profile: "Profile",
    settings: "Settings",
    aiAssistant: "AI Assistant",
    arHub: "AR Collection",
    trending: "Trending Now",
    seasonal: "This Season",
    upcoming: "Coming Soon",
    recommended: "Recommended For You",
    login: "Sign In",
    logout: "Sign Out",
    welcome: "Welcome Back",
    guest: "Guest Access"
  },
  ar: {
    home: "الرئيسية",
    search: "بحث",
    calendar: "التقويم",
    profile: "الملف الشخصي",
    settings: "الإعدادات",
    aiAssistant: "مساعد الذكاء الاصطناعي",
    arHub: "الواقع المعزز",
    trending: "الرائج الآن",
    seasonal: "هذا الموسم",
    upcoming: "قريباً",
    recommended: "موصى به لك",
    login: "تسجيل الدخول",
    logout: "تسجيل الخروج",
    welcome: "مرحباً بعودتك",
    guest: "دخول كضيف"
  },
  es: {
    home: "Inicio",
    search: "Buscar",
    calendar: "Calendario",
    profile: "Perfil",
    settings: "Ajustes",
    aiAssistant: "Asistente IA",
    arHub: "Colección AR",
    trending: "Tendencias",
    seasonal: "Esta Temporada",
    upcoming: "Próximamente",
    recommended: "Recomendado",
    login: "Iniciar Sesión",
    logout: "Cerrar Sesión",
    welcome: "Bienvenido",
    guest: "Acceso Invitado"
  },
  ja: {
    home: "ホーム",
    search: "検索",
    calendar: "カレンダー",
    profile: "プロフィール",
    settings: "設定",
    aiAssistant: "AIアシスタント",
    arHub: "ARコレクション",
    trending: "トレンド",
    seasonal: "今シーズン",
    upcoming: "近日公開",
    recommended: "おすすめ",
    login: "ログイン",
    logout: "ログアウト",
    welcome: "お帰りなさい",
    guest: "ゲスト"
  },
  fr: {
    home: "Accueil",
    search: "Recherche",
    calendar: "Calendrier",
    profile: "Profil",
    settings: "Paramètres",
    aiAssistant: "Assistant IA",
    arHub: "Hub AR",
    trending: "Tendances",
    seasonal: "Cette Saison",
    upcoming: "À Venir",
    recommended: "Recommandé",
    login: "Se connecter",
    logout: "Se déconnecter",
    welcome: "Bienvenue",
    guest: "Accès Invité"
  },
  de: {
    home: "Startseite",
    search: "Suche",
    calendar: "Kalender",
    profile: "Profil",
    settings: "Einstellungen",
    aiAssistant: "KI-Assistent",
    arHub: "AR-Sammlung",
    trending: "Im Trend",
    seasonal: "Diese Saison",
    upcoming: "Demnächst",
    recommended: "Empfohlen",
    login: "Anmelden",
    logout: "Abmelden",
    welcome: "Willkommen zurück",
    guest: "Gastzugang"
  },
  it: {
    home: "Home",
    search: "Cerca",
    calendar: "Calendario",
    profile: "Profilo",
    settings: "Impostazioni",
    aiAssistant: "Assistente IA",
    arHub: "Hub AR",
    trending: "Di Tendenza",
    seasonal: "Questa Stagione",
    upcoming: "In Arrivo",
    recommended: "Consigliato",
    login: "Accedi",
    logout: "Esci",
    welcome: "Bentornato",
    guest: "Accesso Ospite"
  },
  pt: {
    home: "Início",
    search: "Pesquisar",
    calendar: "Calendário",
    profile: "Perfil",
    settings: "Configurações",
    aiAssistant: "Assistente IA",
    arHub: "Hub AR",
    trending: "Tendências",
    seasonal: "Esta Temporada",
    upcoming: "Em Breve",
    recommended: "Recomendado",
    login: "Entrar",
    logout: "Sair",
    welcome: "Bem-vindo de volta",
    guest: "Acesso Convidado"
  },
  ru: {
    home: "Главная",
    search: "Поиск",
    calendar: "Календарь",
    profile: "Профиль",
    settings: "Настройки",
    aiAssistant: "ИИ Ассистент",
    arHub: "AR Хаб",
    trending: "В тренде",
    seasonal: "Этот сезон",
    upcoming: "Скоро",
    recommended: "Рекомендуемое",
    login: "Войти",
    logout: "Выйти",
    welcome: "С возвращением",
    guest: "Гостевой вход"
  },
  zh: {
    home: "主页",
    search: "搜索",
    calendar: "日历",
    profile: "个人资料",
    settings: "设置",
    aiAssistant: "AI 助手",
    arHub: "AR 中心",
    trending: "热门",
    seasonal: "本季",
    upcoming: "即将上映",
    recommended: "为您推荐",
    login: "登录",
    logout: "退出",
    welcome: "欢迎回来",
    guest: "访客访问"
  },
  ko: {
    home: "홈",
    search: "검색",
    calendar: "달력",
    profile: "프로필",
    settings: "설정",
    aiAssistant: "AI 비서",
    arHub: "AR 허브",
    trending: "인기",
    seasonal: "이번 시즌",
    upcoming: "공개 예정",
    recommended: "추천",
    login: "로그인",
    logout: "로그아웃",
    welcome: "환영합니다",
    guest: "게스트 접속"
  }
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en | string;

export const setTranslations = (newTranslations: any) => {
    Object.keys(newTranslations).forEach(lang => {
        if (!translations[lang as Language]) (translations as any)[lang] = {};
        Object.assign((translations as any)[lang], newTranslations[lang]);
    });
};

export const t = (key: TranslationKey, lang: Language = 'en'): string => {
  return (translations[lang] as any)?.[key] || (translations['en'] as any)?.[key] || key;
};
