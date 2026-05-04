import { $, $$, watch, batch, h, Fragment, mount, when, each, router, onUnmount, isArr, isFunc, isObj } from "./sigpro.js"

if (typeof window !== "undefined") {
  Object.assign(window, { $, $$, watch, h, Fragment, when, each, router, mount, batch, onUnmount, isArr, isFunc, isObj })
}