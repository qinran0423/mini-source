import { describe, expect, test } from "vitest"
import fs from "fs"
import dotenv from "."

describe("dotenv", () => {
  test("parse", () => {
    const parsed = dotenv.parse(
      fs.readFileSync("dotenv/.env", { encoding: "utf8" })
    )
    expect(parsed).toEqual({
      NAME: "Mick",
      AGE: "18"
    })
  })
})
