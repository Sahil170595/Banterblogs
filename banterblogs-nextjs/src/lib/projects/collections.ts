// The projects' collections: the /projects tab strip, one page each at
// /projects/<key>. Order here is the tab order and the catalog's sort.

export const COLLECTIONS = [
  {
    key: 'reinforcement-learning',
    label: 'Reinforcement learning',
    title: 'Reinforcement Learning Projects',
    description:
      'Environments where a program chooses one move at a time and is scored on how the task ends, and the tests that compare one strategy with another on identical cases.',
  },
  {
    key: 'agents-and-evaluation',
    label: 'Agents & evaluation',
    title: 'Agent and Evaluation Projects',
    description: 'Software that acts on its own, using tools and filling in forms, and the checks that decide whether it really did the job.',
  },
  {
    key: 'systems',
    label: 'Systems',
    title: 'Systems Projects',
    description: 'Search, scheduling and rule-enforcement engines, rebuilt in the browser and audited, with what each audit found left in view.',
  },
  {
    key: 'product',
    label: 'Product',
    title: 'Product Projects',
    description: 'Applications built end to end, from what people do on screen to how the data stays consistent behind it.',
  },
] as const;

export type Collection = (typeof COLLECTIONS)[number];
export type CollectionKey = Collection['key'];

export const COLLECTION_KEYS = COLLECTIONS.map((c) => c.key) as [CollectionKey, ...CollectionKey[]];

export function isCollectionKey(key: string): key is CollectionKey {
  return COLLECTIONS.some((c) => c.key === key);
}

export function getCollection(key: string): Collection {
  const collection = COLLECTIONS.find((c) => c.key === key);
  if (!collection) throw new Error(`Unknown project collection: ${key}`);
  return collection;
}
