import React, { useState } from 'react';
import type { Conversation } from '../../services/henryService';

interface HenryConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewConversation: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  if (diffWeeks < 5) return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
  return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
}

export default function HenryConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
}: HenryConversationListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId) {
      onDeleteConversation(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="p-3 border-b border-gray-200">
        <button
          type="button"
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-gold text-brand-primary text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-content-secondary">
            No conversations yet. Start chatting with Henry!
          </div>
        ) : (
          <ul role="list" className="py-1">
            {conversations.map((convo) => {
              const isActive = convo.id === activeConversationId;
              const isPendingDelete = confirmDeleteId === convo.id;

              return (
                <li key={convo.id}>
                  <button
                    type="button"
                    onClick={() => onSelectConversation(convo.id)}
                    className={`group w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors relative ${
                      isActive
                        ? 'bg-brand-gold/10 border-l-2 border-brand-gold'
                        : 'border-l-2 border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm truncate leading-snug ${
                          isActive ? 'text-content font-medium' : 'text-content'
                        }`}
                      >
                        {convo.title}
                      </p>
                      <p className="text-xs text-content-secondary mt-0.5">
                        {formatRelativeTime(convo.updatedAt)}
                      </p>
                    </div>

                    {!isPendingDelete && (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Delete conversation: ${convo.title}`}
                        onClick={(e) => handleDeleteClick(e, convo.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setConfirmDeleteId(convo.id);
                          }
                        }}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 text-content-secondary hover:text-red-500 transition-colors rounded"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </span>
                    )}
                  </button>

                  {isPendingDelete && (
                    <div className="mx-3 mb-1 px-2 py-2 bg-red-50 border border-red-200 rounded text-xs">
                      <p className="text-red-700 mb-1.5">Delete this conversation?</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleConfirmDelete}
                          className="px-2 py-0.5 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelDelete}
                          className="px-2 py-0.5 bg-white border border-gray-300 text-content rounded text-xs hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
