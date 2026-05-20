import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorCard } from '../ErrorCard';

it('renders the error message', () => {
  render(<ErrorCard message="Something went wrong" />);
  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
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
