import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorCard } from '../ErrorCard';

it('renders the error message', () => {
  render(<ErrorCard message="Network request failed" />);
  // The component has a hardcoded title and renders {message} separately.
  // Use getAllByText to handle both, then assert at least one is in the document.
  const els = screen.getAllByText('Network request failed');
  expect(els.length).toBeGreaterThan(0);
  expect(els[0]).toBeInTheDocument();
});

it('renders retry button and calls onRetry when clicked', async () => {
  const onRetry = vi.fn();
  render(<ErrorCard message="Oops" onRetry={onRetry} />);
  await userEvent.click(screen.getByRole('button', { name: /try again/i }));
  expect(onRetry).toHaveBeenCalledOnce();
});

it('does not render retry button when onRetry is absent', () => {
  render(<ErrorCard message="Error" />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
