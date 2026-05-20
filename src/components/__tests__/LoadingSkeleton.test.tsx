import { render } from '@testing-library/react';
import { LoadingSkeleton } from '../LoadingSkeleton';

it('renders skeleton elements with animate-pulse', () => {
  const { container } = render(<LoadingSkeleton />);
  expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
});
