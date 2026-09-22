import { CopyButton } from '@/components/CopyButton';
import { cn } from '@/lib/cn';

export interface CommandChipProps {
  command: string;
  /** what is being copied, for the copy button's label */
  label: string;
  className?: string;
}

/**
 * A shell command to copy: a prompt that selection and screen readers skip,
 * the command in mono, and the copy button, on an inset-hairline plate
 * (.command-chip in globals.css). A long command scrolls inside the chip
 * while the prompt and the copy button stay in view. Positioned, so it stays
 * clickable over an interactive card's stretched link.
 */
export function CommandChip({ command, label, className }: CommandChipProps) {
  return (
    <div className={cn('command-chip relative max-w-full', className)}>
      <span aria-hidden="true" className="select-none text-muted-foreground">
        $
      </span>
      <code className="min-w-0 overflow-x-auto whitespace-nowrap text-foreground">{command}</code>
      <CopyButton text={command} label={label} />
    </div>
  );
}
