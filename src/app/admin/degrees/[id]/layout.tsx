export const dynamic = 'force-dynamic';

import SessionWrapper from '@/app/select-degree/SessionWrapper';

export default function AdminDegreeLayout({ children }: { children: React.ReactNode }) {
  return <SessionWrapper>{children}</SessionWrapper>;
}
