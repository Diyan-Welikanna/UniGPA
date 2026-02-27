export const dynamic = 'force-dynamic';

import SessionWrapper from './SessionWrapper';

export default function SelectDegreeLayout({ children }: { children: React.ReactNode }) {
  return <SessionWrapper>{children}</SessionWrapper>;
}
