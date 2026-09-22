import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

export const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost'] as const;
export const BUTTON_SIZES = ['sm', 'md'] as const;

// A pill that settles on press (.pressable in globals.css). Ember is spent
// only on primary; secondary is a hairline; ghost is text until hovered.
// `relative` keeps it above a card's stretched link.
const button = cva(
  'pressable relative inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-medium disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'border border-border text-foreground hover:border-foreground/30 hover:bg-foreground/5',
        ghost: 'text-muted-foreground hover:bg-foreground/10 hover:text-foreground',
      },
      size: {
        sm: 'h-7 gap-1.5 px-3 text-label-13',
        md: 'h-9 gap-2 px-4 text-copy-14',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

type ButtonStyle = VariantProps<typeof button>;

interface Slots {
  /** leading icon */
  icon?: ReactNode;
  /** trailing icon */
  iconEnd?: ReactNode;
  children: ReactNode;
}

function Content({ icon, iconEnd, children }: Slots) {
  return (
    <>
      {icon && (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {icon}
        </span>
      )}
      {children}
      {iconEnd && (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {iconEnd}
        </span>
      )}
    </>
  );
}

export type ButtonProps = ButtonStyle & Slots & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

export function Button({ variant, size, icon, iconEnd, className, type = 'button', children, ...rest }: ButtonProps) {
  return (
    <button type={type} className={cn(button({ variant, size }), className)} {...rest}>
      <Content icon={icon} iconEnd={iconEnd}>
        {children}
      </Content>
    </button>
  );
}

export interface ButtonLinkProps extends ButtonStyle, Slots {
  href: string;
  className?: string;
  'aria-label'?: string;
}

const isExternal = (href: string) => /^https?:\/\//.test(href);

/** A Button that navigates: next/link inside the site, a new tab outside it. */
export function ButtonLink({ href, variant, size, icon, iconEnd, className, children, ...rest }: ButtonLinkProps) {
  const external = isExternal(href);
  return (
    <Link
      href={href}
      className={cn(button({ variant, size }), className)}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...rest}
    >
      <Content icon={icon} iconEnd={iconEnd}>
        {children}
      </Content>
    </Link>
  );
}
