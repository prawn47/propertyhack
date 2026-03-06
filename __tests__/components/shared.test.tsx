import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import EmptyState from '../../components/shared/EmptyState';

describe('LoadingSpinner', () => {
  it('renders with default medium size', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status', { name: 'Loading' });
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('w-8', 'h-8');
  });

  it('renders with small size', () => {
    render(<LoadingSpinner size="sm" />);
    const spinner = screen.getByRole('status', { name: 'Loading' });
    expect(spinner).toHaveClass('w-4', 'h-4');
  });

  it('renders with large size', () => {
    render(<LoadingSpinner size="lg" />);
    const spinner = screen.getByRole('status', { name: 'Loading' });
    expect(spinner).toHaveClass('w-12', 'h-12');
  });
});

describe('EmptyState', () => {
  it('renders title and message', () => {
    render(<EmptyState title="Nothing here" message="No items to display" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('No items to display')).toBeInTheDocument();
  });

  it('renders optional action node when provided', () => {
    render(
      <EmptyState
        title="Empty"
        message="Nothing found"
        action={<button>Try again</button>}
      />
    );
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('does not render action area when action is omitted', () => {
    const { container } = render(<EmptyState title="Empty" message="Nothing found" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
