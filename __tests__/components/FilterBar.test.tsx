import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterBar from '../../components/public/FilterBar';
import type { Filters } from '../../components/public/FilterBar';

vi.mock('../../services/publicArticleService', () => ({
  getCategories: vi.fn().mockResolvedValue({ categories: ['Market News', 'Investment'] }),
  getLocations: vi.fn().mockResolvedValue({ locations: ['Sydney', 'Melbourne', 'Brisbane'] }),
}));

const defaultFilters: Filters = {
  search: '',
  location: '',
  category: '',
  dateRange: 'all',
};

function renderBar(overrides: Partial<Parameters<typeof FilterBar>[0]> = {}) {
  const onChange = vi.fn();
  const result = render(
    <FilterBar
      filters={defaultFilters}
      onChange={onChange}
      {...overrides}
    />
  );
  return { ...result, onChange };
}

describe('FilterBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input', () => {
    renderBar();
    expect(screen.getByPlaceholderText('Search property news...')).toBeInTheDocument();
  });

  it('renders location and category dropdowns', async () => {
    renderBar();
    expect(screen.getByDisplayValue('All Locations')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Categories')).toBeInTheDocument();
  });

  it('renders date range buttons', () => {
    renderBar();
    expect(screen.getByRole('button', { name: 'All Time' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'This Week' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'This Month' })).toBeInTheDocument();
  });

  it('calls onChange after debounce when search input changes', async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { container } = render(<FilterBar filters={defaultFilters} onChange={onChange} />);

    const input = container.querySelector('input[type="search"]') as HTMLInputElement;
    // Fire native React onChange via fireEvent (avoids userEvent + fakeTimers conflict)
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(input, { target: { value: 'sydney' } });

    expect(onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ search: 'sydney' }));

    vi.useRealTimers();
  });

  it('calls onChange immediately when location dropdown changes', async () => {
    const onChange = vi.fn();
    const { fireEvent } = await import('@testing-library/react');

    await act(async () => {
      render(<FilterBar filters={defaultFilters} onChange={onChange} />);
    });

    // After act, async useEffect (getLocations mock) has resolved and options are rendered
    const selects = screen.getAllByRole('combobox');
    const locationSelect = selects[0] as HTMLSelectElement;
    fireEvent.change(locationSelect, { target: { value: 'Sydney' } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ location: 'Sydney' }));
  });

  it('does not show clear button when no active filters', () => {
    renderBar();
    expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();
  });

  it('shows clear button when search filter is active', () => {
    renderBar({ filters: { ...defaultFilters, search: 'test' } });
    expect(screen.getByText('Clear filters')).toBeInTheDocument();
  });

  it('clear button resets all filters', () => {
    const onChange = vi.fn();
    render(<FilterBar filters={{ ...defaultFilters, search: 'test', location: 'Sydney' }} onChange={onChange} />);

    screen.getByText('Clear filters').click();
    expect(onChange).toHaveBeenCalledWith({
      search: '',
      location: '',
      category: '',
      dateRange: 'all',
    });
  });

  it('shows detected location pill when location matches detectedLocation', () => {
    renderBar({
      filters: { ...defaultFilters, location: 'Sydney' },
      detectedLocation: 'Sydney',
      locationLoading: false,
    });
    expect(screen.getByText(/Using your location: Sydney/)).toBeInTheDocument();
  });

  it('does not show detected location pill when location differs from detectedLocation', () => {
    renderBar({
      filters: { ...defaultFilters, location: 'Melbourne' },
      detectedLocation: 'Sydney',
      locationLoading: false,
    });
    expect(screen.queryByText(/Using your location/)).not.toBeInTheDocument();
  });

  it('does not show detected location pill while location is loading', () => {
    renderBar({
      filters: { ...defaultFilters, location: 'Sydney' },
      detectedLocation: 'Sydney',
      locationLoading: true,
    });
    expect(screen.queryByText(/Using your location/)).not.toBeInTheDocument();
  });
});
