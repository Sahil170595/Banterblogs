import type { Transition } from '@/lib/projects/code-verification/engine';

// One name per concept across the matrix, the verifier and the write-up: a
// test's group is the transition it requires, a cell the one it showed.

export type TestGroup = 'repair' | 'preserve' | 'authored';

export const GROUP_NAMES: Record<TestGroup, string> = {
  repair: 'Fail-to-pass',
  preserve: 'Pass-to-pass',
  authored: 'Authored',
};

export const GROUP_GLOSSES: Record<TestGroup, string> = {
  repair: 'the bug fails it; the fix must pass it',
  preserve: 'passes before the fix and must still pass after',
  authored: 'a test you wrote',
};

export const TRANSITION_NAMES: Record<Transition, string> = {
  'fail-pass': 'Repaired',
  'pass-pass': 'Still passes',
  'fail-fail': 'Still broken',
  'pass-fail': 'Regressed',
};

export const TRANSITION_ARROWS: Record<Transition, string> = {
  'fail-pass': 'fail → pass',
  'pass-pass': 'pass → pass',
  'fail-fail': 'fail → fail',
  'pass-fail': 'pass → fail',
};

export const TRANSITION_ORDER: Transition[] = ['fail-pass', 'pass-pass', 'fail-fail', 'pass-fail'];
