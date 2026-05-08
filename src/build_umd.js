import { $, watch, batch, h, Fragment, mount, when, each, onUnmount, isArr, isFunc, isObj } from "./sigpro.js"
import { router } from "./router.js"
import { db } from "./utils.js"

if (typeof window !== "undefined") {
  Object.assign(window, { $, watch, h, Fragment, when, each, router, mount, batch, onUnmount, isArr, isFunc, isObj, db })
}