import { describe, expect, test } from "vitest"
import fs from "fs"
import dotenv from "."

describe("dotenv", () => {
  test("parse", () => {
    const parsed = dotenv.parse(fs.readFileSync("./.env", { encoding: "utf8" }))
    expect(parsed).toEqual({
      NAME: "Mick",
      AGE: "18"
    })
  })

  test("config", () => {
    dotenv.config()

    expect(process.env.NAME).toBe("Mick")
    expect(process.env.AGE).toBe("18")
  })

  test.only("config path", () => {
    const paresd = dotenv.config({
      path: "dotenv/.env"
    })
    expect(process.env.NAME).toBe("秦")
    expect(process.env.AGE).toBe("20")
  })
})
