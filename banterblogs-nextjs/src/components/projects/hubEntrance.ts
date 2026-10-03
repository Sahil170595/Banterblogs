// The projects hub's first-load entrance groups (globals.css): the title, the
// intro, then the stats with the collection tabs, then the first cards. A
// plain module, so the server layout and the client tabs read the same numbers.
export const HUB_ENTRANCE_GROUP = { title: 0, intro: 1, tabs: 2 } as const;
