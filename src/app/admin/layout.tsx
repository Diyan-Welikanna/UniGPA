export const dynamic = 'force-dynamic';

import SessionWrapper from '@/app/select-degree/SessionWrapper';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SessionWrapper>{children}</SessionWrapper>;
}
