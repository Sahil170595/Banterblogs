// The attributes the server-rendered map (EcosystemMap) writes and its client
// island (MapTrace) reads and sets. In a module of their own: a server
// component cannot read plain values out of a 'use client' file.

/** on a node link: its id */
export const NODE_ATTRIBUTE = 'data-node';
/** on a node or an edge: the ids it lights for, space separated */
export const LINKS_ATTRIBUTE = 'data-links';
/** on the map while a node is traced: that node's id */
export const ACTIVE_ATTRIBUTE = 'data-active';
/** on what the traced node touches */
export const LIT_ATTRIBUTE = 'data-lit';
/** on the line that reads out the traced node's role */
export const READOUT_ATTRIBUTE = 'data-map-readout';
