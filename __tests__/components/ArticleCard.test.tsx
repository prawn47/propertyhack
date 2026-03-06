import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ArticleCard from '../../components/public/ArticleCard';
import type { PublicArticle } from '../../services/publicArticleService';

const baseArticle: PublicArticle = {
  id: '1',
  sourceId: null,
  sourceUrl: 'https://example.com/article',
  title: 'Sydney Property Market Surges',
  shortBlurb: 'Prices in Sydney have hit new highs this quarter.',
  longSummary: null,
  imageUrl: null,
  imageAltText: null,
  slug: 'sydney-property-market-surges',
  category: 'Market News',
  location: 'Sydney',
  market: 'AU',
  status: 'PUBLISHED',
  isFeatured: false,
  viewCount: 42,
  publishedAt: '2024-06-01T00:00:00Z',
  metadata: null,
  createdAt: '2024-06-01T00:00:00Z',
  updatedAt: '2024-06-01T00:00:00Z',
  source: { id: 's1', name: 'Domain', type: 'NEWS' },
};

function renderCard(props: Partial<Parameters<typeof ArticleCard>[0]> = {}) {
  return render(
    <MemoryRouter>
      <ArticleCard article={baseArticle} {...props} />
    </MemoryRouter>
  );
}

describe('ArticleCard', () => {
  it('renders title and blurb', () => {
    renderCard();
    expect(screen.getByText('Sydney Property Market Surges')).toBeInTheDocument();
    expect(screen.getByText('Prices in Sydney have hit new highs this quarter.')).toBeInTheDocument();
  });

  it('renders source name', () => {
    renderCard();
    expect(screen.getByText('Domain')).toBeInTheDocument();
  });

  it('renders a time element', () => {
    renderCard();
    expect(screen.getByRole('time')).toBeInTheDocument();
  });

  it('links to the correct article slug', () => {
    renderCard();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/articles/sydney-property-market-surges');
  });

  it('shows gold border class when isFeatured via prop', () => {
    renderCard({ featured: true });
    const link = screen.getByRole('link');
    expect(link.className).toContain('border-brand-gold');
  });

  it('shows gold border class when article.isFeatured is true', () => {
    renderCard({ article: { ...baseArticle, isFeatured: true } });
    const link = screen.getByRole('link');
    expect(link.className).toContain('border-brand-gold');
  });

  it('does not apply gold border when not featured', () => {
    renderCard();
    const link = screen.getByRole('link');
    expect(link.className).not.toContain('border-l-4');
  });

  it('shows fallback SVG icon when no image', () => {
    renderCard();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    // SVG fallback is rendered inside the image container
    const link = screen.getByRole('link');
    expect(link.querySelector('svg')).toBeInTheDocument();
  });

  it('renders image when imageUrl is set', () => {
    renderCard({ article: { ...baseArticle, imageUrl: 'https://example.com/img.jpg', imageAltText: 'A house' } });
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');
    expect(img).toHaveAttribute('alt', 'A house');
  });

  it('falls back to article title as alt text when imageAltText is missing', () => {
    renderCard({ article: { ...baseArticle, imageUrl: 'https://example.com/img.jpg' } });
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', baseArticle.title);
  });

  it('shows "PropertyHack" when source is null', () => {
    renderCard({ article: { ...baseArticle, source: null } });
    expect(screen.getByText('PropertyHack')).toBeInTheDocument();
  });
});
