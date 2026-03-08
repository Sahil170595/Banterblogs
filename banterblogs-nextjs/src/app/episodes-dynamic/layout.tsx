import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Dynamic Episode Feed',
  description: 'Runtime-synced episode feed — every new markdown file appears instantly.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
