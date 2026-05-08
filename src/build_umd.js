import { $, watch, batch, h, Fragment, mount, when, each, isArr, isFunc, isObj } from "./sigpro.js"
import { router, addLang, t } from "./sigpro.plus.js"

if (typeof window !== "undefined") {
  Object.assign(window, { $, watch, h, Fragment, when, each, router, addLang, t, mount, batch, isArr, isFunc, isObj })
}