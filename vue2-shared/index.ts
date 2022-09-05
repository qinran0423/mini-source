export const emptyObject = Object.freeze({})

export const isArray = Array.isArray

export function isUndef(v) {
  return v === undefined || v === null
}
export function isDef(v) {
  return v !== undefined && v !== null
}

export function isTrue(v) {
  return v === true
}

export function isFalse(v) {
  return v === false
}

export function isPrimitive(value) {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    // $flow-disable-line
    typeof value === "symbol" ||
    typeof value === "boolean"
  )
}

export function isObject(obj) {
  return obj !== null && typeof obj === "object"
}

const _toString = Object.prototype.toString
export function toRawType(value?) {
  return _toString.call(value).slice(8, -1)
}

export function isPlainObject(obj) {
  return _toString.call(obj) === "[object Object]"
}

export function isPromise(val) {
  return (
    isDef(val) &&
    typeof val.then === "function" &&
    typeof val.catch === "function"
  )
}

export function cached(fn) {
  const cache = Object.create(null)
  return function cachedFn(str) {
    var hit = cache[str]
    return hit || (cache[str] = fn(str))
  }
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const camelizeRE = /-(\w)/g
export const camelize = cached((str) => {
  return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ""))
})
