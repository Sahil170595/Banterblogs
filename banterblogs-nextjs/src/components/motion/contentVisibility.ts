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
/** the blocks that skip rendering off screen (reading.css, globals.css) */
export const SKIPPED_BLOCKS = '.report-prose > p, .report-prose > pre, .report-prose > .table-scroll, .archive-card-slot, .archive-section';
/** a focus scroll that has not started within this long is not coming */
export const FOCUS_SCROLL_START_MS = 100;
/** the longest a smooth focus scroll runs; also the fallback where scrollend is missing */
export const FOCUS_SCROLL_GIVE_UP_MS = 1500;

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
 * With the page laid out, the browser's own focus scroll lands, but Firefox
 * leaves an element that is partly in view where it is. Once that scroll
 * settles, keyboard focus in skipped content that is not fully in view,
 * and fits, is brought into view.
 *
 * Skipping goes back on at a plain click on a link to another page of the
 * site (not to its #fragment), before the router renders that page: left
 * off, the report-open transition laid all of the next report out. The
 * remembered block sizes (contain-intrinsic-size: auto) keep this page
 * where it is. RouteArrival does the same for navigations without a click.
 * The same click stops any scroll still in flight where the page stands:
 * the router's scroll to the next page's top, inside the view transition,
 * did not stop a smooth focus scroll, which ran on into the next page.
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
  'scrollTo({top:scrollY,left:scrollX,behavior:"instant"});' +
  `if(!u.hash)d.removeAttribute("${CV_ATTRIBUTE}")},true);` +
  'var near={block:"nearest",inline:"nearest"};' +
  'document.addEventListener("focusin",function(e){var t=e.target;' +
  `if(!(t instanceof Element)||!t.closest("${SKIPPING_CONTAINERS}")||!t.matches(":focus-visible"))return;` +
  'if(cvOff()){t.scrollIntoView(near);return}' +
  'var moved=false,done=false,mark=function(){moved=true},finish=function(){if(done)return;done=true;' +
  'removeEventListener("scroll",mark);removeEventListener("scrollend",finish);if(document.activeElement!==t)return;' +
  'var r=t.getBoundingClientRect(),p=parseFloat(getComputedStyle(d).scrollPaddingTop)||0;' +
  'if(r.height<=innerHeight-p&&(r.top<p||r.bottom>innerHeight))t.scrollIntoView(near)};' +
  'addEventListener("scroll",mark,{passive:true});addEventListener("scrollend",finish);' +
  `setTimeout(function(){if(!moved)finish()},${FOCUS_SCROLL_START_MS});setTimeout(finish,${FOCUS_SCROLL_GIVE_UP_MS})},true);`;
