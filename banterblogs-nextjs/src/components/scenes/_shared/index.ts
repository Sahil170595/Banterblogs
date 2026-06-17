/**
 * Shared primitives for /show/<scene> demos.
 *
 * See playbook (Banterpacks/demo/PLAYBOOK.md) for the contract these
 * primitives implement — typewriter a11y, prefers-reduced-motion
 * discipline, arrow-key roving tabindex, JourneyPanel cost framing.
 *
 * Scene-specific visualizations (tier ladders, agent grids, BFT
 * matrices, ZK transcripts, Merkle trees) live in the scene's own
 * component file alongside its data types.
 */

export { Typewriter, NarrationLiveRegion } from './Typewriter';
export { FlagBadge } from './FlagBadge';
export { ConfidenceBar } from './ConfidenceBar';
export { JourneyPanel } from './JourneyPanel';
export { PlaybackControls } from './PlaybackControls';
export { useArrowRovingTabindex } from './useArrowRovingTabindex';
