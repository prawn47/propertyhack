import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import HenryMessageBubble from '../../../components/henry/HenryMessageBubble';

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

vi.mock('remark-gfm', () => ({
  default: () => null,
}));

function makeMsg(overrides: Partial<{
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Array<{ articleId: string; title: string; slug: string; similarity: number }>;
  calculatorCall: { type: string; inputs: Record<string, unknown>; outputs: Record<string, unknown> } | undefined;
  isStreaming: boolean;
}> = {}) {
  return {
    id: 'msg-1',
    role: 'user' as const,
    content: 'Hello world',
    citations: [],
    calculatorCall: undefined,
    isStreaming: false,
    ...overrides,
  };
}

function renderBubble(
  message: ReturnType<typeof makeMsg>,
  onRate = vi.fn()
) {
  return render(
    <MemoryRouter>
      <HenryMessageBubble message={message} onRate={onRate} />
    </MemoryRouter>
  );
}

describe('HenryMessageBubble', () => {
  describe('user messages', () => {
    it('renders content', () => {
      renderBubble(makeMsg({ role: 'user', content: 'What is stamp duty?' }));
      expect(screen.getByText('What is stamp duty?')).toBeInTheDocument();
    });

    it('is right-aligned (justify-end)', () => {
      const { container } = renderBubble(makeMsg({ role: 'user' }));
      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain('justify-end');
    });

    it('has brand-primary background', () => {
      renderBubble(makeMsg({ role: 'user', content: 'Hello' }));
      const bubble = screen.getByText('Hello').closest('p')?.parentElement;
      expect(bubble?.className).toContain('bg-brand-primary');
    });

    it('does not show copy button', () => {
      renderBubble(makeMsg({ role: 'user' }));
      expect(screen.queryByTitle('Copy message')).not.toBeInTheDocument();
    });

    it('does not show rating buttons', () => {
      renderBubble(makeMsg({ role: 'user' }));
      expect(screen.queryByTitle('Helpful')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Not helpful')).not.toBeInTheDocument();
    });
  });

  describe('assistant messages', () => {
    it('renders content via markdown', () => {
      renderBubble(makeMsg({ role: 'assistant', content: 'Stamp duty is 4%' }));
      expect(screen.getByTestId('markdown')).toBeInTheDocument();
    });

    it('is left-aligned (justify-start)', () => {
      const { container } = renderBubble(makeMsg({ role: 'assistant' }));
      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain('justify-start');
    });

    it('has base-200 background', () => {
      renderBubble(makeMsg({ role: 'assistant', content: 'Answer here' }));
      const markdown = screen.getByTestId('markdown');
      const bubble = markdown.closest('div[class*="bg-base-200"]');
      expect(bubble).toBeInTheDocument();
    });

    it('shows copy button', () => {
      renderBubble(makeMsg({ role: 'assistant' }));
      expect(screen.getByTitle('Copy message')).toBeInTheDocument();
    });

    it('shows rating buttons when not streaming', () => {
      renderBubble(makeMsg({ role: 'assistant', isStreaming: false }));
      expect(screen.getByTitle('Helpful')).toBeInTheDocument();
      expect(screen.getByTitle('Not helpful')).toBeInTheDocument();
    });

    it('hides rating buttons when streaming', () => {
      renderBubble(makeMsg({ role: 'assistant', isStreaming: true }));
      expect(screen.queryByTitle('Helpful')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Not helpful')).not.toBeInTheDocument();
    });

    it('calls onRate with 5 when thumbs up clicked', async () => {
      const onRate = vi.fn();
      renderBubble(makeMsg({ id: 'msg-99', role: 'assistant', isStreaming: false }), onRate);

      await userEvent.click(screen.getByTitle('Helpful'));

      expect(onRate).toHaveBeenCalledWith('msg-99', 5);
    });

    it('calls onRate with 1 when thumbs down clicked', async () => {
      const onRate = vi.fn();
      renderBubble(makeMsg({ id: 'msg-99', role: 'assistant', isStreaming: false }), onRate);

      await userEvent.click(screen.getByTitle('Not helpful'));

      expect(onRate).toHaveBeenCalledWith('msg-99', 1);
    });

    it('renders citations when present', () => {
      const citations = [
        { articleId: 'a1', title: 'Sydney auction results', slug: 'sydney-auctions', similarity: 0.85 },
      ];
      renderBubble(makeMsg({ role: 'assistant', citations }));
      expect(screen.getByText('Sydney auction results')).toBeInTheDocument();
    });

    it('shows highly relevant badge when similarity >= 0.7', () => {
      const citations = [
        { articleId: 'a1', title: 'Top article', slug: 'top-article', similarity: 0.8 },
      ];
      renderBubble(makeMsg({ role: 'assistant', citations }));
      expect(screen.getByText('· Highly relevant')).toBeInTheDocument();
    });

    it('does not show highly relevant badge when similarity < 0.7', () => {
      const citations = [
        { articleId: 'a1', title: 'OK article', slug: 'ok-article', similarity: 0.5 },
      ];
      renderBubble(makeMsg({ role: 'assistant', citations }));
      expect(screen.queryByText('· Highly relevant')).not.toBeInTheDocument();
    });

    it('renders calculator result block when calculatorCall present', () => {
      const calculatorCall = {
        type: 'mortgage',
        inputs: { propertyPrice: 80000000 },
        outputs: { monthlyRepayment: 324500, totalInterest: 56820000 },
      };
      renderBubble(makeMsg({ role: 'assistant', calculatorCall }));
      expect(screen.getByText('Mortgage Estimate')).toBeInTheDocument();
    });
  });
});
