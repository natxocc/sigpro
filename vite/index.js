/**
 * SigPro Vite Plugin
 * @module sigpro/vite
 */

import sigproRouter from './router.js';

/**
 * Vite plugin for SigPro file-based routing
 * 
 * @example
 * ```javascript
 * // vite.config.js
 * import sigproRouter from 'sigpro/vite';
 * 
 * export default {
 *   plugins: [sigproRouter()]
 * };
 * ```
 * 
 * @param {import('./index.d.ts').SigProRouterOptions} [options] - Plugin configuration options
 * @returns {import('vite').Plugin} Vite plugin instance
 */
export default sigproRouter;

export { sigproRouter };