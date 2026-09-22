/**
 * The Chimeraforge mark: the landing's orbital ring, with an ember-lit core
 * and a satellite, beside the name in mono (.brand-orbit, .brand-wordmark in
 * globals.css). One mark for the header on every page and the footer.
 */
export function Wordmark() {
  return (
    <span data-wordmark="orbital" className="inline-flex items-center gap-2 sm:gap-3">
      <span aria-hidden="true" className="brand-orbit" />
      <span className="brand-wordmark">Chimeraforge</span>
    </span>
  );
}
