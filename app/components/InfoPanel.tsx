"use client";

import React, { useState } from "react";
import {
  X,
  Mail,
  FileText,
  Shield,
  CreditCard,
  MessageSquare,
  Bug,
  ChevronLeft,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { triggerHapticFeedback } from "../utils/haptics";

interface InfoPanelProps {
  onClose: () => void;
  isClosing?: boolean;
  initialView?: View;
  language?: string;
}

export type View =
  | "main"
  | "contact"
  | "terms"
  | "privacy"
  | "refund"
  | "suggestion"
  | "bug";

const translations: Record<string, any> = {
  zh: {
    contact: "联系方式",
    terms: "使用条款",
    privacy: "隐私政策",
    refund: "退款政策",
    suggestion: "建议反馈",
    bug: "错误报告",
    about: "关于与规则",
    moreInfo: "更多信息",
    copy: "复制",
    copied: "已复制",
    contactText:
      "如果您有任何问题、建议或商务合作意向，欢迎通过以下方式联系我们：",
    replyTime: "我们通常会在 24 小时内回复您的邮件。",
    lastUpdated: "最后更新日期：2025年12月11日",
    terms1Title: "1. 接受条款",
    terms1Text:
      "欢迎使用 Echoes Of The Stars。通过访问或使用本应用，即表示您同意受这些条款的约束。",
    terms2Title: "2. 用户行为",
    terms2Text:
      "您同意不使用本服务发布任何非法、有害、威胁、辱骂、骚扰、诽谤、粗俗、淫秽、侵犯他人隐私或种族歧视的内容。",
    terms3Title: "3. 账户安全",
    terms3Text:
      "您有责任维护您账户信息的保密性，并对您账户下发生的所有活动负责。",
    terms4Title: "4. 服务变更",
    terms4Text: "我们保留随时修改或终止服务的权利，恕不另行通知。",
    privacyText:
      "我们非常重视您的隐私。本隐私政策说明了我们如何收集、使用和保护您的信息。",
    privacyCollectTitle: "信息收集",
    privacyCollectText1: "未登录用户：",
    privacyCollectText2:
      "您的留言数据仅存储在您的本地设备上，我们不会上传至服务器。",
    privacyCollectText3: "注册用户：",
    privacyCollectText4:
      "我们会收集您的邮箱地址用于账号验证。您的公开留言将存储在我们的服务器上。",
    privacyUseTitle: "数据使用",
    privacyUseText:
      "我们仅使用收集的信息来提供和改进服务。我们不会将您的个人信息出售给第三方。",
    privacySecurityTitle: "数据安全",
    privacySecurityText:
      "我们采取合理的安全措施来保护您的信息免受未经授权的访问或披露。",
    refundText1: "Echoes Of The Stars 目前提供的所有基础服务均为免费。",
    refundText2:
      "如果未来推出付费增值服务（如 VIP 会员），我们将遵循以下退款原则：",
    refundList1:
      "由于数字商品的特殊性，原则上订阅服务一旦生效，不支持无理由退款。",
    refundList2:
      "如果是由于系统故障导致您重复扣款或未能享受到相应服务，请联系客服处理退款。",
    refundContact: "如有任何疑问，请通过“联系方式”页面与我们取得联系。",
    suggestionText:
      "您的建议是我们进步的动力！如果您有任何想法或功能请求，请告诉我们。",
    emailTo: "请发送邮件至：",
    emailTitleSuggestion: "邮件标题请注明【建议反馈】",
    bugText: "如果您在使用过程中遇到任何问题或 Bug，请协助我们修复它。",
    bugInfo:
      "为了帮助我们要快速定位问题，请在邮件中包含：\n- 问题描述\n- 复现步骤\n- 截图或录屏（如果有）\n- 设备型号和浏览器版本",
    aboutContentTitle: "关于发布内容",
    aboutContentText:
      "点击输入,可以输入内容。每个星点,是可点击的内容。内容卡片可点击查看评论详情。",
    aboutContentNote:
      "未登录用户的内容仅保存在本地设备，其他用户无法看到。只有注册并登录用户的内容，才能被其他用户看到并互动。",
    communityRulesTitle: "社区规范",
    communityRulesText: "请文明礼貌发言，共同维护良好的社区氛围。",
    communityRulesNote:
      "严禁发布涉及政治、色情、暴力等违规内容。违规者将会被永久封号处理。",
  },
  en: {
    contact: "Contact",
    terms: "Terms of Use",
    privacy: "Privacy Policy",
    refund: "Refund Policy",
    suggestion: "Feedback",
    bug: "Bug Report",
    about: "About & Rules",
    moreInfo: "More Info",
    copy: "Copy",
    copied: "Copied",
    contactText:
      "If you have any questions, suggestions, or business inquiries, please contact us:",
    replyTime: "We usually reply within 24 hours.",
    lastUpdated: "Last updated: December 11, 2025",
    terms1Title: "1. Acceptance of Terms",
    terms1Text:
      "Welcome to Echoes Of The Stars. By accessing or using this app, you agree to be bound by these terms.",
    terms2Title: "2. User Conduct",
    terms2Text:
      "You agree not to use the service to post any illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, invasive of privacy, or racially discriminatory content.",
    terms3Title: "3. Account Security",
    terms3Text:
      "You are responsible for maintaining the confidentiality of your account information and for all activities under your account.",
    terms4Title: "4. Service Changes",
    terms4Text:
      "We reserve the right to modify or terminate the service at any time without notice.",
    privacyText:
      "We value your privacy. This policy explains how we collect, use, and protect your information.",
    privacyCollectTitle: "Information Collection",
    privacyCollectText1: "Guest Users:",
    privacyCollectText2:
      "Your data is stored locally on your device and not uploaded to our servers.",
    privacyCollectText3: "Registered Users:",
    privacyCollectText4:
      "We collect your email for verification. Your public posts are stored on our servers.",
    privacyUseTitle: "Data Usage",
    privacyUseText:
      "We use collected information only to provide and improve the service. We do not sell your personal information.",
    privacySecurityTitle: "Data Security",
    privacySecurityText:
      "We take reasonable measures to protect your information from unauthorized access or disclosure.",
    refundText1:
      "All basic services of Echoes Of The Stars are currently free.",
    refundText2:
      "If paid services (e.g., VIP) are introduced, the following refund principles will apply:",
    refundList1:
      "Due to the nature of digital goods, subscriptions are generally non-refundable once active.",
    refundList2:
      "If you are charged incorrectly due to system errors, please contact support for a refund.",
    refundContact:
      "For any questions, please contact us via the 'Contact' page.",
    suggestionText:
      "Your suggestions drive us forward! Let us know your ideas or feature requests.",
    emailTo: "Please email to:",
    emailTitleSuggestion: "Please use subject: [Feedback]",
    bugText: "If you encounter any issues or bugs, please help us fix them.",
    bugInfo:
      "To help us locate the issue, please include:\n- Description\n- Steps to reproduce\n- Screenshots/Recordings\n- Device & Browser version",
    aboutContentTitle: "About Content",
    aboutContentText:
      "Click input to type. Each star is clickable content. Click cards to view comments.",
    aboutContentNote:
      "Guest content is local only. Only registered users' content is visible to others.",
    communityRulesTitle: "Community Rules",
    communityRulesText:
      "Please be polite and maintain a good community atmosphere.",
    communityRulesNote:
      "Political, pornographic, violent, or other prohibited content is strictly forbidden. Violators will be permanently banned.",
  },
};

export default function InfoPanel({
  onClose,
  isClosing = false,
  initialView = "main",
  language = "zh",
}: InfoPanelProps) {
  const [currentView, setCurrentView] = useState<View>(initialView);
  const t = translations[language] || translations.en;

  const renderContent = () => {
    switch (currentView) {
      case "contact":
        return (
          <DetailView
            title={t.contact}
            onBack={() => setCurrentView("main")}
            onClose={onClose}
            content={
              <div className="space-y-6">
                <p className="text-white/80 text-sm leading-relaxed">
                  {t.contactText}
                </p>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs text-white/40">Email</span>
                      <span className="text-sm text-white font-medium truncate">
                        ji569514123@gmail.com
                      </span>
                    </div>
                  </div>
                  <CopyButton text="ji569514123@gmail.com" title={t.copy} />
                </div>
                <p className="text-white/40 text-xs">{t.replyTime}</p>
              </div>
            }
          />
        );
      case "terms":
        return (
          <DetailView
            title={t.terms}
            onBack={() => setCurrentView("main")}
            onClose={onClose}
            content={
              <div className="space-y-4 text-white/80 text-sm leading-relaxed">
                <p>{t.lastUpdated}</p>
                <h4 className="text-white font-medium mt-4">{t.terms1Title}</h4>
                <p>{t.terms1Text}</p>
                <h4 className="text-white font-medium mt-4">{t.terms2Title}</h4>
                <p>{t.terms2Text}</p>
                <h4 className="text-white font-medium mt-4">{t.terms3Title}</h4>
                <p>{t.terms3Text}</p>
                <h4 className="text-white font-medium mt-4">{t.terms4Title}</h4>
                <p>{t.terms4Text}</p>
              </div>
            }
          />
        );
      case "privacy":
        return (
          <DetailView
            title={t.privacy}
            onBack={() => setCurrentView("main")}
            onClose={onClose}
            content={
              <div className="space-y-4 text-white/80 text-sm leading-relaxed">
                <p>{t.privacyText}</p>
                <h4 className="text-white font-medium mt-4">
                  {t.privacyCollectTitle}
                </h4>
                <p>
                  - <strong>{t.privacyCollectText1}</strong>{" "}
                  {t.privacyCollectText2}
                  <br />- <strong>{t.privacyCollectText3}</strong>{" "}
                  {t.privacyCollectText4}
                </p>
                <h4 className="text-white font-medium mt-4">
                  {t.privacyUseTitle}
                </h4>
                <p>{t.privacyUseText}</p>
                <h4 className="text-white font-medium mt-4">
                  {t.privacySecurityTitle}
                </h4>
                <p>{t.privacySecurityText}</p>
              </div>
            }
          />
        );
      case "refund":
        return (
          <DetailView
            title={t.refund}
            onBack={() => setCurrentView("main")}
            onClose={onClose}
            content={
              <div className="space-y-4 text-white/80 text-sm leading-relaxed">
                <p>{t.refundText1}</p>
                <p>{t.refundText2}</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>{t.refundList1}</li>
                  <li>{t.refundList2}</li>
                </ul>
                <p className="mt-4">{t.refundContact}</p>
              </div>
            }
          />
        );
      case "suggestion":
        return (
          <DetailView
            title={t.suggestion}
            onBack={() => setCurrentView("main")}
            onClose={onClose}
            content={
              <div className="space-y-6">
                <p className="text-white/80 text-sm leading-relaxed">
                  {t.suggestionText}
                </p>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-sm text-white/60 mb-2">{t.emailTo}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white font-medium">
                      ji569514123@gmail.com
                    </span>
                    <CopyButton text="ji569514123@gmail.com" title={t.copy} />
                  </div>
                  <p className="text-xs text-white/40 mt-2">
                    {t.emailTitleSuggestion}
                  </p>
                </div>
              </div>
            }
          />
        );
      case "bug":
        return (
          <DetailView
            title={t.bug}
            onBack={() => setCurrentView("main")}
            onClose={onClose}
            content={
              <div className="space-y-6">
                <p className="text-white/80 text-sm leading-relaxed">
                  {t.bugText}
                </p>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-sm text-white/60 mb-2">{t.emailTo}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white font-medium">
                      ji569514123@gmail.com
                    </span>
                    <CopyButton text="ji569514123@gmail.com" title={t.copy} />
                  </div>
                  <p className="text-xs text-white/40 mt-4 whitespace-pre-line">
                    {t.bugInfo}
                  </p>
                </div>
              </div>
            }
          />
        );
      default:
        return (
          <>
            {/* Header */}
            <div className="relative pt-6 pb-4 px-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-white text-xl font-medium">{t.about}</h2>
              <button
                onClick={() => {
                  triggerHapticFeedback();
                  onClose();
                }}
                className="text-white/60 hover:text-white transition-colors btn-icon"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              {/* Tips Section */}
              <div className="space-y-6">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-indigo-400 font-medium mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    {t.aboutContentTitle}
                  </h3>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {t.aboutContentText}
                  </p>
                  <span className="text-white/60 mt-1 block text-xs">
                    {t.aboutContentNote}
                  </span>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    {t.communityRulesTitle}
                  </h3>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {t.communityRulesText}
                    <br />
                    <span className="text-white/60 mt-1 block text-xs">
                      {t.communityRulesNote}
                    </span>
                  </p>
                </div>
              </div>

              {/* Footer Links */}
              <div className="pt-4 border-t border-white/10">
                <h3 className="text-white/40 text-xs font-medium mb-4 uppercase tracking-wider">
                  {t.moreInfo}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <FooterLink
                    icon={Mail}
                    label={t.contact}
                    onClick={() => setCurrentView("contact")}
                  />
                  <FooterLink
                    icon={FileText}
                    label={t.terms}
                    onClick={() => setCurrentView("terms")}
                  />
                  <FooterLink
                    icon={Shield}
                    label={t.privacy}
                    onClick={() => setCurrentView("privacy")}
                  />
                  <FooterLink
                    icon={CreditCard}
                    label={t.refund}
                    onClick={() => setCurrentView("refund")}
                  />
                  <FooterLink
                    icon={MessageSquare}
                    label={t.suggestion}
                    onClick={() => setCurrentView("suggestion")}
                  />
                  <FooterLink
                    icon={Bug}
                    label={t.bug}
                    onClick={() => setCurrentView("bug")}
                  />
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ pointerEvents: "auto" }}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/70 backdrop-blur-md cursor-pointer ${
          isClosing ? "animate-backdrop-exit" : "animate-backdrop-enter"
        }`}
        onClick={() => {
          triggerHapticFeedback();
          onClose();
        }}
      />

      {/* Panel */}
      <div
        className={`relative z-10 w-full max-w-md bg-gradient-to-b from-gray-900/95 to-black/95 rounded-2xl max-h-[85vh] flex flex-col overflow-hidden ${
          isClosing ? "animate-panel-exit" : "animate-panel-enter"
        }`}
        style={{ backdropFilter: "blur(20px)", pointerEvents: "auto" }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {renderContent()}
      </div>
    </div>
  );
}

function FooterLink({
  icon: Icon,
  label,
  onClick,
}: {
  icon: any;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        triggerHapticFeedback();
        onClick();
      }}
      className="flex items-center justify-center gap-2 text-white/60 hover:text-white transition-colors text-sm p-2 rounded-lg hover:bg-white/5 w-full text-left"
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}

function DetailView({
  title,
  content,
  onBack,
  onClose,
}: {
  title: string;
  content: React.ReactNode;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="relative pt-6 pb-4 px-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              triggerHapticFeedback();
              onBack();
            }}
            className="text-white/60 hover:text-white transition-colors btn-icon -ml-2"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-white text-xl font-medium">{title}</h2>
        </div>
        <button
          onClick={() => {
            triggerHapticFeedback();
            onClose();
          }}
          className="text-white/60 hover:text-white transition-colors btn-icon"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6">{content}</div>
    </>
  );
}

function CopyButton({
  text,
  title = "Copy",
}: {
  text: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    triggerHapticFeedback();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
      title={title}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}
