import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ArticleFeed from '../../components/public/ArticleFeed';
import type { Filters } from '../../components/public/FilterBar';
import type { PublicArticle } from '../../services/publicArticleService';

const mockGetArticles = vi.fn();

vi.mock('../../services/publicArticleService', () => ({
  getArticles: (...args: unknown[]) => mockGetArticles(...args),
  getCategories: vi.fn().mockResolvedValue({ categories: [] }),
  getLocations: vi.fn().mockResolvedValue({ locations: [] }),
}));

const defaultFilters: Filters = {
  search: '',
  location: '',
  category: '',
  dateRange: 'all',
};

function makeArticle(overrides: Partial<PublicArticle> = {}): PublicArticle {
  return {
    id: 'a1',
    sourceId: null,
    sourceUrl: 'https://example.com',
    title: 'Test Article Title',
    shortBlurb: 'A short summary.',
    longSummary: null,
    imageUrl: null,
    imageAltText: null,
    slug: 'test-article-title',
    category: 'Market News',
    location: 'Sydney',
    market: 'AU',
    status: 'PUBLISHED',
    isFeatured: false,
    viewCount: 0,
    publishedAt: '2024-06-01T00:00:00Z',
    metadata: null,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
    source: { id: 's1', name: 'Domain', type: 'NEWS' },
    ...overrides,
  };
}

function renderFeed(filters: Filters = defaultFilters) {
  return render(
    <MemoryRouter>
      <ArticleFeed filters={filters} />
    </MemoryRouter>
  );
}

describe('ArticleFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeletons while data is loading', () => {
    mockGetArticles.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = renderFeed();
    expect(container.querySelector('.animate-pulse-soft')).toBeInTheDocument();
  });

  it('renders article cards when data loads', async () => {
    mockGetArticles.mockResolvedValue({
      articles: [makeArticle({ id: 'a1', title: 'First Article', slug: 'first-article' })],
      total: 1,
      page: 1,
      totalPages: 1,
    });

    renderFeed();

    await waitFor(() => {
      expect(screen.getByText('First Article')).toBeInTheDocument();
    });
  });

  it('shows empty state when no articles returned', async () => {
    mockGetArticles.mockResolvedValue({
      articles: [],
      total: 0,
      page: 1,
      totalPages: 1,
    });

    renderFeed();

    await waitFor(() => {
      expect(screen.getByText('No articles found')).toBeInTheDocument();
    });
  });

  it('shows "Load more" button when more pages exist', async () => {
    mockGetArticles.mockResolvedValue({
      articles: [makeArticle()],
      total: 40,
      page: 1,
      totalPages: 3,
    });

    renderFeed();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Load more articles/i })).toBeInTheDocument();
    });
  });

  it('does not show "Load more" when on last page', async () => {
    mockGetArticles.mockResolvedValue({
      articles: [makeArticle()],
      total: 1,
      page: 1,
      totalPages: 1,
    });

    renderFeed();

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Load more/i })).not.toBeInTheDocument();
    });
  });

  it('loads next page when "Load more" is clicked', async () => {
    const page1Article = makeArticle({ id: 'a1', title: 'Page 1 Article' });
    const page2Article = makeArticle({ id: 'a2', title: 'Page 2 Article', slug: 'page-2-article' });

    mockGetArticles
      .mockResolvedValueOnce({ articles: [page1Article], total: 2, page: 1, totalPages: 2 })
      .mockResolvedValueOnce({ articles: [page2Article], total: 2, page: 2, totalPages: 2 });

    const user = userEvent.setup();
    renderFeed();

    await waitFor(() => screen.getByText('Page 1 Article'));
    await user.click(screen.getByRole('button', { name: /Load more articles/i }));

    await waitFor(() => {
      expect(screen.getByText('Page 2 Article')).toBeInTheDocument();
    });
    expect(screen.getByText('Page 1 Article')).toBeInTheDocument(); // still visible
  });

  it('shows error and retry button on fetch failure', async () => {
    mockGetArticles.mockRejectedValue(new Error('Network error'));

    renderFeed();

    await waitFor(() => {
      expect(screen.getByText('Failed to load articles. Please try again.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    });
  });

  it('renders featured articles with featured prop', async () => {
    mockGetArticles.mockResolvedValue({
      articles: [makeArticle({ id: 'f1', title: 'Featured Article', isFeatured: true, slug: 'featured-article' })],
      total: 1,
      page: 1,
      totalPages: 1,
    });

    renderFeed();

    await waitFor(() => {
      expect(screen.getByText('Featured Article')).toBeInTheDocument();
    });

    const link = screen.getByRole('link', { name: /Featured Article/i });
    expect(link.closest('.col-span-full')).toBeInTheDocument();
  });
});
