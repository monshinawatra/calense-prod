import { render } from '@testing-library/react';
import { LoadingSkeleton } from '../LoadingSkeleton';

it('renders skeleton elements with animate-shimmer', () => {
  const { container } = render(<LoadingSkeleton />);
  expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
});
