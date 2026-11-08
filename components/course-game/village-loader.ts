// Keep the browser-only engine out of the server and initial client bundles.
export const loadVillageEngine = () => import('./phaser/village-engine');
