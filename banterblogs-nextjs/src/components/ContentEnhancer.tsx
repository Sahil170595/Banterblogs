'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { 
  Image as ImageIcon,
  FileText,
  Code,
  List,
  Link as LinkIcon,
  Eye
} from 'lucide-react';

interface ContentEnhancerProps {
  content: string;
  className?: string;
}

export function ContentEnhancer({ content, className = '' }: ContentEnhancerProps) {
  const [processedContent, setProcessedContent] = useState<string>('');

  useEffect(() => {
    // Process content to add interactive elements
    let processed = content;
    
    // Add collapsible sections for long content
    processed = processed.replace(
      /<h2>(.*?)<\/h2>([\s\S]*?)(?=<h2>|$)/g,
      (match, title, content) => {
        const sectionIndex = Array.from(processed.matchAll(/<h2>/g)).length;
        return `
          <div class="collapsible-section" data-section="${sectionIndex}">
            <div class="section-header">
              <h2>${title}</h2>
              <button class="expand-button" data-section="${sectionIndex}" aria-expanded="false">
                <span class="chevron-icon" aria-hidden="true">v</span>
              </button>
            </div>
            <div class="section-content" data-section="${sectionIndex}">
              ${content}
            </div>
          </div>
        `;
      }
    );

    // Enhance code blocks
    processed = processed.replace(
      /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
      (match, language, code) => {
        const blockIndex = Array.from(processed.matchAll(/<pre>/g)).length;
        return `
          <div class="enhanced-code-block" data-block="${blockIndex}">
            <div class="code-header">
              <div class="language-info">
                <span class="code-icon" aria-hidden="true">&#123;&#125;</span>
                <span class="language-name">${language}</span>
              </div>
              <button class="copy-button" data-block="${blockIndex}" type="button">
                <span class="copy-icon" aria-hidden="true">[]</span>
                <span class="copy-text">Copy</span>
              </button>
            </div>
            <pre><code class="language-${language}">${code}</code></pre>
          </div>
        `;
      }
    );

    // Enhance images with lazy loading and zoom
    processed = processed.replace(
      /<img([^>]*?)src="([^"]*)"([^>]*?)>/g,
      (match, before, src, after) => {
        const imageIndex = Array.from(processed.matchAll(/<img/g)).length;
        return `
          <div class="enhanced-image" data-image="${imageIndex}">
            <img ${before} src="${src}" ${after} loading="lazy" />
            <div class="image-overlay">
              <button class="zoom-button" data-image="${imageIndex}" type="button">
                <span class="zoom-icon" aria-hidden="true">+</span>
              </button>
            </div>
          </div>
        `;
      }
    );

    // Enhance blockquotes
    processed = processed.replace(
      /<blockquote>([\s\S]*?)<\/blockquote>/g,
      (match, content) => {
        return `
          <div class="enhanced-blockquote">
            <div class="quote-icon">
              <span class="quote-symbol" aria-hidden="true">"</span>
            </div>
            <div class="quote-content">
              ${content}
            </div>
          </div>
        `;
      }
    );

    // Enhance tables
    processed = processed.replace(
      /<table>([\s\S]*?)<\/table>/g,
      (match, tableContent) => {
        return `
          <div class="enhanced-table-container">
            <div class="table-header">
              <span class="table-icon" aria-hidden="true">=</span>
              <span>Data Table</span>
            </div>
            <div class="table-wrapper">
              <table>${tableContent}</table>
            </div>
          </div>
        `;
      }
    );

    // Enhance lists with animations
    processed = processed.replace(
      /<ul>([\s\S]*?)<\/ul>/g,
      (match, listContent) => {
        return `
          <div class="enhanced-list">
            <div class="list-header">
              <span class="list-icon" aria-hidden="true">+</span>
              <span>Key Points</span>
            </div>
            <ul>${listContent}</ul>
          </div>
        `;
      }
    );

    // Enhance links with preview
    processed = processed.replace(
      /<a([^>]*?)href="([^"]*)"([^>]*?)>([^<]*?)<\/a>/g,
      (match, before, href, after, text) => {
        return `
          <a ${before} href="${href}" ${after} class="enhanced-link" data-href="${href}">
            ${text}
            <span class="link-icon" aria-hidden="true">-></span>
          </a>
        `;
      }
    );

    setProcessedContent(processed);
  }, [content]);


  useEffect(() => {
    const handleDocumentClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      const expandButton = target.closest('.expand-button') as HTMLElement | null;
      if (expandButton) {
        event.preventDefault();
        const section = expandButton.closest('.collapsible-section');
        if (section) {
          const isExpanded = section.classList.toggle('expanded');
          expandButton.setAttribute('aria-expanded', String(isExpanded));
          const icon = expandButton.querySelector<HTMLElement>('.chevron-icon');
          if (icon) {
            icon.textContent = isExpanded ? '^' : 'v';
          }
        }
        return;
      }

      const copyButton = target.closest('.copy-button') as HTMLElement | null;
      if (copyButton) {
        event.preventDefault();
        const codeBlock = copyButton.closest('.enhanced-code-block');
        const code = codeBlock?.querySelector('code')?.textContent ?? '';

        try {
          await navigator.clipboard.writeText(code);
          copyButton.classList.add('copied');
          const label = copyButton.querySelector<HTMLElement>('.copy-text');
          if (label) {
            label.textContent = 'Copied';
          }
          setTimeout(() => {
            copyButton.classList.remove('copied');
            if (label) {
              label.textContent = 'Copy';
            }
          }, 2000);
        } catch (error) {
          console.error('Failed to copy code:', error);
        }
        return;
      }

      const zoomButton = target.closest('.zoom-button') as HTMLElement | null;
      if (zoomButton) {
        event.preventDefault();
        const imageContainer = zoomButton.closest('.enhanced-image');
        const img = imageContainer?.querySelector('img');

        if (img) {
          const modal = document.createElement('div');
          modal.className = 'image-modal';
          modal.innerHTML = `
            <div class="modal-backdrop">
              <div class="modal-content">
                <img src="${img.src}" alt="${img.alt}" />
                <button class="close-button" type="button" aria-label="Close image preview">x</button>
              </div>
            </div>
          `;

          document.body.appendChild(modal);

          const closeModal = () => {
            document.body.removeChild(modal);
          };

          modal.querySelector('.close-button')?.addEventListener('click', closeModal, { once: true });
          modal.querySelector('.modal-backdrop')?.addEventListener('click', closeModal, { once: true });
        }
      }
    };

    document.addEventListener('click', handleDocumentClick);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);




  return (
    <div className={`enhanced-content ${className}`}>
      <div 
        dangerouslySetInnerHTML={{ __html: processedContent }}
        className="content-body"
      />
      
      {/* Add CSS for enhanced content */}
      <style jsx>{`
        .enhanced-content {
          position: relative;
        }

        .collapsible-section {
          margin: 2rem 0;
          border: 1px solid hsl(var(--border) / 0.3);
          border-radius: 12px;
          overflow: hidden;
          background: hsl(var(--card) / 0.5);
          backdrop-filter: blur(10px);
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          background: hsl(var(--muted) / 0.3);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .section-header:hover {
          background: hsl(var(--muted) / 0.5);
        }

        .section-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: hsl(var(--foreground));
        }

        .expand-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          border: none;
          background: hsl(var(--primary) / 0.1);
          color: hsl(var(--primary));
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .expand-button:hover {
          background: hsl(var(--primary) / 0.2);
          transform: scale(1.05);
        }

        .chevron-icon {
          width: 1rem;
          height: 1rem;
          transition: transform 0.3s ease;
        }

        .section-content {
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .section-content.collapsed {
          max-height: 0;
          padding: 0 1.5rem;
          overflow: hidden;
        }

        .enhanced-code-block {
          margin: 2rem 0;
          border: 1px solid hsl(var(--border) / 0.3);
          border-radius: 12px;
          overflow: hidden;
          background: hsl(var(--muted) / 0.3);
        }

        .code-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: hsl(var(--muted) / 0.5);
          border-bottom: 1px solid hsl(var(--border) / 0.3);
        }

        .language-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: hsl(var(--muted-foreground));
        }

        .code-icon {
          width: 1rem;
          height: 1rem;
        }

        .language-name {
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .copy-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: none;
          background: hsl(var(--primary) / 0.1);
          color: hsl(var(--primary));
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.3s ease;
        }

        .copy-button:hover {
          background: hsl(var(--primary) / 0.2);
          transform: scale(1.05);
        }

        .copy-button.copied {
          background: hsl(var(--green-500) / 0.1);
          color: hsl(var(--green-500));
        }

        .copy-icon {
          width: 1rem;
          height: 1rem;
        }

        .enhanced-code-block pre {
          margin: 0;
          padding: 1.5rem;
          background: transparent;
          border: none;
          border-radius: 0;
        }

        .enhanced-image {
          position: relative;
          margin: 2rem 0;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid hsl(var(--border) / 0.3);
        }

        .enhanced-image img {
          width: 100%;
          height: auto;
          display: block;
          transition: transform 0.3s ease;
        }

        .enhanced-image:hover img {
          transform: scale(1.02);
        }

        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .enhanced-image:hover .image-overlay {
          opacity: 1;
        }

        .zoom-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 3rem;
          height: 3rem;
          border: none;
          background: rgba(255, 255, 255, 0.9);
          color: hsl(var(--foreground));
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .zoom-button:hover {
          background: white;
          transform: scale(1.1);
        }

        .zoom-icon {
          width: 1.5rem;
          height: 1.5rem;
        }

        .enhanced-blockquote {
          position: relative;
          margin: 2rem 0;
          padding: 2rem;
          background: hsl(var(--primary) / 0.05);
          border-left: 4px solid hsl(var(--primary));
          border-radius: 0 12px 12px 0;
        }

        .quote-icon {
          position: absolute;
          top: -0.5rem;
          left: 1rem;
          width: 3rem;
          height: 3rem;
          background: hsl(var(--primary) / 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .quote-symbol {
          width: 1.5rem;
          height: 1.5rem;
          color: hsl(var(--primary));
        }

        .quote-content {
          margin-left: 1rem;
          font-style: italic;
          color: hsl(var(--muted-foreground));
          line-height: 1.6;
        }

        .enhanced-table-container {
          margin: 2rem 0;
          border: 1px solid hsl(var(--border) / 0.3);
          border-radius: 12px;
          overflow: hidden;
          background: hsl(var(--card) / 0.5);
        }

        .table-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          background: hsl(var(--muted) / 0.3);
          border-bottom: 1px solid hsl(var(--border) / 0.3);
          font-weight: 500;
          color: hsl(var(--foreground));
        }

        .table-icon {
          width: 1rem;
          height: 1rem;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .enhanced-table-container table {
          width: 100%;
          margin: 0;
          border: none;
        }

        .enhanced-table-container th {
          background: hsl(var(--muted) / 0.5);
          font-weight: 600;
          color: hsl(var(--foreground));
        }

        .enhanced-table-container td {
          border-bottom: 1px solid hsl(var(--border) / 0.2);
          color: hsl(var(--muted-foreground));
        }

        .enhanced-table-container tr:hover td {
          background: hsl(var(--muted) / 0.2);
        }

        .enhanced-list {
          margin: 2rem 0;
          border: 1px solid hsl(var(--border) / 0.3);
          border-radius: 12px;
          overflow: hidden;
          background: hsl(var(--card) / 0.5);
        }

        .list-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          background: hsl(var(--muted) / 0.3);
          border-bottom: 1px solid hsl(var(--border) / 0.3);
          font-weight: 500;
          color: hsl(var(--foreground));
        }

        .list-icon {
          width: 1rem;
          height: 1rem;
        }

        .enhanced-list ul {
          margin: 0;
          padding: 1.5rem;
        }

        .enhanced-list li {
          margin: 0.5rem 0;
          padding-left: 1rem;
          position: relative;
        }

        .enhanced-list li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0.75rem;
          width: 6px;
          height: 6px;
          background: linear-gradient(45deg, hsl(var(--primary)), hsl(var(--accent)));
          border-radius: 50%;
        }

        .enhanced-link {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          color: hsl(var(--primary));
          text-decoration: none;
          font-weight: 500;
          transition: all 0.3s ease;
          position: relative;
        }

        .enhanced-link:hover {
          color: hsl(var(--accent));
          text-decoration: underline;
        }

        .link-icon {
          width: 0.875rem;
          height: 0.875rem;
          opacity: 0.7;
        }

        .image-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
        }

        .modal-content {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .modal-content img {
          width: 100%;
          height: auto;
          display: block;
        }

        .close-button {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 2.5rem;
          height: 2.5rem;
          border: none;
          background: rgba(255, 255, 255, 0.9);
          color: hsl(var(--foreground));
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .close-button:hover {
          background: white;
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}

interface ContentStatsProps {
  content: string;
  className?: string;
}

export function ContentStats({ content, className = '' }: ContentStatsProps) {
  const [stats, setStats] = useState({
    wordCount: 0,
    readingTime: 0,
    headingCount: 0,
    imageCount: 0,
    codeBlockCount: 0,
    linkCount: 0
  });

  useEffect(() => {
    // Calculate content statistics
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    const text = tempDiv.textContent || '';
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    const readingTime = Math.ceil(wordCount / 200); // 200 words per minute
    
    const headingCount = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
    const imageCount = tempDiv.querySelectorAll('img').length;
    const codeBlockCount = tempDiv.querySelectorAll('pre code').length;
    const linkCount = tempDiv.querySelectorAll('a').length;
    
    setStats({
      wordCount,
      readingTime,
      headingCount,
      imageCount,
      codeBlockCount,
      linkCount
    });
  }, [content]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className={`content-stats ${className}`}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="text-center p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur"
        >
          <FileText className="h-6 w-6 text-primary mx-auto mb-2" />
          <div className="text-2xl font-bold text-foreground">{stats.wordCount}</div>
          <div className="text-sm text-muted-foreground">Words</div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          className="text-center p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur"
        >
          <Eye className="h-6 w-6 text-accent mx-auto mb-2" />
          <div className="text-2xl font-bold text-foreground">{stats.readingTime}</div>
          <div className="text-sm text-muted-foreground">Min Read</div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          className="text-center p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur"
        >
          <List className="h-6 w-6 text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-foreground">{stats.headingCount}</div>
          <div className="text-sm text-muted-foreground">Sections</div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          className="text-center p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur"
        >
          <ImageIcon className="h-6 w-6 text-accent mx-auto mb-2" />
          <div className="text-2xl font-bold text-foreground">{stats.imageCount}</div>
          <div className="text-sm text-muted-foreground">Images</div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          className="text-center p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur"
        >
          <Code className="h-6 w-6 text-primary mx-auto mb-2" />
          <div className="text-2xl font-bold text-foreground">{stats.codeBlockCount}</div>
          <div className="text-sm text-muted-foreground">Code Blocks</div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          className="text-center p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur"
        >
          <LinkIcon className="h-6 w-6 text-orange-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-foreground">{stats.linkCount}</div>
          <div className="text-sm text-muted-foreground">Links</div>
        </motion.div>
      </div>
    </motion.div>
  );
}
