import { Link, useParams } from 'react-router-dom';

interface HenryCitationCardProps {
  articleId: string;
  title: string;
  slug: string;
  similarity: number;
  compact?: boolean;
}

export default function HenryCitationCard({
  articleId: _articleId,
  title,
  slug,
  similarity,
  compact = false,
}: HenryCitationCardProps) {
  const { country } = useParams<{ country?: string }>();
  const countryCode = country ?? 'au';
  const isHighRelevance = similarity > 0.7;

  return (
    <Link
      to={`/${countryCode}/article/${slug}`}
      className={`
        group flex items-start gap-2 no-underline
        border border-brand-gold/20 bg-white rounded-lg
        hover:shadow-sm transition-shadow
        ${compact ? 'p-1.5' : 'p-2'}
      `}
    >
      <div className="flex-shrink-0 mt-0.5">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`text-brand-gold/70 ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
          <path d="M18 14h-8" />
          <path d="M15 18h-5" />
          <path d="M10 6h8v4h-8V6Z" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={`
            font-medium text-brand-primary leading-snug truncate
            group-hover:text-brand-gold transition-colors
            ${compact ? 'text-xs' : 'text-sm'}
          `}
        >
          {title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-content-secondary ${compact ? 'text-[10px]' : 'text-xs'}`}>
            PropertyHack
          </span>
          {isHighRelevance && (
            <span
              className={`
                inline-block rounded-full bg-brand-gold/20 text-brand-gold font-medium
                ${compact ? 'text-[9px] px-1 py-px' : 'text-[10px] px-1.5 py-px'}
              `}
            >
              Relevant
            </span>
          )}
        </div>
      </div>

      <div
        className="flex-shrink-0 self-center"
        title={`Relevance: ${Math.round(similarity * 100)}%`}
      >
        <div
          className={`rounded-full bg-brand-gold ${compact ? 'w-0.5 h-5' : 'w-1 h-6'}`}
          style={{ opacity: Math.max(0.15, similarity) }}
        />
      </div>
    </Link>
  );
}
