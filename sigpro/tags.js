import { h } from '../sigpro.js';

if (typeof window !== 'undefined') {
  'a abbr article aside audio b blockquote br button canvas caption cite code col colgroup datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr i iframe img input ins kbd label legend li main mark meter nav object ol optgroup option output p picture pre progress section select slot small source span strong sub summary sup svg table tbody td template textarea tfoot th thead time tr u ul video'
    .split(' ').forEach(tag => {
      window[tag] = (props, children) => h(tag, props, children);
      // window[tag] = (...args) => h(tag, ...args);
    });
  console.log('SigPro tags ready');
}