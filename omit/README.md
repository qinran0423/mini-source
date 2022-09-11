最近突然有个新的想法，想去看看前端的小库来提升自己的编码能力。但是又不知道怎么去证明自己是否真的看懂了，那就实现一个mini的吧。
## 添加测试文件
我们通过vitest来实现测试的功能。
```js
pnpm add -D vitest
```
然后再`package.json`文件中添加我们的执行脚本
```js
 "scripts": {
    "test": "vitest"
  }
```
接着我们就可以编写测试文件了
```js
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
```
## 实现`omit`函数
我们要做的肯定是是要将测试文件通过。如果测试通过了，那就说明我们的功能基本上是已经实现了，剩下的是代码重构了。

根据测试文件我们可以看到，提出对象中的属性生成一个新的对象，但是原对象是不发生改变的。那可以用`Object.assign`,下面介绍一个`Object.assign`

`Object.assign()` 方法将所有可枚举（`Object.propertyIsEnumerable()` 返回 `true`）和自有（`Object.hasOwnProperty()` 返回 `true`）属性从一个或多个源对象复制到目标对象，返回修改后的对象。

我们首先利用`Object.assign`将原对象复制一份，然后遍历复制过后的对象将需要剔除的属性删除即可。
```js
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
```
执行测试文件
![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0fbb8fd4a49b4bed9e836483d57da704~tplv-k3u1fbpfcp-watermark.image?)

欢迎大家提出建议和意见，觉得还可以的话，来个star
