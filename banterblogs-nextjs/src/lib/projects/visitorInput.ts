// Parse options for a visitor's own file or form input. Zod drops the value an
// issue was raised on unless asked to keep it; a refusal needs it to say what
// was there ("not an array", "is missing").
export const VISITOR_INPUT = { reportInput: true } as const;
