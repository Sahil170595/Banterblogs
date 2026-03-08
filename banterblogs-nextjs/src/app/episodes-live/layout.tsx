import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Live Episodes',
  description: 'Episodes update automatically whenever new markdown files land in the content stream.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
