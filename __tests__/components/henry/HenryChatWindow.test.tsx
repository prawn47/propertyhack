import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import HenryChatWindow from '../../../components/henry/HenryChatWindow';

vi.mock('../../../components/henry/HenryDisclaimer', () => ({
  default: () => <div data-testid="disclaimer">Disclaimer</div>,
}));

vi.mock('../../../components/henry/HenryMessageBubble', () => ({
  default: ({ message }: { message: { id: string; content: string; role: string } }) => (
    <div data-testid={`bubble-${message.role}`}>{message.content}</div>
  ),
}));

vi.mock('../../../components/henry/HenryInput', () => ({
  default: ({ onSend, disabled }: { onSend: (v: string) => Promise<void>; disabled?: boolean }) => (
    <button
      data-testid="henry-input-send"
      disabled={disabled}
      onClick={() => onSend('test input')}
    >
      Send
    </button>
  ),
}));

function makeMessage(overrides: Partial<{ id: string; role: 'user' | 'assistant'; content: string }> = {}) {
  return {
    id: 'msg-1',
    role: 'user' as const,
    content: 'Hello',
    citations: [],
    ...overrides,
  };
}

function renderWindow(props: Partial<React.ComponentProps<typeof HenryChatWindow>> = {}) {
  const defaults = {
    messages: [],
    isStreaming: false,
    isThinking: false,
    error: null,
    onSendMessage: vi.fn().mockResolvedValue(undefined),
    onRateMessage: vi.fn().mockResolvedValue(undefined),
  };
  return render(
    <MemoryRouter>
      <HenryChatWindow {...defaults} {...props} />
    </MemoryRouter>
  );
}

describe('HenryChatWindow', () => {
  it('renders empty state with Henry greeting when no messages', () => {
    renderWindow();
    expect(screen.getByText("Hi, I'm Henry")).toBeInTheDocument();
  });

  it('renders suggested questions in empty state (non-compact)', () => {
    renderWindow();
    expect(screen.getByText('What are property prices doing in Sydney right now?')).toBeInTheDocument();
    expect(screen.getByText('How much can I borrow on a $120k salary?')).toBeInTheDocument();
  });

  it('calls onSendMessage when suggested question is clicked', async () => {
    const onSendMessage = vi.fn().mockResolvedValue(undefined);
    renderWindow({ onSendMessage });

    const btn = screen.getByText('What are property prices doing in Sydney right now?');
    await userEvent.click(btn);

    expect(onSendMessage).toHaveBeenCalledWith('What are property prices doing in Sydney right now?');
  });

  it('renders messages when provided', () => {
    const messages = [
      makeMessage({ id: '1', role: 'user', content: 'What is stamp duty?' }),
      makeMessage({ id: '2', role: 'assistant', content: 'Stamp duty is a tax...' }),
    ];
    renderWindow({ messages });

    expect(screen.getByText('What is stamp duty?')).toBeInTheDocument();
    expect(screen.getByText('Stamp duty is a tax...')).toBeInTheDocument();
  });

  it('does not show empty state when messages are present', () => {
    renderWindow({ messages: [makeMessage()] });
    expect(screen.queryByText("Hi, I'm Henry")).not.toBeInTheDocument();
  });

  it('shows thinking indicator when isThinking is true', () => {
    renderWindow({
      messages: [makeMessage()],
      isThinking: true,
    });
    // 3 animated bounce dots are rendered — check for at least one bounce span
    const bounceEls = document.querySelectorAll('.animate-bounce');
    expect(bounceEls.length).toBeGreaterThan(0);
  });

  it('does not show thinking indicator when isThinking is false', () => {
    renderWindow({ messages: [makeMessage()], isThinking: false });
    expect(document.querySelectorAll('.animate-bounce').length).toBe(0);
  });

  it('shows error message when error prop is set', () => {
    renderWindow({ error: 'Something went wrong' });
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows disclaimer when not compact', () => {
    renderWindow({ compact: false });
    expect(screen.getByTestId('disclaimer')).toBeInTheDocument();
  });

  it('hides disclaimer when compact is true', () => {
    renderWindow({ compact: true });
    expect(screen.queryByTestId('disclaimer')).not.toBeInTheDocument();
  });

  it('shows only 2 suggested questions in compact mode', () => {
    renderWindow({ compact: true });
    const buttons = screen.getAllByRole('button');
    // compact: 2 suggestion buttons + send button from HenryInput
    const suggestionButtons = buttons.filter((b) =>
      b.textContent !== 'Send' && b.className.includes('rounded-xl')
    );
    expect(suggestionButtons.length).toBe(2);
  });
});
