// The projects' collections: the /projects tab strip, one page each at
// /projects/<key>. Order here is the tab order and the catalog's sort.

export const COLLECTIONS = [
  {
    key: 'reinforcement-learning',
    label: 'Reinforcement learning',
    title: 'Reinforcement Learning Projects',
    description: 'Environments with legal-action masks, terminal rewards and paired policy evaluation, each running live on its page.',
  },
  {
    key: 'agents-and-evaluation',
    label: 'Agents & evaluation',
    title: 'Agent and Evaluation Projects',
    description: 'Agent harnesses and the evaluations that check them: tool use, workflows and policy gates.',
  },
  {
    key: 'systems',
    label: 'Systems',
    title: 'Systems Projects',
    description: 'Retrieval, scheduling and governance engines, with their failure cases left in view.',
  },
  {
    key: 'product',
    label: 'Product',
    title: 'Product Projects',
    description: 'Applications built end to end, from interaction model to state handling.',
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
