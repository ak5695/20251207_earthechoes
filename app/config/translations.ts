// 多语言翻译配置
export type Language = "zh" | "en" | "ja" | "ko" | "fr" | "es";

export interface TranslationStrings {
  welcomeTitle: string;
  welcomeText1: string;
  welcomeText2: string;
  startButton: string;
  nextEchoIn: string;
  inputPlaceholder: string;
  clickToClose: string;
  voiceFromNebula: string;
  languageNames: Record<Language, string>;
}

export const translations: Record<Language, TranslationStrings> = {
  zh: {
    welcomeTitle: "星际回响",
    welcomeText1: "我们来自星辰，也终归于星辰，只是这宇宙旋律的音符。",
    welcomeText2:
      "你在这留下的情绪和思考，将会汇聚成一首音乐，回荡在这空间里。",
    startButton: "开始体验",
    nextEchoIn: "下次回响",
    inputPlaceholder: "留下你的心情或感悟...",
    clickToClose: "点击空白处关闭",
    voiceFromNebula: "来自星云的声音",
    languageNames: {
      zh: "中文",
      en: "English",
      ja: "日本語",
      ko: "한국어",
      fr: "Français",
      es: "Español",
    },
  },
  en: {
    welcomeTitle: "Welcome to Echoes of the Stars",
    welcomeText1:
      "We come from the stars, and to the stars we shall return, as notes in the cosmic melody.",
    welcomeText2:
      "The emotions and thoughts you leave here will converge into music, echoing through this space.",
    startButton: "Start Experience",
    nextEchoIn: "Next Echo In",
    inputPlaceholder: "Share your mood or thoughts...",
    clickToClose: "Click outside to close",
    voiceFromNebula: "Voice from the nebula",
    languageNames: {
      zh: "中文",
      en: "English",
      ja: "日本語",
      ko: "한국어",
      fr: "Français",
      es: "Español",
    },
  },
  ja: {
    welcomeTitle: "星のこだまへようこそ",
    welcomeText1:
      "私たちは星から来て、星へと帰る。宇宙のメロディーの音符として。",
    welcomeText2:
      "ここに残すあなたの感情と思考は、音楽となってこの空間に響き渡ります。",
    startButton: "体験を始める",
    nextEchoIn: "次のエコーまで",
    inputPlaceholder: "気持ちや思いを残して...",
    clickToClose: "外側をクリックして閉じる",
    voiceFromNebula: "星雲からの声",
    languageNames: {
      zh: "中文",
      en: "English",
      ja: "日本語",
      ko: "한국어",
      fr: "Français",
      es: "Español",
    },
  },
  ko: {
    welcomeTitle: "별의 메아리에 오신 것을 환영합니다",
    welcomeText1:
      "우리는 별에서 왔고, 별로 돌아갑니다. 우주 멜로디의 음표로서.",
    welcomeText2:
      "여기에 남기는 당신의 감정과 생각은 음악이 되어 이 공간에 울려 퍼집니다.",
    startButton: "시작하기",
    nextEchoIn: "다음 에코까지",
    inputPlaceholder: "기분이나 생각을 남겨주세요...",
    clickToClose: "바깥을 클릭하여 닫기",
    voiceFromNebula: "성운에서 온 목소리",
    languageNames: {
      zh: "中文",
      en: "English",
      ja: "日本語",
      ko: "한국어",
      fr: "Français",
      es: "Español",
    },
  },
  fr: {
    welcomeTitle: "Bienvenue sur Échos des Étoiles",
    welcomeText1:
      "Nous venons des étoiles et retournons aux étoiles, comme des notes dans la mélodie cosmique.",
    welcomeText2:
      "Les émotions et pensées que vous laissez ici se transformeront en musique, résonnant dans cet espace.",
    startButton: "Commencer",
    nextEchoIn: "Prochain Écho",
    inputPlaceholder: "Partagez votre humeur ou pensées...",
    clickToClose: "Cliquez à l'extérieur pour fermer",
    voiceFromNebula: "Voix de la nébuleuse",
    languageNames: {
      zh: "中文",
      en: "English",
      ja: "日本語",
      ko: "한국어",
      fr: "Français",
      es: "Español",
    },
  },
  es: {
    welcomeTitle: "Bienvenido a Ecos de las Estrellas",
    welcomeText1:
      "Venimos de las estrellas y a las estrellas volveremos, como notas en la melodía cósmica.",
    welcomeText2:
      "Las emociones y pensamientos que dejes aquí se convertirán en música, resonando en este espacio.",
    startButton: "Comenzar",
    nextEchoIn: "Próximo Eco En",
    inputPlaceholder: "Comparte tu ánimo o pensamientos...",
    clickToClose: "Haz clic afuera para cerrar",
    voiceFromNebula: "Voz de la nebulosa",
    languageNames: {
      zh: "中文",
      en: "English",
      ja: "日本語",
      ko: "한국어",
      fr: "Français",
      es: "Español",
    },
  },
};

// 获取翻译的辅助函数
export const getTranslation = (language: Language): TranslationStrings => {
  return translations[language];
};
