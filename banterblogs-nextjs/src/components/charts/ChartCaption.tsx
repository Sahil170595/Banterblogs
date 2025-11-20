interface ChartCaptionProps {
  title?: string;
  description?: string;
  provenance?: {
    source?: string;
    refreshedAt?: string;
    notes?: string;
  };
}

export function ChartCaption({ title, description, provenance }: ChartCaptionProps) {
  return (
    <figure className="mt-3">
      {(title || description) && (
        <figcaption className="text-sm text-muted-foreground">
          {title && <div className="font-medium text-foreground">{title}</div>}
          {description && <div>{description}</div>}
        </figcaption>
      )}
      {provenance && (provenance.source || provenance.refreshedAt || provenance.notes) && (
        <div className="mt-2 rounded-lg border border-border/50 bg-muted/20 p-2 text-xs text-muted-foreground">
          {provenance.source && (
            <div>
              <span className="font-medium text-foreground">Source:</span> {provenance.source}
            </div>
          )}
          {provenance.refreshedAt && (
            <div>
              <span className="font-medium text-foreground">Last refresh:</span> {provenance.refreshedAt}
            </div>
          )}
          {provenance.notes && <div>{provenance.notes}</div>}
        </div>
      )}
    </figure>
  );
}



