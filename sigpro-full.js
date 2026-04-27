// sigpro-full.js
export * from './sigpro.js';
import './sigpro/tags.js';
import './sigpro/xss.js';
import { $, $$, watch, h, when, each, router, mount, batch } from './sigpro.js';
if (typeof window !== 'undefined') {
  const props = {};
  for (const fn of [['$', $], ['$$', $$], ['watch', watch], ['h', h], ['when', when], ['each', each], ['router', router], ['mount', mount], ['batch', batch]]) {
    props[fn[0]] = { value: fn[1], writable: false, configurable: false, enumerable: true };
  }
  Object.defineProperties(window, props);
}