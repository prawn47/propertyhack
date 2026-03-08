import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import HenryChatWindow from './HenryChatWindow';
import { useHenry } from '../../hooks/useHenry';

const STORAGE_KEY = 'henry-sidebar-open';

const HIDDEN_PATHS = ['/admin', '/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/auth/'];

function ChatIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-6 h-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function CloseIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function MinimiseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
    </svg>
  );
}

export default function HenrySidebar() {
  const location = useLocation();
  const pathname = location.pathname;

  const isHidden = HIDDEN_PATHS.some((p) => pathname.startsWith(p));
  if (isHidden) return null;

  return <SidebarWidget />;
}

function SidebarWidget() {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const henry = useHenry();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, isOpen ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, [isOpen]);

  // Mobile backdrop click closes the panel
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  }

  return (
    <>
      {/* Floating button — always visible when closed (and on desktop always visible) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Henry property assistant"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-brand-gold text-brand-primary shadow-lg flex items-center justify-center hover:brightness-110 hover:scale-105 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2"
        >
          <ChatIcon />
        </button>
      )}

      {/* Mobile: full-screen overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40 flex flex-col"
          onClick={handleBackdropClick}
        >
          <div className="flex flex-col bg-white w-full h-full">
            <div className="flex items-center justify-between px-4 py-3 bg-brand-primary text-white shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-brand-gold flex items-center justify-center text-brand-primary text-xs font-bold">
                  H
                </div>
                <span className="font-semibold text-sm">Henry</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close Henry"
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <HenryChatWindow
                messages={henry.messages}
                isStreaming={henry.isStreaming}
                isThinking={henry.isThinking}
                error={henry.error}
                onSendMessage={henry.sendMessage}
                onRateMessage={henry.rateMessage}
                compact={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Desktop: slide-up panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="hidden md:flex fixed bottom-6 right-6 z-50 flex-col w-[400px] max-h-[600px] bg-white rounded-2xl shadow-2xl border border-base-300 overflow-hidden animate-fade-in-up"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-brand-primary text-white shrink-0 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-brand-gold flex items-center justify-center text-brand-primary text-xs font-bold">
                H
              </div>
              <span className="font-semibold text-sm">Henry</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Minimise Henry"
                className="p-1.5 rounded hover:bg-white/10 transition-colors"
              >
                <MinimiseIcon />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close Henry"
                className="p-1.5 rounded hover:bg-white/10 transition-colors"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Chat body */}
          <div className="flex-1 min-h-0">
            <HenryChatWindow
              messages={henry.messages}
              isStreaming={henry.isStreaming}
              isThinking={henry.isThinking}
              error={henry.error}
              onSendMessage={henry.sendMessage}
              onRateMessage={henry.rateMessage}
              compact={true}
            />
          </div>
        </div>
      )}

      {/* Desktop floating button when open (not shown — panel replaces it) */}
    </>
  );
}
