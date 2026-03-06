import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RelatedArticles from '../../components/public/RelatedArticles';
import type { PublicArticle } from '../../services/publicArticleService';

const mockGetRelatedArticles = vi.fn();

vi.mock('../../services/publicArticleService', () => ({
  getRelatedArticles: (...args: unknown[]) => mockGetRelatedArticles(...args),
}));

function makeArticle(overrides: Partial<PublicArticle> = {}): PublicArticle {
  return {
    id: 'r1',
    sourceId: null,
    sourceUrl: 'https://example.com',
    title: 'Related Article',
    shortBlurb: 'A related piece.',
    longSummary: null,
    imageUrl: null,
    imageAltText: null,
    slug: 'related-article',
    category: 'Investment',
    location: 'Melbourne',
    market: 'AU',
    status: 'PUBLISHED',
    isFeatured: false,
    viewCount: 5,
    publishedAt: '2024-05-15T00:00:00Z',
    metadata: null,
    createdAt: '2024-05-15T00:00:00Z',
    updatedAt: '2024-05-15T00:00:00Z',
    source: null,
    ...overrides,
  };
}

function renderRelated(slug = 'some-article') {
  return render(
    <MemoryRouter>
      <RelatedArticles slug={slug} />
    </MemoryRouter>
  );
}

describe('RelatedArticles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeletons while fetching', () => {
    mockGetRelatedArticles.mockReturnValue(new Promise(() => {}));
    const { container } = renderRelated();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders related article cards when data loads', async () => {
    mockGetRelatedArticles.mockResolvedValue({
      articles: [
        makeArticle({ id: 'r1', title: 'Related One', slug: 'related-one' }),
        makeArticle({ id: 'r2', title: 'Related Two', slug: 'related-two' }),
      ],
    });

    renderRelated();

    await waitFor(() => {
      expect(screen.getByText('Related One')).toBeInTheDocument();
      expect(screen.getByText('Related Two')).toBeInTheDocument();
    });
  });

  it('renders heading when articles are present', async () => {
    mockGetRelatedArticles.mockResolvedValue({
      articles: [makeArticle()],
    });

    renderRelated();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Related Articles' })).toBeInTheDocument();
    });
  });

  it('renders links with correct hrefs', async () => {
    mockGetRelatedArticles.mockResolvedValue({
      articles: [makeArticle({ id: 'r1', title: 'Linked Article', slug: 'linked-article' })],
    });

    renderRelated();

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /Linked Article/i });
      expect(link).toHaveAttribute('href', '/articles/linked-article');
    });
  });

  it('renders nothing when articles array is empty', async () => {
    mockGetRelatedArticles.mockResolvedValue({ articles: [] });

    const { container } = renderRelated();

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('hides loading state after fetch completes', async () => {
    mockGetRelatedArticles.mockResolvedValue({ articles: [] });

    const { container } = renderRelated();

    await waitFor(() => {
      expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
    });
  });

  it('renders article image when imageUrl is provided', async () => {
    mockGetRelatedArticles.mockResolvedValue({
      articles: [makeArticle({ imageUrl: 'https://example.com/img.jpg', imageAltText: 'House photo' })],
    });

    renderRelated();

    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');
    });
  });

  it('shows fallback SVG when no imageUrl', async () => {
    mockGetRelatedArticles.mockResolvedValue({
      articles: [makeArticle({ imageUrl: null })],
    });

    const { container } = renderRelated();

    await waitFor(() => screen.getByText('Related Article'));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
