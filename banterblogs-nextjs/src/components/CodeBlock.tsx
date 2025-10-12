'use client';

import { motion } from 'framer-motion';
import { Copy, Check, Code, Terminal } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface CodeBlockProps {
  children: ReactNode;
  className?: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ 
  children, 
  className = '', 
  language = 'text',
  title,
  showLineNumbers = true 
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const codeString = typeof children === 'string' ? children : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const getLanguageIcon = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'bash':
      case 'shell':
        return <Terminal className="h-4 w-4" />;
      default:
        return <Code className="h-4 w-4" />;
    }
  };

  const getLanguageColor = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'javascript':
      case 'js':
        return 'text-yellow-400';
      case 'typescript':
      case 'ts':
        return 'text-blue-400';
      case 'python':
        return 'text-green-400';
      case 'bash':
      case 'shell':
        return 'text-green-300';
      case 'css':
        return 'text-blue-300';
      case 'html':
        return 'text-orange-400';
      case 'json':
        return 'text-purple-400';
      case 'markdown':
        return 'text-gray-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative group my-8"
    >
      {/* Code Block Header */}
      <div className="flex items-center justify-between bg-muted/50 border border-border/50 rounded-t-xl px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          {title && (
            <span className="text-sm font-medium text-foreground">{title}</span>
          )}
          <div className={`flex items-center gap-1 text-xs ${getLanguageColor(language)}`}>
            {getLanguageIcon(language)}
            <span className="uppercase font-mono">{language}</span>
          </div>
        </div>
        
        <motion.button
          onClick={handleCopy}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/50 border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </motion.button>
      </div>

      {/* Code Content */}
      <div className="relative">
        <pre className={`
          ${className}
          bg-muted/30 border border-border/50 border-t-0 rounded-b-xl p-6 overflow-x-auto
          text-sm font-mono leading-relaxed
          ${showLineNumbers ? 'pl-12' : 'pl-6'}
        `}>
          <code className="text-foreground">
            {children}
          </code>
        </pre>

        {/* Line Numbers */}
        {showLineNumbers && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-muted/20 border-r border-border/30 rounded-bl-xl flex flex-col text-xs text-muted-foreground font-mono">
            {codeString.split('\n').map((_, index) => (
              <div key={index} className="flex items-center justify-center h-6 text-center">
                {index + 1}
              </div>
            ))}
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 pointer-events-none rounded-b-xl bg-gradient-to-r from-transparent via-transparent to-background/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Floating Action */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0 }}
        whileHover={{ opacity: 1, scale: 1 }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        <motion.button
          onClick={handleCopy}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

interface InlineCodeProps {
  children: ReactNode;
  className?: string;
}

export function InlineCode({ children, className = '' }: InlineCodeProps) {
  return (
    <motion.code
      whileHover={{ scale: 1.05 }}
      className={`
        ${className}
        bg-muted/50 border border-border/30 px-2 py-1 rounded-md
        text-sm font-mono text-foreground
        hover:bg-muted/70 hover:border-border/50
        transition-all duration-200
      `}
    >
      {children}
    </motion.code>
  );
}

interface CodeSnippetProps {
  code: string;
  language?: string;
  title?: string;
  description?: string;
  maxHeight?: string;
}

export function CodeSnippet({ 
  code, 
  language = 'text', 
  title, 
  description,
  maxHeight = '400px'
}: CodeSnippetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const shouldTruncate = code.split('\n').length > 20;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative group my-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-muted/50 to-muted/30 border border-border/50 rounded-t-xl px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          {title && (
            <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Code className="h-3 w-3" />
            <span className="uppercase font-mono">{language}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {shouldTruncate && (
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3 py-1.5 rounded-lg bg-background/50 border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </motion.button>
          )}
          
          <motion.button
            onClick={handleCopy}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/50 border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-green-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="bg-muted/20 border-x border-border/50 px-4 py-2 text-sm text-muted-foreground">
          {description}
        </div>
      )}

      {/* Code Content */}
      <div className="relative">
        <pre 
          className={`
            bg-muted/30 border border-border/50 border-t-0 rounded-b-xl p-6 overflow-x-auto
            text-sm font-mono leading-relaxed
            ${shouldTruncate && !isExpanded ? 'max-h-96 overflow-y-hidden' : ''}
          `}
          style={{ maxHeight: isExpanded ? 'none' : maxHeight }}
        >
          <code className="text-foreground">
            {code}
          </code>
        </pre>

        {/* Gradient Fade */}
        {shouldTruncate && !isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none rounded-b-xl" />
        )}
      </div>
    </motion.div>
  );
}
