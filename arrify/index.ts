export function arrify(value) {
  if (value === null || value === undefined) {
    return []
  }

  if (typeof value === "string") {
    return [value]
  }

  if (typeof value[Symbol.iterator] === "function") {
    return [...value]
  }
}
