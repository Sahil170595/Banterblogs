'use client';

import { useState } from 'react';
import { exploreShown, exploreView, type ExplorableFigure } from './exploreView';
import { ReportFigure } from './ReportFigure';
import { ReportFigureTransition } from './ReportTransitions';

// A report figure the reader redraws (specs with `explore`): the table's own
// columns as one radio group over the hero plate. The server renders it on
// the report figure's column, so the page before it hydrates, and without
// script, is that figure; reading.css shows the group only where script
// runs. A choice redraws the same plate on the same scale, and the line under
// it says which column is drawn: the caption below stays the report's own
// sentence about the column the page opens on.

export function ReportExplore({ figure }: { figure: ExplorableFigure }) {
  const { explore } = figure;
  const [choice, setChoice] = useState(explore.initial);
  const [column, datum] = exploreShown(figure, choice);

  return (
    <>
      <fieldset className="report-explore">
        <legend>{explore.legend}</legend>
        <div className="report-explore-options">
          {explore.options.map((option, index) => (
            <label key={option.column}>
              <input type="radio" name={`figure-${figure.slug}`} value={option.column} checked={index === choice} onChange={() => setChoice(index)} />
              <span>{option.column}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <ReportFigureTransition slug={figure.slug}>
        <div className="report-hero">
          <ReportFigure figure={exploreView(figure, choice)} />
        </div>
      </ReportFigureTransition>
      {/* a live region speaks only what changes, so the opening line is read in place, not announced */}
      <p className="report-explore-now" aria-live="polite">
        <span>{column}</span> <span>{datum}</span>
      </p>
    </>
  );
}
