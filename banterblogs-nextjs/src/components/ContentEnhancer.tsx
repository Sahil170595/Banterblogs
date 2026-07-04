'use client';

import { useEffect } from 'react';

// Progressive enhancement over the SERVER-rendered episode article.
//
// History: the previous version of this component rendered the whole article
// client-side (empty SSR body) and ran six regex passes whose two headline
// features (collapsible sections, copy buttons) never matched what the
// markdown pipeline actually emits. The article is now server-rendered by the
// page via dangerouslySetInnerHTML; this component only decorates the real
// DOM after hydration: copy buttons on code blocks and lazy-loading images.

interface ArticleEnhancementsProps {
  /** id of the server-rendered article container */
  articleId: string;
}

const COPY_RESET_MS = 2000;

export function ArticleEnhancements({ articleId }: ArticleEnhancementsProps) {
  useEffect(() => {
    const article = document.getElementById(articleId);
    if (!article) return;

    article.querySelectorAll('img').forEach((img) => {
      img.loading = 'lazy';
    });

    const cleanups: Array<() => void> = [];
    article.querySelectorAll('pre').forEach((pre) => {
      if (pre.querySelector('.code-copy-button')) return; // already enhanced
      const code = pre.querySelector('code');
      if (!code) return;

      pre.classList.add('relative', 'group');
      const button = document.createElement('button');
      button.type = 'button';
      button.className =
        'code-copy-button absolute right-2 top-2 rounded-md border border-border/60 bg-background/90 px-2 py-1 ' +
        'text-xs font-medium text-muted-foreground opacity-0 transition-opacity hover:text-foreground ' +
        'focus:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring group-hover:opacity-100';
      button.textContent = 'Copy';
      button.setAttribute('aria-label', 'Copy code to clipboard');

      const onClick = async () => {
        try {
          await navigator.clipboard.writeText(code.textContent ?? '');
          button.textContent = 'Copied';
          setTimeout(() => {
            button.textContent = 'Copy';
          }, COPY_RESET_MS);
        } catch (error) {
          console.error('[ArticleEnhancements] copy failed:', error);
        }
      };
      button.addEventListener('click', onClick);
      cleanups.push(() => button.removeEventListener('click', onClick));
      pre.appendChild(button);
    });

    return () => {
      cleanups.forEach((fn) => fn());
      article.querySelectorAll('.code-copy-button').forEach((btn) => btn.remove());
    };
  }, [articleId]);

  return null;
}
