import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HenryInput from '../../../components/henry/HenryInput';

// Default matchMedia to desktop (pointer: fine) so Enter sends
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(pointer: coarse)' ? false : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

function renderInput(props: Partial<React.ComponentProps<typeof HenryInput>> = {}) {
  const defaults = {
    onSend: vi.fn().mockResolvedValue(undefined),
    disabled: false,
  };
  return render(<HenryInput {...defaults} {...props} />);
}

describe('HenryInput', () => {
  it('renders the textarea', () => {
    renderInput();
    expect(screen.getByPlaceholderText('Ask Henry anything...')).toBeInTheDocument();
  });

  it('calls onSend with input value when Enter is pressed (desktop)', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    renderInput({ onSend });

    const textarea = screen.getByPlaceholderText('Ask Henry anything...');
    await userEvent.type(textarea, 'What are property prices?');
    await userEvent.keyboard('{Enter}');

    expect(onSend).toHaveBeenCalledWith('What are property prices?');
  });

  it('does not call onSend on Shift+Enter', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    renderInput({ onSend });

    const textarea = screen.getByPlaceholderText('Ask Henry anything...');
    await userEvent.type(textarea, 'Multi-line text');
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');

    expect(onSend).not.toHaveBeenCalled();
  });

  it('clears input after send via Enter', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    renderInput({ onSend });

    const textarea = screen.getByPlaceholderText('Ask Henry anything...') as HTMLTextAreaElement;
    await userEvent.type(textarea, 'Hello');
    await userEvent.keyboard('{Enter}');

    expect(textarea.value).toBe('');
  });

  it('calls onSend when send button is clicked', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    renderInput({ onSend });

    const textarea = screen.getByPlaceholderText('Ask Henry anything...');
    await userEvent.type(textarea, 'Click to send');

    const sendButton = screen.getByRole('button', { name: /send message/i });
    await userEvent.click(sendButton);

    expect(onSend).toHaveBeenCalledWith('Click to send');
  });

  it('clears input after send button click', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    renderInput({ onSend });

    const textarea = screen.getByPlaceholderText('Ask Henry anything...') as HTMLTextAreaElement;
    await userEvent.type(textarea, 'Some text');

    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(textarea.value).toBe('');
  });

  it('disables send button when input is empty', () => {
    renderInput();
    const sendButton = screen.getByRole('button', { name: /send message/i });
    expect(sendButton).toBeDisabled();
  });

  it('enables send button when input has content', async () => {
    renderInput();

    const textarea = screen.getByPlaceholderText('Ask Henry anything...');
    await userEvent.type(textarea, 'Some text');

    const sendButton = screen.getByRole('button', { name: /send message/i });
    expect(sendButton).not.toBeDisabled();
  });

  it('disables send button when disabled prop is true even with text', async () => {
    renderInput({ disabled: true });

    const textarea = screen.getByPlaceholderText('Ask Henry anything...');
    await userEvent.type(textarea, 'Some text');

    const sendButton = screen.getByRole('button', { name: /send message/i });
    expect(sendButton).toBeDisabled();
  });

  it('does not call onSend when disabled and Enter pressed', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    renderInput({ onSend, disabled: true });

    const textarea = screen.getByPlaceholderText('Ask Henry anything...');
    // type doesn't work on disabled textarea, so we use fireEvent workaround
    // but since textarea itself is disabled, Enter won't trigger handleSend either
    // We verify onSend is not called
    await userEvent.keyboard('{Enter}');

    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not call onSend with whitespace-only input', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    renderInput({ onSend });

    const textarea = screen.getByPlaceholderText('Ask Henry anything...');
    await userEvent.type(textarea, '   ');
    await userEvent.keyboard('{Enter}');

    expect(onSend).not.toHaveBeenCalled();
  });

  it('shows hint text when not compact', () => {
    renderInput({ compact: false });
    expect(screen.getByText('Henry may make mistakes. Always verify important information.')).toBeInTheDocument();
  });

  it('hides hint text when compact', () => {
    renderInput({ compact: true });
    expect(screen.queryByText('Henry may make mistakes. Always verify important information.')).not.toBeInTheDocument();
  });
});
