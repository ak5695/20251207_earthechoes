"use client";

import React, { useState, useCallback } from "react";
import { supabase, User } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { Shuffle, Loader2, X } from "lucide-react";
import { triggerHapticFeedback } from "../utils/haptics";

interface UserSetupModalProps {
  onComplete: (user: User) => void;
  onClose: () => void;
  onOpenPolicy?: (view: "terms" | "privacy") => void;
  language: string;
}

const translations: Record<string, Record<string, string>> = {
  zh: {
    welcomeTitle: "创建你的身份",
    welcomeSubtitle: "给自己取个名字吧",
    nickname: "昵称",
    nicknamePlaceholder: "输入昵称...",
    region: "地区（可选）",
    regionPlaceholder: "例如：北京、Tokyo、NYC...",
    continue: "开始旅程",
    randomName: "随机",
    login: "登录",
    register: "注册",
    email: "邮箱",
    password: "密码",
    emailPlaceholder: "请输入邮箱",
    passwordPlaceholder: "请设置密码（至少6位）",
    loginPasswordPlaceholder: "请输入密码",
    welcomeBack: "欢迎回来",
    loginSubtitle: "使用邮箱登录",
    selectLanguage: "选择语言",
    agreeToPolicy: "我已阅读并同意",
    terms: "使用条款",
    and: "和",
    privacy: "隐私政策",
    pleaseAgree: "请先同意使用条款和隐私政策",
  },
  en: {
    welcomeTitle: "Create Your Identity",
    welcomeSubtitle: "Choose a name for yourself",
    nickname: "Nickname",
    nicknamePlaceholder: "Enter nickname...",
    region: "Region (optional)",
    regionPlaceholder: "e.g., NYC, Tokyo, London...",
    continue: "Start Journey",
    randomName: "Random",
    login: "Login",
    register: "Register",
    email: "Email",
    password: "Password",
    emailPlaceholder: "Enter email",
    passwordPlaceholder: "Set password (min 6 chars)",
    loginPasswordPlaceholder: "Enter password",
    welcomeBack: "Welcome Back",
    loginSubtitle: "Login with email",
    selectLanguage: "Language",
    agreeToPolicy: "I agree to the",
    terms: "Terms of Use",
    and: "and",
    privacy: "Privacy Policy",
    pleaseAgree: "Please agree to the Terms of Use and Privacy Policy",
  },
  ja: {
    welcomeTitle: "アイデンティティを作成",
    welcomeSubtitle: "名前を選んでください",
    nickname: "ニックネーム",
    nicknamePlaceholder: "ニックネームを入力...",
    region: "地域（任意）",
    regionPlaceholder: "例：東京、NYC、ロンドン...",
    continue: "旅を始める",
    randomName: "ランダム",
    login: "ログイン",
    register: "登録",
    email: "メール",
    password: "パスワード",
    emailPlaceholder: "メールを入力",
    passwordPlaceholder: "パスワードを設定（6文字以上）",
    loginPasswordPlaceholder: "パスワードを入力",
    welcomeBack: "おかえりなさい",
    loginSubtitle: "メールでログイン",
    selectLanguage: "言語",
    agreeToPolicy: "に同意します",
    terms: "利用規約",
    and: "と",
    privacy: "プライバシーポリシー",
    pleaseAgree: "利用規約とプライバシーポリシーに同意してください",
  },
  ko: {
    welcomeTitle: "정체성을 만드세요",
    welcomeSubtitle: "이름을 선택하세요",
    nickname: "닉네임",
    nicknamePlaceholder: "닉네임 입력...",
    region: "지역 (선택사항)",
    regionPlaceholder: "예: 서울, Tokyo, NYC...",
    continue: "여행 시작",
    randomName: "랜덤",
    login: "로그인",
    register: "가입",
    email: "이메일",
    password: "비밀번호",
    emailPlaceholder: "이메일 입력",
    passwordPlaceholder: "비밀번호 설정 (6자 이상)",
    loginPasswordPlaceholder: "비밀번호 입력",
    welcomeBack: "다시 오신 것을 환영합니다",
    loginSubtitle: "이메일로 로그인",
    selectLanguage: "언어",
    agreeToPolicy: "에 동의합니다",
    terms: "이용 약관",
    and: "및",
    privacy: "개인정보 처리방침",
    pleaseAgree: "이용 약관 및 개인정보 처리방침에 동의해주세요",
  },
  fr: {
    welcomeTitle: "Créez votre identité",
    welcomeSubtitle: "Choisissez un nom",
    nickname: "Pseudo",
    nicknamePlaceholder: "Entrez pseudo...",
    region: "Région (optionnel)",
    regionPlaceholder: "ex: Paris, NYC, Tokyo...",
    continue: "Commencer",
    randomName: "Aléatoire",
    login: "Connexion",
    register: "Inscription",
    email: "Email",
    password: "Mot de passe",
    emailPlaceholder: "Entrez email",
    passwordPlaceholder: "Définir mot de passe (min 6)",
    loginPasswordPlaceholder: "Entrez mot de passe",
    welcomeBack: "Bienvenue",
    loginSubtitle: "Connexion par email",
    selectLanguage: "Langue",
  },
  es: {
    welcomeTitle: "Crea tu identidad",
    welcomeSubtitle: "Elige un nombre",
    nickname: "Apodo",
    nicknamePlaceholder: "Introduce apodo...",
    region: "Región (opcional)",
    regionPlaceholder: "ej: Madrid, NYC, Tokyo...",
    continue: "Comenzar",
    randomName: "Aleatorio",
    login: "Iniciar sesión",
    register: "Registrarse",
    email: "Email",
    password: "Contraseña",
    emailPlaceholder: "Introduce email",
    passwordPlaceholder: "Establecer contraseña (mín 6)",
    loginPasswordPlaceholder: "Introduce contraseña",
    welcomeBack: "Bienvenido",
    loginSubtitle: "Iniciar con email",
    selectLanguage: "Idioma",
  },
};

