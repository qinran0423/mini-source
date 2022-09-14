import { test, expect } from "vitest"
import { arrify } from "."

test("main", () => {
  expect(arrify("foo")).toEqual(["foo"])

  expect(arrify(null)).toEqual([])

  expect(arrify(undefined)).toEqual([])

  expect(arrify([1, 2])).toEqual([1, 2])

  expect(arrify(new Map([[1, 2]]))).toEqual([[1, 2]])

  expect(arrify(new Set([1, 2]))).toEqual([1, 2])

  const fooArray = ["foo"]
  expect(arrify(fooArray)).toEqual(fooArray)
})
