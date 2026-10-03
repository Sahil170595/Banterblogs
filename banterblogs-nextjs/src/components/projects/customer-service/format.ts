// How the customer-service demo writes money and rewards. Formatting is
// pinned to one locale so the server's HTML and the browser's match.

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const CENTS_PER_DOLLAR = 100;

export const money = (cents: number) => USD.format(cents / CENTS_PER_DOLLAR);

/** a reward with a true minus sign, two places */
export const signedScore = (value: number) => (value < 0 ? `−${Math.abs(value).toFixed(2)}` : value.toFixed(2));
