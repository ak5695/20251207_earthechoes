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
}

type View =
  | "main"
  | "contact"
  | "terms"
  | "privacy"
  | "refund"
  | "suggestion"
  | "bug";

export default function InfoPanel({
  onClose,
  isClosing = false,
}: InfoPanelProps) {
  const [currentView, setCurrentView] = useState<View>("main");

  const renderContent = () => {
    switch (currentView) {
      case "contact":
        return (
          <DetailView
            title="联系方式"
            onBack={() => setCurrentView("main")}
            content={
              <div className="space-y-6">
                <p className="text-white/80 text-sm leading-relaxed">
                  如果您有任何问题、建议或商务合作意向，欢迎通过以下方式联系我们：
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
                  <CopyButton text="ji569514123@gmail.com" />
                </div>
                <p className="text-white/40 text-xs">
                  我们通常会在 24 小时内回复您的邮件。
                </p>
              </div>
            }
          />
        );
      case "terms":
        return (
          <DetailView
            title="使用条款"
            onBack={() => setCurrentView("main")}
            content={
              <div className="space-y-4 text-white/80 text-sm leading-relaxed">
                <p>最后更新日期：2025年12月11日</p>
                <h4 className="text-white font-medium mt-4">1. 接受条款</h4>
                <p>
                  欢迎使用 Echoes Of The
                  Stars。通过访问或使用本应用，即表示您同意受这些条款的约束。
                </p>
                <h4 className="text-white font-medium mt-4">2. 用户行为</h4>
                <p>
                  您同意不使用本服务发布任何非法、有害、威胁、辱骂、骚扰、诽谤、粗俗、淫秽、侵犯他人隐私或种族歧视的内容。
                </p>
                <h4 className="text-white font-medium mt-4">3. 账户安全</h4>
                <p>
                  您有责任维护您账户信息的保密性，并对您账户下发生的所有活动负责。
                </p>
                <h4 className="text-white font-medium mt-4">4. 服务变更</h4>
                <p>我们保留随时修改或终止服务的权利，恕不另行通知。</p>
              </div>
            }
          />
        );
      case "privacy":
        return (
          <DetailView
            title="隐私政策"
            onBack={() => setCurrentView("main")}
            content={
              <div className="space-y-4 text-white/80 text-sm leading-relaxed">
                <p>
                  我们非常重视您的隐私。本隐私政策说明了我们如何收集、使用和保护您的信息。
                </p>
                <h4 className="text-white font-medium mt-4">信息收集</h4>
                <p>
                  - <strong>未登录用户：</strong>{" "}
                  您的留言数据仅存储在您的本地设备上，我们不会上传至服务器。
                  <br />- <strong>注册用户：</strong>{" "}
                  我们会收集您的邮箱地址用于账号验证。您的公开留言将存储在我们的服务器上。
                </p>
                <h4 className="text-white font-medium mt-4">数据使用</h4>
                <p>
                  我们仅使用收集的信息来提供和改进服务。我们不会将您的个人信息出售给第三方。
                </p>
                <h4 className="text-white font-medium mt-4">数据安全</h4>
                <p>
                  我们采取合理的安全措施来保护您的信息免受未经授权的访问或披露。
                </p>
              </div>
            }
          />
        );
      case "refund":
        return (
          <DetailView
            title="退款政策"
            onBack={() => setCurrentView("main")}
            content={
              <div className="space-y-4 text-white/80 text-sm leading-relaxed">
                <p>Echoes Of The Stars 目前提供的所有基础服务均为免费。</p>
                <p>
                  如果未来推出付费增值服务（如 VIP
                  会员），我们将遵循以下退款原则：
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    由于数字商品的特殊性，原则上订阅服务一旦生效，不支持无理由退款。
                  </li>
                  <li>
                    如果是由于系统故障导致您重复扣款或未能享受到相应服务，请联系客服处理退款。
                  </li>
                </ul>
                <p className="mt-4">
                  如有任何疑问，请通过“联系方式”页面与我们取得联系。
                </p>
              </div>
            }
          />
        );
      case "suggestion":
        return (
          <DetailView
            title="建议反馈"
            onBack={() => setCurrentView("main")}
            content={
              <div className="space-y-6">
                <p className="text-white/80 text-sm leading-relaxed">
                  您的建议是我们进步的动力！如果您有任何想法或功能请求，请告诉我们。
                </p>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-sm text-white/60 mb-2">请发送邮件至：</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white font-medium">
                      ji569514123@gmail.com
                    </span>
                    <CopyButton text="ji569514123@gmail.com" />
                  </div>
                  <p className="text-xs text-white/40 mt-2">
                    邮件标题请注明【建议反馈】
                  </p>
                </div>
              </div>
            }
          />
        );
      case "bug":
        return (
          <DetailView
            title="错误报告"
            onBack={() => setCurrentView("main")}
            content={
              <div className="space-y-6">
                <p className="text-white/80 text-sm leading-relaxed">
                  如果您在使用过程中遇到任何问题或 Bug，请协助我们修复它。
                </p>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-sm text-white/60 mb-2">请发送邮件至：</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white font-medium">
                      ji569514123@gmail.com
                    </span>
                    <CopyButton text="ji569514123@gmail.com" />
                  </div>
                  <p className="text-xs text-white/40 mt-4">
                    为了帮助我们要快速定位问题，请在邮件中包含：
                    <br />- 问题描述
                    <br />- 复现步骤
                    <br />- 截图或录屏（如果有）
                    <br />- 设备型号和浏览器版本
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
              <h2 className="text-white text-xl font-medium">关于与规则</h2>
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
                    关于留言可见性
                  </h3>
                  <p className="text-white/80 text-sm leading-relaxed">
                    未登录用户的留言仅保存在本地设备，其他用户无法看到。只有注册并登录用户的留言，才能被其他用户看到并互动。
                  </p>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-red-400 font-medium mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    社区规范
                  </h3>
                  <p className="text-white/80 text-sm leading-relaxed">
                    请文明礼貌发言，共同维护良好的社区氛围。
                    <br />
                    <span className="text-white/60 mt-1 block text-xs">
                      严禁发布涉及政治、色情、暴力等违规内容。违规者将会被永久封号处理。
                    </span>
                  </p>
                </div>
              </div>

              {/* Footer Links */}
              <div className="pt-4 border-t border-white/10">
                <h3 className="text-white/40 text-xs font-medium mb-4 uppercase tracking-wider">
                  更多信息
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <FooterLink
                    icon={Mail}
                    label="联系方式"
                    onClick={() => setCurrentView("contact")}
                  />
                  <FooterLink
                    icon={FileText}
                    label="使用条款"
                    onClick={() => setCurrentView("terms")}
                  />
                  <FooterLink
                    icon={Shield}
                    label="隐私政策"
                    onClick={() => setCurrentView("privacy")}
                  />
                  <FooterLink
                    icon={CreditCard}
                    label="退款政策"
                    onClick={() => setCurrentView("refund")}
                  />
                  <FooterLink
                    icon={MessageSquare}
                    label="建议反馈"
                    onClick={() => setCurrentView("suggestion")}
                  />
                  <FooterLink
                    icon={Bug}
                    label="错误报告"
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
      className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm p-2 rounded-lg hover:bg-white/5 w-full text-left"
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
}: {
  title: string;
  content: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <>
      <div className="relative pt-6 pb-4 px-6 border-b border-white/10 flex items-center gap-4">
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
      <div className="flex-1 overflow-y-auto px-6 py-6">{content}</div>
    </>
  );
}

function CopyButton({ text }: { text: string }) {
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
      title="复制"
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}
