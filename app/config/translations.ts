// 多语言翻译配置
export type Language = "zh" | "en" | "ja" | "ko" | "fr" | "es";

export interface TranslationStrings {
  // Welcome
  welcomeTitle: string;
  welcomeText1: string;
  welcomeText2: string;
  startButton: string;
  nextEchoIn: string;
  inputPlaceholder: string;
  clickToClose: string;
  voiceFromNebula: string;
  languageNames: Record<Language, string>;

  // Explore
  explore: string;
  refresh: string;
  searchContent: string;
  searchUser: string;
  content: string;
  user: string;
  noResults: string;
  edit: string;
  cancel: string;
  save: string;
  saving: string;
  searchContentPlaceholder: string;
  searchUserPlaceholder: string;

  // Profile
  myProfile: string;
  userProfile: string;
  myPosts: string;
  posts: string;
  myBookmarks: string;
  totalLikes: string;
  totalComments: string;
  noPosts: string;
  noBookmarks: string;
  deleteConfirm: string;
  logout: string;
  logoutConfirm: string;
  region: string;
  joinedAt: string;
  vip: string;
  comments: string;
  noComments: string;
  followers: string;
  following: string;
  follow: string;
  unfollow: string;
  noFollowers: string;
  noFollowing: string;
  noLikes: string;
  noReceivedComments: string;
  sortBy: string;
  latest: string;
  mostLikes: string;
  mostComments: string;
  mostBookmarks: string;
  searchPlaceholder: string;
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
    explore: "探索",
    refresh: "刷新",
    searchContent: "搜索内容...",
    searchUser: "搜索用户...",
    content: "内容",
    user: "用户",
    noResults: "没有找到相关内容",
    edit: "编辑思考",
    cancel: "取消",
    save: "保存",
    saving: "保存中...",
    searchContentPlaceholder: "搜索内容...",
    searchUserPlaceholder: "搜索用户...",
    myProfile: "我的主页",
    userProfile: "用户主页",
    myPosts: "思考",
    posts: "思考",
    myBookmarks: "收藏",
    totalLikes: "获赞",
    totalComments: "评论",
    noPosts: "还没有发布思考",
    noBookmarks: "还没有收藏内容",
    deleteConfirm: "确定删除这条内容吗？",
    logout: "退出登录",
    logoutConfirm: "确定要退出登录吗？",
    region: "地区",
    joinedAt: "加入于",
    vip: "V",
    comments: "条评论",
    noComments: "暂无评论",
    followers: "关注者",
    following: "已关注",
    follow: "关注",
    unfollow: "取消关注",
    noFollowers: "暂无关注者",
    noFollowing: "暂无关注",
    noLikes: "暂无获赞",
    noReceivedComments: "暂无评论",
    sortBy: "排序",
    latest: "按时间",
    mostLikes: "按热度",
    mostComments: "按评论",
    mostBookmarks: "按收藏",
    searchPlaceholder: "搜索思考...",
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
    explore: "Explore",
    refresh: "Refresh",
    searchContent: "Search content...",
    searchUser: "Search users...",
    content: "Content",
    user: "User",
    noResults: "No results found",
    edit: "Edit Thought",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving...",
    searchContentPlaceholder: "Search content...",
    searchUserPlaceholder: "Search users...",
    myProfile: "My Profile",
    userProfile: "User Profile",
    myPosts: "Thoughts",
    posts: "Thoughts",
    myBookmarks: "Bookmarks",
    totalLikes: "Likes",
    totalComments: "Comments",
    noPosts: "No thoughts posted yet",
    noBookmarks: "No bookmarks yet",
    deleteConfirm: "Delete this thought?",
    logout: "Log Out",
    logoutConfirm: "Are you sure you want to log out?",
    region: "Region",
    joinedAt: "Joined",
    vip: "V",
    comments: "comments",
    noComments: "No comments yet",
    followers: "Followers",
    following: "Following",
    follow: "Follow",
    unfollow: "Unfollow",
    noFollowers: "No followers yet",
    noFollowing: "Not following anyone",
    noLikes: "No likes received yet",
    noReceivedComments: "No comments received yet",
    sortBy: "Sort by",
    latest: "Latest",
    mostLikes: "Most Likes",
    mostComments: "Most Comments",
    mostBookmarks: "Most Bookmarks",
    searchPlaceholder: "Search thoughts...",
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
    explore: "探索",
    refresh: "更新",
    searchContent: "コンテンツを検索...",
    searchUser: "ユーザーを検索...",
    content: "コンテンツ",
    user: "ユーザー",
    noResults: "結果が見つかりません",
    edit: "思考を編集",
    cancel: "キャンセル",
    save: "保存",
    saving: "保存中...",
    searchContentPlaceholder: "コンテンツを検索...",
    searchUserPlaceholder: "ユーザーを検索...",
    myProfile: "マイページ",
    userProfile: "ユーザープロフィール",
    myPosts: "私の気持ち",
    posts: "気持ち",
    myBookmarks: "ブックマーク",
    totalLikes: "いいね",
    totalComments: "コメント",
    noPosts: "まだ投稿がありません",
    noBookmarks: "ブックマークはありません",
    deleteConfirm: "この投稿を削除しますか？",
    logout: "ログアウト",
    logoutConfirm: "ログアウトしますか？",
    region: "地域",
    joinedAt: "参加日",
    vip: "V",
    comments: "件のコメント",
    noComments: "コメントはありません",
    followers: "フォロワー",
    following: "フォロー中",
    follow: "フォロー",
    unfollow: "フォロー解除",
    noFollowers: "フォロワーはいません",
    noFollowing: "フォローしていません",
    noLikes: "いいねはまだありません",
    noReceivedComments: "コメントはまだありません",
    sortBy: "並び替え",
    latest: "最新",
    mostLikes: "いいね順",
    mostComments: "コメント順",
    mostBookmarks: "ブックマーク順",
    searchPlaceholder: "思考を検索...",
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
    explore: "탐색",
    refresh: "새로고침",
    searchContent: "콘텐츠 검색...",
    searchUser: "사용자 검색...",
    content: "콘텐츠",
    user: "사용자",
    noResults: "결과를 찾을 수 없습니다",
    edit: "생각 편집",
    cancel: "취소",
    save: "저장",
    saving: "저장 중...",
    searchContentPlaceholder: "콘텐츠 검색...",
    searchUserPlaceholder: "사용자 검색...",
    myProfile: "내 프로필",
    userProfile: "사용자 프로필",
    myPosts: "내 감정",
    posts: "감정",
    myBookmarks: "내 북마크",
    totalLikes: "좋아요",
    totalComments: "댓글",
    noPosts: "아직 게시물이 없습니다",
    noBookmarks: "북마크가 없습니다",
    deleteConfirm: "이 게시물을 삭제하시겠습니까?",
    logout: "로그아웃",
    logoutConfirm: "로그아웃하시겠습니까?",
    region: "지역",
    joinedAt: "가입일",
    vip: "V",
    comments: "개의 댓글",
    noComments: "댓글이 없습니다",
    followers: "팔로워",
    following: "팔로잉",
    follow: "팔로우",
    unfollow: "언팔로우",
    noFollowers: "팔로워가 없습니다",
    noFollowing: "팔로잉이 없습니다",
    noLikes: "받은 좋아요가 없습니다",
    noReceivedComments: "받은 댓글이 없습니다",
    sortBy: "정렬",
    latest: "최신순",
    mostLikes: "좋아요순",
    mostComments: "댓글순",
    mostBookmarks: "북마크순",
    searchPlaceholder: "생각 검색...",
  },
  fr: {
    welcomeTitle: "Bienvenue sur Échos des Étoiles",
    welcomeText1:
      "Nous venons des étoiles et retournons aux étoiles, comme des notes dans la mélodie cosmique.",
    welcomeText2:
      "Les émotions et pensées que vous laissez ici convergeront en musique, résonnant dans cet espace.",
    startButton: "Commencer",
    nextEchoIn: "Prochain Écho",
    inputPlaceholder: "Partagez votre humeur ou vos pensées...",
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
    explore: "Explorer",
    refresh: "Actualiser",
    searchContent: "Rechercher...",
    searchUser: "Rechercher...",
    content: "Contenu",
    user: "Utilisateur",
    noResults: "Aucun résultat",
    edit: "Modifier",
    cancel: "Annuler",
    save: "Enregistrer",
    saving: "Enregistrement...",
    searchContentPlaceholder: "Rechercher du contenu...",
    searchUserPlaceholder: "Rechercher des utilisateurs...",
    myProfile: "Mon Profil",
    userProfile: "Profil Utilisateur",
    myPosts: "Mes Humeurs",
    posts: "Humeurs",
    myBookmarks: "Mes Favoris",
    totalLikes: "J'aime",
    totalComments: "Commentaires",
    noPosts: "Aucune publication",
    noBookmarks: "Aucun favori",
    deleteConfirm: "Supprimer ?",
    logout: "Déconnexion",
    logoutConfirm: "Se déconnecter ?",
    region: "Région",
    joinedAt: "Inscrit le",
    vip: "V",
    comments: "commentaires",
    noComments: "Aucun commentaire",
    followers: "Abonnés",
    following: "Abonné",
    follow: "Suivre",
    unfollow: "Ne plus suivre",
    noFollowers: "Aucun abonné",
    noFollowing: "Aucun abonnement",
    noLikes: "Aucun j'aime",
    noReceivedComments: "Aucun commentaire",
    sortBy: "Trier par",
    latest: "Récent",
    mostLikes: "Aimés",
    mostComments: "Commentés",
    mostBookmarks: "Favoris",
    searchPlaceholder: "Rechercher...",
  },
  es: {
    welcomeTitle: "Bienvenido a Ecos de las Estrellas",
    welcomeText1:
      "Venimos de las estrellas y a ellas volveremos, como notas en la melodía cósmica.",
    welcomeText2:
      "Las emociones y pensamientos que dejes aquí convergerán en música, resonando en este espacio.",
    startButton: "Comenzar",
    nextEchoIn: "Próximo Eco",
    inputPlaceholder: "Comparte tu estado de ánimo...",
    clickToClose: "Clic fuera para cerrar",
    voiceFromNebula: "Voz de la nebulosa",
    languageNames: {
      zh: "中文",
      en: "English",
      ja: "日本語",
      ko: "한국어",
      fr: "Français",
      es: "Español",
    },
    explore: "Explorar",
    refresh: "Actualizar",
    searchContent: "Buscar...",
    searchUser: "Buscar...",
    content: "Contenido",
    user: "Usuario",
    noResults: "Sin resultados",
    edit: "Editar",
    cancel: "Cancelar",
    save: "Guardar",
    saving: "Guardando...",
    searchContentPlaceholder: "Buscar contenido...",
    searchUserPlaceholder: "Buscar usuarios...",
    myProfile: "Mi Perfil",
    userProfile: "Perfil de Usuario",
    myPosts: "Mis Estados",
    posts: "Estados",
    myBookmarks: "Favoritos",
    totalLikes: "Me Gusta",
    totalComments: "Comentarios",
    noPosts: "Sin publicaciones",
    noBookmarks: "Sin favoritos",
    deleteConfirm: "¿Eliminar?",
    logout: "Salir",
    logoutConfirm: "¿Cerrar sesión?",
    region: "Región",
    joinedAt: "Registrado",
    vip: "V",
    comments: "comentarios",
    noComments: "Sin comentarios",
    followers: "Seguidores",
    following: "Siguiendo",
    follow: "Seguir",
    unfollow: "Dejar de seguir",
    noFollowers: "Sin seguidores",
    noFollowing: "Sin seguidos",
    noLikes: "Sin me gusta",
    noReceivedComments: "Sin comentarios",
    sortBy: "Ordenar",
    latest: "Recientes",
    mostLikes: "Gustados",
    mostComments: "Comentados",
    mostBookmarks: "Favoritos",
    searchPlaceholder: "Buscar...",
  },
};

// 获取翻译的辅助函数
export const getTranslation = (language: Language): TranslationStrings => {
  return translations[language];
};
