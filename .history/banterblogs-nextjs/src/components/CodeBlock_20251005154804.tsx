'use client';

import { useState, type ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  children: ReactNode;
  className?: string;
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (typeof children === 'string') {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="code-block-wrapper group">
      <pre className={className}>
        <code>{children}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="code-copy-btn"
        title="Copy code"
      >
        {copied ? (
          <Check className="h-3 w-3" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}
