import { vi } from "vitest"
import { expect, test } from "vitest"
import {
  cached,
  camelize,
  capitalize,
  emptyObject,
  isArray,
  isDef,
  isFalse,
  isObject,
  isPlainObject,
  isPrimitive,
  isPromise,
  isTrue,
  isUndef,
  toRawType
} from "."

test("emptyObject", () => {
  const obj = emptyObject
  expect(obj).toEqual({})
})

test("isArray", () => {
  const arr = []
  expect(isArray(arr)).toBe(true)
})

test("isUndef & isDef", () => {
  let a
  expect(isUndef(a)).toBe(true)
  a = 1
  expect(isDef(a)).toBe(true)
})

test("isTure", () => {
  expect(isTrue(true)).toBe(true)
  expect(isTrue(false)).not.toBe(true)
})

test("isFalse", () => {
  expect(isFalse(false)).toBe(true)
  expect(isFalse(true)).not.toBe(true)
})

test("isPrimitive", () => {
  let a = 1
  expect(isPrimitive(a)).toBe(true)
  let b = {}
  expect(isPrimitive(b)).not.toBe(true)
})

test("isObject", () => {
  expect(isObject([])).toBe(true)
  expect(isObject(null)).not.toBe(true)
  expect(isObject({})).toBe(true)
})

test("toRawType", () => {
  expect(toRawType("")).toBe("String")
  expect(toRawType()).toBe("Undefined")
})

test("isPlainObject", () => {
  expect(isPlainObject([])).toBe(false)
  expect(isPlainObject({})).toBe(true)
})

test("isPromise", () => {
  const p1 = new Promise(function (resolve, reject) {
    resolve("mick")
  })
  expect(isPromise(p1)).toBe(true)
})

test("cached", () => {
  const fnMock = vi.fn((str) => str)
  const getName = cached(fnMock)
  const name = getName("name")
  expect(name).toBe("name")
  expect(fnMock).toHaveBeenCalled()
  expect(fnMock).toHaveBeenCalledTimes(1)
})

test("camelize", () => {
  expect(camelize("on-click")).toBe("onClick")
})

test("capitalize", () => {
  expect(capitalize("name")).toBe("Name")
})
