'use client';

import { useMemo, useState } from 'react';
import { candidates, chooseAction, createEpisode, step, validateConfig, type Config, type Episode, type Policy } from '@/lib/projects/flight-routing/engine';
import { TIGHT_CONFIG } from '@/lib/projects/flight-routing/experiment';
import { evaluateWorlds, worldSeed, type PolicyWorlds } from '@/lib/projects/flight-routing/worlds';

// The demo's state: the configuration every world shares, the policies'
// outcomes over those worlds, and the one world being replayed below them.

export interface Selection {
  policy: Policy;
  /** the world's place in the grid, from 0 */
  index: number;
}

/** the replay the page opens on: the first world, under the planner the finding is about */
export const INITIAL_SELECTION: Selection = { policy: 'deadline', index: 0 };

const worldConfig = (config: Config, index: number): Config => ({ ...config, seed: worldSeed(config, index) });

/** every state of a policy's run through one world, so a rewind steps back one decision */
export function playthrough(config: Config, policy: Policy): Episode[] {
  const start = createEpisode(config);
  return [start, ...continueFrom(start, policy)];
}

export function useFlightDemo(initialWorlds: PolicyWorlds[]) {
  const [config, setConfig] = useState<Config>(TIGHT_CONFIG);
  // the server computed the opening configuration; any other is computed here (~10 ms)
  const worlds = useMemo(() => (config === TIGHT_CONFIG ? initialWorlds : evaluateWorlds(config)), [config, initialWorlds]);
  const [selection, setSelection] = useState<Selection>(INITIAL_SELECTION);
  const [history, setHistory] = useState<Episode[]>(() => playthrough(worldConfig(TIGHT_CONFIG, INITIAL_SELECTION.index), INITIAL_SELECTION.policy));
  const [choice, setChoice] = useState<string | null>(null);
  const state = history[history.length - 1];
  const flights = useMemo(() => candidates(state), [state]);
  const policyChoice = flights.length ? chooseAction(state, selection.policy) : -1;
  const chosen = choice !== null && flights.some((f) => f.id === choice) ? flights.findIndex((f) => f.id === choice) : policyChoice;

  const replay = (next: Config, picked: Selection) => {
    setHistory(playthrough(worldConfig(next, picked.index), picked.policy));
    setChoice(null);
  };

  return {
    config,
    worlds,
    selection,
    history,
    state,
    flights,
    chosen,
    /** replay one world under one policy, from the start to its end */
    select(picked: Selection) {
      setSelection(picked);
      replay(config, picked);
    },
    /** change what every world shares; the grid recomputes and the replay restarts. Returns why it was refused, if it was. */
    configure(next: Config): string | null {
      try {
        const valid = validateConfig(next);
        setConfig(valid);
        replay(valid, selection);
        return null;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'This scenario could not be applied.';
        console.warn('Flight routing scenario rejected:', message, next);
        return message;
      }
    },
    choose(flightId: string) {
      setChoice(flightId);
    },
    /** take the chosen flight from the current state; with none bookable, the trip ends there */
    stepChosen() {
      setHistory([...history, step(state, Math.max(chosen, 0))]);
      setChoice(null);
    },
    /** let the selected policy finish the run from here */
    finish() {
      setHistory([...history, ...continueFrom(state, selection.policy)]);
      setChoice(null);
    },
    rewind() {
      if (history.length > 1) setHistory(history.slice(0, -1));
      setChoice(null);
    },
    restart() {
      setHistory([history[0]]);
      setChoice(null);
    },
  };
}

/** the states a policy adds from a mid-run state to the end */
function continueFrom(state: Episode, policy: Policy): Episode[] {
  const added: Episode[] = [];
  let current = state;
  while (current.reason === 'in_progress') {
    current = step(current, chooseAction(current, policy));
    added.push(current);
  }
  return added;
}

export type FlightDemo = ReturnType<typeof useFlightDemo>;
