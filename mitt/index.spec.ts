import { expect, it, describe, vi, beforeEach } from "vitest"
import mitt from "."

describe("mitt", () => {
  it("should default export be a function", () => {
    expect(mitt).toBeTypeOf("function")
  })

  it("should accept an optional event handler map", () => {
    const map = new Map()
    const a = vi.fn()
    const b = vi.fn()
    map.set("foo", [a, b])
    const events = mitt(map)
    events.emit("foo")
    expect(a).toHaveBeenCalled()
    expect(b).toHaveBeenCalled()
  })
})

describe("mitt#", () => {
  let events, inst

  beforeEach(() => {
    events = new Map()
    inst = mitt(events)
  })
  describe("properties", () => {
    it("should expose the event handler properties", () => {
      expect(inst).toHaveProperty("all")
      expect(inst).toHaveProperty("on")
      expect(inst).toHaveProperty("off")
    })
  })

  describe("on()", () => {
    it("should register handler for new type", () => {
      const foo = () => {}
      inst.on("foo", foo)
      expect(events.get("foo")).toStrictEqual([foo])
    })

    it("should register handlers for any type strings", () => {
      const foo = () => {}
      inst.on("constructor", foo)
      expect(events.get("constructor")).toStrictEqual([foo])
    })

    it("should append handler for existing type", () => {
      const foo = () => {}
      const bar = () => {}
      inst.on("foo", foo)
      inst.on("foo", bar)
      expect(events.get("foo")).toStrictEqual([foo, bar])
    })

    it("should NOT normal case", () => {
      const foo = () => {}
      inst.on("FOO", foo)
      inst.on("Bar", foo)
      inst.on("baz:baT!", foo)

      expect(events.get("FOO")).toStrictEqual([foo])
      expect(events.has("foo")).toEqual(false)
      expect(events.get("Bar")).toStrictEqual([foo])
      expect(events.has("bar")).toEqual(false)
      expect(events.get("baz:baT!")).toStrictEqual([foo])
    })
  })

  describe("off()", () => {
    it("should remove handler for type", () => {
      const foo = () => {}
      inst.on("foo", foo)
      inst.off("foo", foo)
      expect(events.get("foo")).toStrictEqual([])
    })

    it("should NOT normalize case", () => {
      const foo = () => {}
      inst.on("FOO", foo)
      inst.on("Bar", foo)
      inst.on("baz:bat!", foo)

      inst.off("FOO", foo)
      inst.off("Bar", foo)
      inst.off("baz:baT!", foo)

      expect(events.get("FOO")).toStrictEqual([])
      expect(events.has("foo")).toEqual(false)
      expect(events.get("Bar")).toStrictEqual([])
      expect(events.has("bar")).toEqual(false)
      expect(events.get("baz:bat!")).toStrictEqual([foo])
    })
  })
})
