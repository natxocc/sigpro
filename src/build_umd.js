import * as core from "./sigpro.js"
import * as utils from "./sigpro.utils.js"

if (typeof window !== "undefined") {
  const SigPro = { ...core, ...utils };
  
  window.SigPro = SigPro; 
  
  Object.assign(window, SigPro); 
}