const randomNicknames = {
  zh: [
    "漫步星河",
    "深夜旅人",
    "追光者",
    "月亮信使",
    "云端漫步",
    "星辰大海",
    "夜空守望",
    "风中诗人",
  ],
  en: [
    "Stargazer",
    "Nightwalker",
    "Dreamcatcher",
    "Moonshadow",
    "Cloudchaser",
    "Wanderlust",
    "Stardust",
    "Nightowl",
  ],
  ja: [
    "星空の旅人",
    "夜風の歌",
    "月光の使者",
    "雲の上から",
    "星屑の夢",
    "夜明けの光",
    "風の詩人",
    "虹の彼方",
  ],
  ko: [
    "별빛여행자",
    "밤하늘",
    "달빛산책",
    "구름위",
    "별똥별",
    "새벽빛",
    "바람시인",
    "무지개끝",
  ],
  fr: [
    "Étoile filante",
    "Rêveur nocturne",
    "Chasseur de lune",
    "Voyageur céleste",
    "Poète errant",
    "Lumière dorée",
  ],
  es: [
    "Viajero estelar",
    "Soñador nocturno",
    "Cazador de lunas",
    "Poeta errante",
    "Luz dorada",
    "Sombra lunar",
  ],
};

export default function UserSetupModal({
  onComplete,
  onClose,
  onOpenPolicy,
  language,
}: UserSetupModalProps) {
  const t = translations[language] || translations.en;
  const [activeTab, setActiveTab] = useState<"register" | "login">("register");
  const [nickname, setNickname] = useState("");
  const [region, setRegion] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userLanguage, setUserLanguage] = useState(language);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  // 带动画的关闭处理
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 2000); // 等待动画完成
  }, [onClose]);

  const handleRandomName = () => {
    const names =
      randomNicknames[userLanguage as keyof typeof randomNicknames] ||
      randomNicknames.en;
    setNickname(names[Math.floor(Math.random() * names.length)]);
  };

  // 错误消息本地化
  const getErrorMessage = (error: string) => {
    if (error.includes("Invalid login credentials")) return "邮箱或密码错误";
    if (error.includes("User already registered"))
      return "该邮箱已注册，请直接登录";
    if (error.includes("Email not confirmed")) return "请先验证邮箱";
    if (error.includes("Password should be")) return "密码至少需要6个字符";
    if (error.includes("duplicate key")) return "该邮箱已注册，请直接登录";
    return error;
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("请填写邮箱和密码");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
      if (signInError) {
        setError(getErrorMessage(signInError.message));
        return;
      }
      if (!signInData.user) {
        setError("登录失败");
        return;
      }
      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select()
        .eq("id", signInData.user.id)
        .single();
      if (profileError || !profileData) {
        // 用户在 auth 存在但 profile 不存在，尝试创建
        const { data: newProfile, error: createError } = await supabase
          .from("users")
          .insert({
            id: signInData.user.id,
            nickname: email.split("@")[0],
            email: email.trim(),
            language: userLanguage,
          })
          .select()
          .single();
        if (createError || !newProfile) {
          setError("获取用户信息失败，请重试");
          return;
        }
        localStorage.setItem("earthechoes_user_id", newProfile.id);
        localStorage.setItem("earthechoes_user", JSON.stringify(newProfile));
        onComplete(newProfile);
        return;
      }
      localStorage.setItem("earthechoes_user_id", profileData.id);
      localStorage.setItem("earthechoes_user", JSON.stringify(profileData));
      onComplete(profileData);
    } catch (err: any) {
      setError(getErrorMessage(err?.message || "登录失败"));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !nickname.trim()) {
      setError("请填写所有必填项");
      return;
    }
    if (password.trim().length < 6) {
      setError("密码至少需要6个字符");
      return;
    }
    if (!agreedToPolicy) {
      setError(t.pleaseAgree);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });
      if (signUpError) {
        setError(getErrorMessage(signUpError.message));
        return;
      }
      if (!signUpData.user) {
        setError("注册失败");
        return;
      }

      // 检查是否需要邮箱验证
      const needsEmailConfirmation = !signUpData.session;

      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .insert({
          id: signUpData.user.id,
          nickname: nickname.trim(),
          region: region.trim() || null,
          language: userLanguage,
          email: email.trim(),
        })
        .select()
        .single();
      if (profileError) {
        // 可能是用户已存在，尝试获取
        if (profileError.message.includes("duplicate")) {
          setError("该邮箱已注册，请直接登录");
          setActiveTab("login");
          return;
        }
        setError(getErrorMessage(profileError.message));
        return;
      }
      // 如果需要邮箱验证，显示提示
      if (needsEmailConfirmation) {
        setSuccess("注册成功！请查收验证邮件后再登录。");
        setActiveTab("login");
        setLoading(false);
        return;
      }

      localStorage.setItem("earthechoes_user_id", profileData.id);
      localStorage.setItem("earthechoes_user", JSON.stringify(profileData));
      onComplete(profileData);
    } catch (err: any) {
      setError(getErrorMessage(err?.message || "注册失败"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm ${
          isClosing ? "animate-backdrop-exit" : "animate-backdrop-enter"
        }`}
        onClick={() => {
          triggerHapticFeedback();
          handleClose();
        }}
      />

      {/* 外层浮动容器 */}
      <div className="animate-space-float-slow">
        {/* 内层进出动画容器 - 添加高度过渡 */}
        <div
          className={`relative sm:max-w-md w-full bg-gray-900/95 border border-gray-700 backdrop-blur-xl rounded-lg p-6 shadow-lg transition-all duration-500 ease-out ${
            isClosing ? "animate-card-exit" : "animate-card-enter"
          }`}
        >
          {/* 关闭按钮 */}
          <button
            onClick={() => {
              triggerHapticFeedback();
              handleClose();
            }}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-opacity btn-icon"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex flex-col gap-2 text-center mb-4">
            <h2 className="text-xl font-light text-white">
              <TypingAnimation
                duration={80}
                delay={200}
                showCursor={false}
                startOnView={false}
                className="text-xl font-light text-white"
              >
                {activeTab === "login" ? t.welcomeBack : t.welcomeTitle}
              </TypingAnimation>
            </h2>
            <p className="text-gray-400 text-sm">
              <TypingAnimation
                duration={60}
                delay={600}
                showCursor={true}
                blinkCursor={true}
                startOnView={false}
                className="text-gray-400"
              >
                {activeTab === "login" ? t.loginSubtitle : t.welcomeSubtitle}
              </TypingAnimation>
            </p>
          </div>

          {/* 语言选择器 - 移到最上面 */}
          <div className="mb-4">
            <label className="text-sm text-gray-400 block mb-2">
              {t.selectLanguage}
            </label>
            <select
              value={userLanguage}
              onChange={(e) => setUserLanguage(e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-gray-800/50 border border-gray-600 text-white text-sm transition-colors cursor-pointer"
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
            </select>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v as "register" | "login");
              setError("");
            }}
          >
            <TabsList className="grid w-full grid-cols-2 bg-gray-800/50">
              <TabsTrigger
                value="register"
                className="data-[state=active]:bg-gray-700"
              >
                {t.register}
              </TabsTrigger>
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-gray-700"
              >
                {t.login}
              </TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">{t.email}</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">{t.password}</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.loginPasswordPlaceholder}
                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500"
                />
              </div>
              {success && (
                <p className="text-sm text-green-400 text-center">{success}</p>
              )}
              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}
              <Button
                onClick={() => {
                  triggerHapticFeedback();
                  handleLogin();
                }}
                disabled={loading}
                className="w-full bg-gray-700 hover:bg-gray-600 btn-glow btn-ripple"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t.login
                )}
              </Button>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">{t.email}</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">{t.password}</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">{t.nickname}</label>
                <div className="flex gap-2">
                  <Input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder={t.nicknamePlaceholder}
                    maxLength={20}
                    className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      triggerHapticFeedback();
                      handleRandomName();
                    }}
                    className="border-gray-600 hover:bg-gray-700 btn-icon"
                  >
                    <Shuffle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">{t.region}</label>
                <Input
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder={t.regionPlaceholder}
                  maxLength={50}
                  className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500"
                />
              </div>

              {/* Policy Agreement */}
              <div className="flex items-start gap-2 pt-2">
                <div className="flex items-center h-5">
                  <input
                    id="policy-agreement"
                    type="checkbox"
                    checked={agreedToPolicy}
                    onChange={(e) => setAgreedToPolicy(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800/50 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900"
                  />
                </div>
                <label
                  htmlFor="policy-agreement"
                  className="text-xs text-gray-400 leading-5"
                >
                  {t.agreeToPolicy}{" "}
                  <span
                    className="text-indigo-400 cursor-pointer hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenPolicy?.("terms");
                    }}
                  >
                    {t.terms}
                  </span>{" "}
                  {t.and}{" "}
                  <span
                    className="text-indigo-400 cursor-pointer hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenPolicy?.("privacy");
                    }}
                  >
                    {t.privacy}
                  </span>
                </label>
              </div>

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}
              <Button
                onClick={() => {
                  triggerHapticFeedback();
                  handleRegister();
                }}
                disabled={loading}
                className="w-full bg-gray-700 hover:bg-gray-600 btn-glow btn-ripple"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t.continue
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
