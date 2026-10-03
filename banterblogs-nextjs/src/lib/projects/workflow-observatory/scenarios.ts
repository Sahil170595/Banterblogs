import { completion, DEFAULT_CONFIG, initialSite, observeModel, transition, type Config, type Event, type SiteState } from './engine';

// The attempts the page's table compares: the events each one produces and
// the configuration that produces them. Every scenario but the wrong-room one
// is what the executor itself does with that configuration (scenarios.test.ts
// runs it to check); a person makes the wrong-room one by hand.

export interface Scenario {
  id: string;
  label: string;
  /** what goes wrong, in a phrase */
  note: string;
  config: Config;
  events: Event[];
  /** the executor reproduces it from the configuration alone */
  executor: boolean;
}

const plan = (config: Config): Event[] => [{ type: 'open' }, { type: 'fill', value: config.title }, { type: 'select', value: config.room }, { type: 'submit' }];
const fixedWait: Config = { ...DEFAULT_CONFIG, waitPolicy: 'fixed' };

export const SCENARIOS: Scenario[] = [
  { id: 'normal', label: 'Saves normally', note: 'no failure added', config: DEFAULT_CONFIG, events: [...plan(DEFAULT_CONFIG), { type: 'settle' }], executor: true },
  {
    id: 'no-record',
    label: 'Notice shown, nothing saved',
    note: 'the save reports success and commits no record',
    config: { ...DEFAULT_CONFIG, failure: 'false-toast' },
    events: [...plan(DEFAULT_CONFIG), { type: 'settle' }],
    executor: true,
  },
  {
    id: 'wrong-room',
    label: 'Saved to the wrong room',
    note: 'the form is submitted with South lab instead of North',
    config: DEFAULT_CONFIG,
    events: [{ type: 'open' }, { type: 'fill', value: DEFAULT_CONFIG.title }, { type: 'select', value: 'south' }, { type: 'submit' }, { type: 'settle' }],
    executor: false,
  },
  {
    id: 'rejected',
    label: 'Save rejected',
    note: 'the server refuses the save',
    config: { ...DEFAULT_CONFIG, failure: 'reject-save', selectorPolicy: 'strict' },
    events: [...plan(DEFAULT_CONFIG), { type: 'settle' }],
    executor: true,
  },
  {
    id: 'checked-early',
    label: 'Checked before the save landed',
    note: `a fixed wait gives up while the save is still pending`,
    config: fixedWait,
    events: [...plan(fixedWait), { type: 'cancel' }],
    executor: true,
  },
  {
    id: 'renamed-button',
    label: 'Button renamed',
    note: 'strict selectors cannot find the renamed button',
    config: { ...DEFAULT_CONFIG, failure: 'label-drift', selectorPolicy: 'strict' },
    events: [],
    executor: true,
  },
];

/** the site after a scenario's events */
export function settle(scenario: Scenario): SiteState {
  return scenario.events.reduce((state, event) => transition(state, event, scenario.config), initialSite());
}

// Parallax's interactive completion rule at the pinned commit
// (core/completion.py _has_interactive_signal): after a step whose description
// holds one of these tokens, a toast or a form with no invalid field is done.
const SIGNAL_TOKENS = ['submit', 'type', 'fill', 'upload', 'check', 'form', 'save'];
// what its navigator's _describe_action calls each step; settling and
// cancelling are the site's doing, not steps it observes after
const STEP_DESCRIPTIONS: Record<Event['type'], string | null> = {
  open: 'click(button:Reserve slot)',
  fill: 'fill',
  select: 'select',
  submit: 'submit(form)',
  settle: null,
  cancel: null,
};

/** whether Parallax's interactive completion check accepts the attempt */
export function parallaxAccepts(scenario: Scenario): boolean {
  let state = initialSite();
  for (const event of scenario.events) {
    state = transition(state, event, scenario.config);
    const description = STEP_DESCRIPTIONS[event.type];
    if (!description || !SIGNAL_TOKENS.some((token) => description.includes(token))) continue;
    const seen = observeModel(state);
    // its toast detector takes any role=status or role=alert element, and the
    // pending save's "Saving reservation" line is one
    const toast = seen.toast !== 'none' || seen.phase === 'saving';
    if (toast || seen.formValid === true) return true;
  }
  return false;
}

/** what each kind of evidence says about the attempt */
export function judge(scenario: Scenario) {
  const state = settle(scenario);
  const { config } = scenario;
  return {
    state,
    notice: state.toast === 'success',
    parallax: parallaxAccepts(scenario),
    gate: completion(observeModel(state), config).complete,
    /** a committed record with the requested title and room */
    record: state.record !== null && state.record.title === config.title.trim() && state.record.room === config.room,
    /** whatever record was committed, asked for or not */
    saved: state.record,
  };
}
