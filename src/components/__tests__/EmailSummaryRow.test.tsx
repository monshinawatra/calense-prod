import { render, screen } from '@testing-library/react';
import { EmailSummaryRow } from '../EmailSummaryRow';
import type { BriefingResult } from '@/types';

type EmailItem = BriefingResult['top_emails'][number];

const highEmail: EmailItem = {
  sender: 'Alice',
  subject: 'Q3 Budget Review',
  summary: 'Requesting approval by Friday',
  urgency: 'high',
};

it('renders sender, subject, summary, and urgency tag', () => {
  render(<EmailSummaryRow email={highEmail} />);
  expect(screen.getByText('Alice')).toBeInTheDocument();
  expect(screen.getByText('Q3 Budget Review')).toBeInTheDocument();
  expect(screen.getByText('Requesting approval by Friday')).toBeInTheDocument();
  expect(screen.getByText('high')).toBeInTheDocument();
});

it('renders medium urgency with yellow styling class', () => {
  render(<EmailSummaryRow email={{ ...highEmail, urgency: 'medium' }} />);
  const tag = screen.getByText('medium');
  expect(tag.className).toContain('yellow');
});
