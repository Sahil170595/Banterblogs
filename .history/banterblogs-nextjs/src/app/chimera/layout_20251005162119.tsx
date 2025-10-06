export default function ChimeraLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="chimera">
      <body className="theme-transition">{children}</body>
    </html>
  );
}


