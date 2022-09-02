export function myOmit(value, args) {
  const shallowCopy = Object.assign({}, value)

  for (let i = 0; i < args.length; i++) {
    const key = args[i]
    if (key in shallowCopy) {
      delete shallowCopy[key]
    }
  }

  return shallowCopy
}

// Object.assign() 方法将所有可枚举（Object.propertyIsEnumerable() 返回 true）和自有（Object.hasOwnProperty() 返回 true）属性从一个或多个源对象复制到目标对象，返回修改后的对象。
