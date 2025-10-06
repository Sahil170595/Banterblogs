import type { ReactNode } from 'react';

export default function ChimeraLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="chimera">
      <body className="theme-transition">{children}</body>
    </html>
  );
}


