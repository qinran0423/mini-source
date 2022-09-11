const fs = require("fs")

function parse(src) {
  const obj = {}

  src
    .toString()
    .split("\n")
    .forEach((line, index) => {
      const keyValueStr = line.split("=")
      const key = keyValueStr[0]
      const val = keyValueStr[1] || ""
      obj[key] = val
    })
  return obj
}

export default {
  parse
}
