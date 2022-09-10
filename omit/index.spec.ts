import { describe, expect, test } from "vitest"
import { myOmit } from "."

describe("omit", () => {
  test("should create a shallow copy", () => {
    const mick = { name: "mick" }
    const copy = myOmit(mick, [])
    expect(copy).toEqual({ name: "mick" })
  })

  test("should drop fields which are passed in ", () => {
    const mick = { name: "mick", age: 18 }

    const copy = myOmit(mick, ["age"])

    expect(copy).toEqual({ name: "mick" })
    expect(mick).toEqual({ name: "mick", age: 18 })
    expect(myOmit(mick, ["name", "age"])).toEqual({})
  })
})
