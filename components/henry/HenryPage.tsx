import React, { useEffect, useState } from 'react';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import SeoHead from '../shared/SeoHead';
import HenryChatWindow from './HenryChatWindow';
import HenryConversationList from './HenryConversationList';
import { useHenry } from '../../hooks/useHenry';
import { useAuth } from '../../contexts/AuthContext';

const HenryPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    messages,
    conversations,
    activeConversationId,
    isStreaming,
    isThinking,
    error,
    sendMessage,
    newConversation,
    loadConversation,
    deleteConversation,
    rateMessage,
    loadConversations,
  } = useHenry();

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations();
    }
  }, [isAuthenticated, loadConversations]);

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <SeoHead
        title="Henry — Property AI Assistant"
        description="Ask Henry anything about property — market trends, mortgage estimates, stamp duty, and more. Powered by PropertyHack's article corpus."
        canonicalUrl="/henry"
      />
      <Header />

      <main className="flex-1 flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
        {/* Page header bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-base-300 flex-shrink-0">
          {isAuthenticated && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="sm:hidden p-1.5 rounded-lg hover:bg-base-200 transition-colors"
              aria-label="Toggle conversation list"
            >
              <svg className="w-5 h-5 text-content" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-gold flex items-center justify-center text-brand-primary text-sm font-bold flex-shrink-0">
              H
            </div>
            <div>
              <h1 className="text-sm font-semibold text-content leading-none">Henry</h1>
              <p className="text-xs text-content-secondary leading-none mt-0.5">Property AI Assistant</p>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Conversation list sidebar */}
          {isAuthenticated && (
            <>
              {/* Desktop: always visible */}
              <aside className="hidden sm:flex flex-col w-64 bg-brand-primary border-r border-white/10 flex-shrink-0">
                <HenryConversationList
                  conversations={conversations}
                  activeConversationId={activeConversationId}
                  onSelect={loadConversation}
                  onDelete={deleteConversation}
                  onNew={newConversation}
                />
              </aside>

              {/* Mobile: overlay drawer */}
              {sidebarOpen && (
                <>
                  <div
                    className="sm:hidden fixed inset-0 bg-black/50 z-20"
                    onClick={() => setSidebarOpen(false)}
                  />
                  <aside className="sm:hidden fixed left-0 top-0 bottom-0 w-72 bg-brand-primary z-30 flex flex-col shadow-strong">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                      <span className="text-white text-sm font-semibold">Conversations</span>
                      <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        aria-label="Close sidebar"
                      >
                        <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <HenryConversationList
                      conversations={conversations}
                      activeConversationId={activeConversationId}
                      onSelect={(id) => { loadConversation(id); setSidebarOpen(false); }}
                      onDelete={deleteConversation}
                      onNew={() => { newConversation(); setSidebarOpen(false); }}
                    />
                  </aside>
                </>
              )}
            </>
          )}

          {/* Chat window */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <HenryChatWindow
              messages={messages}
              isStreaming={isStreaming}
              isThinking={isThinking}
              error={error}
              onSendMessage={sendMessage}
              onRateMessage={rateMessage}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HenryPage;
