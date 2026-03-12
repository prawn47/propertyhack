import React from 'react';

interface ArticleImagePlaceholderProps {
  category?: string | null;
}

const ArticleImagePlaceholder: React.FC<ArticleImagePlaceholderProps> = ({ category }) => (
  <div className="w-full h-full bg-gradient-to-br from-base-300 to-brand-gold/10 flex flex-col items-center justify-center gap-2">
    <svg className="w-10 h-10 text-brand-gold/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
    {category && (
      <span className="text-sm font-medium text-brand-primary/40 uppercase tracking-wide">
        {category}
      </span>
    )}
  </div>
);

export default ArticleImagePlaceholder;
