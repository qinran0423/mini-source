export default function mitt(all) {
  return {
    all,
    emit(type) {
      let handlers = all.get(type)
      handlers.forEach((handler) => {
        handler()
      })
    },
    on(type, handler) {
      const handlers = all.get(type)
      if (handlers) {
        handlers.push(handler)
      } else {
        all.set(type, [handler])
      }
    },
    off(type, handler) {
      const handlers = all.get(type)
      if (handlers) {
        handlers.splice(handlers.indexOf(handler) >>> 0, 1)
      } else {
        all.set(type, [])
      }
    }
  }
}
