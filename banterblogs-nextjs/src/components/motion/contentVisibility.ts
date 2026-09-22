// Reading pages and the archive skip off-screen blocks (content-visibility:
// auto in reading.css and globals.css), so a report opens inside its view
// transition at the cost of a screen, not the whole body. A skipped block
// holds an estimated height, so a position computed through skipped blocks
// is wrong: a smooth #jump sets off for the estimate and never retargets, and
// the browser's focus scroll parks the focused element where the estimate
// put it. The first time a page view needs exact positions, every block
// renders for the rest of it: html[data-cv="off"].

export const CV_ATTRIBUTE = 'data-cv';
export const CV_OFF = 'off';
/** the elements whose children, or which themselves, skip rendering off screen */
export const SKIPPING_CONTAINERS = '.report-prose, .archive-card-slot, .archive-section';

/**
 * Runs in the pre-paint script (prePaint.ts), ahead of the reduced-motion
 * return, so it covers every visitor from the first byte, hydrated or not.
 * `d` is <html>. Skipping goes off:
 * - on a load with a #fragment, before the first layout, so the load's own
 *   fragment scroll lands;
 * - at a Tab, before the browser moves focus and scrolls to it;
 * - at a plain click on a link to a fragment of this document, in the
 *   capture phase, laid out before the jump starts;
 * - when a script or assistive technology moves focus into skipped content.
 *   Chromium aims that focus scroll before the focus events run, at the
 *   estimate, so the element is scrolled to again once laid out. A pointer
 *   press brings the element under the pointer, so it needs nothing.
 * The forced layout makes the positions exact before the scroll runs.
 *
 * Skipping goes back on at a plain click on a link to another page of the
 * site (not to its #fragment), before the router renders that page: left
 * off, the report-open transition laid all of the next report out. The
 * remembered block sizes (contain-intrinsic-size: auto) keep this page
 * where it is. RouteArrival does the same for navigations without a click.
 */
export const CONTENT_VISIBILITY_PREPAINT =
  `var cvOff=function(){if(d.getAttribute("${CV_ATTRIBUTE}")==="${CV_OFF}")return false;` +
  `d.setAttribute("${CV_ATTRIBUTE}","${CV_OFF}");void d.scrollHeight;return true};` +
  `if(location.hash)d.setAttribute("${CV_ATTRIBUTE}","${CV_OFF}");` +
  'document.addEventListener("keydown",function(e){if(e.key==="Tab")cvOff()},true);' +
  'document.addEventListener("click",function(e){' +
  'if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||!(e.target instanceof Element))return;' +
  'var a=e.target.closest("a[href]");if(!a||(a.target&&a.target!=="_self"))return;' +
  'var u=new URL(a.href,location.href);if(u.origin!==location.origin)return;' +
  'if(u.pathname===location.pathname&&u.search===location.search){if(u.hash)cvOff();return}' +
  `if(!u.hash)d.removeAttribute("${CV_ATTRIBUTE}")},true);` +
  'document.addEventListener("focusin",function(e){var t=e.target;' +
  `if(t instanceof Element&&t.closest("${SKIPPING_CONTAINERS}")&&t.matches(":focus-visible")&&cvOff())` +
  't.scrollIntoView({block:"nearest",inline:"nearest"})},true);';
