// Pre-paint motion gate, inlined into <head> by the root layout so it runs
// before first paint. Motion is armed only when JavaScript runs and the
// visitor has not asked for reduced motion; everything that moves in
// globals.css is scoped to html[data-motion="on"], so no-JS and
// reduced-motion visitors see every element at rest.
//
// It also opens the entrance window: data-entrance carries the path of the
// full page load, and a page head's first-load entrance (entrance.ts) plays
// only while it is set. The window closes once no entrance-* animation is
// left running, or at the first client-side navigation (EntranceWindow).
//
// Ahead of the reduced-motion return, it also arms the off-screen skipping
// gate (contentVisibility.ts), which every visitor needs.

import { CONTENT_VISIBILITY_PREPAINT } from './contentVisibility';

export const MOTION_GATE_SCRIPT_ID = 'motion-gate';
export const MOTION_ATTRIBUTE = 'data-motion';
export const ENTRANCE_ATTRIBUTE = 'data-entrance';
/** keyframes named with this prefix belong to a first-load entrance */
export const ENTRANCE_ANIMATION_PREFIX = 'entrance-';

export const MOTION_GATE_SCRIPT =
  '(function(){try{' +
  'var d=document.documentElement,mm=function(q){return window.matchMedia(q)};' +
  CONTENT_VISIBILITY_PREPAINT +
  'if(!mm("(prefers-reduced-motion: no-preference)").matches)return;' +
  `d.setAttribute("${MOTION_ATTRIBUTE}","on");` +
  `d.setAttribute("${ENTRANCE_ATTRIBUTE}",location.pathname);` +
  `var isEntrance=function(n){return typeof n==="string"&&n.indexOf("${ENTRANCE_ANIMATION_PREFIX}")===0};` +
  'var running=function(){return !!document.getAnimations&&document.getAnimations().some(function(a){return isEntrance(a.animationName)&&a.playState!=="finished"})};' +
  `var settle=function(e){if(e.type!=="DOMContentLoaded"&&!isEntrance(e.animationName))return;if(!running())d.removeAttribute("${ENTRANCE_ATTRIBUTE}")};` +
  'document.addEventListener("animationend",settle);' +
  'document.addEventListener("animationcancel",settle);' +
  'document.addEventListener("DOMContentLoaded",settle);' +
  'mm("(prefers-reduced-motion: reduce)").addEventListener("change",function(e){' +
  `if(e.matches){d.removeAttribute("${MOTION_ATTRIBUTE}");d.removeAttribute("${ENTRANCE_ATTRIBUTE}")}});` +
  '}catch(e){console.warn("[motion] pre-paint gate failed",e)}})()';
