import React from 'react';

interface ArticleImagePlaceholderProps {
  className?: string;
}

const ArticleImagePlaceholder: React.FC<ArticleImagePlaceholderProps> = ({ className = 'w-12 h-12 text-brand-gold/40' }) => (
  <div className="w-full h-full flex items-center justify-center">
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  </div>
);

export default ArticleImagePlaceholder;
