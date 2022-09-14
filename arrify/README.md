
上一篇文章写了[omit.js 剔除对象中的属性](https://juejin.cn/post/7141654333812604958),相对而言比较简单。这一篇实现一个比较简易的库。
## 添加测试文件
依然和上篇文章一样，使用`vitest`测试，具体怎么操作可以移步上一篇文章，这里我们就只写写测试文件了。
```js
import { test, expect } from "vitest"
import { arrify } from "."

test("main", () => {
  expect(arrify("foo")).toEqual(["foo"])

  expect(arrify(null)).toEqual([])

  expect(arrify(undefined)).toEqual([])

  expect(arrify([1, 2])).toEqual([1, 2])
  
  expect(arrify(new Map([[1, 2]]))).toEqual([[1, 2]])

  expect(arrify(new Set([1, 2]))).toEqual([1, 2])

})

```
## 实现`arrify`
毫无疑问我们需要实现一个`arrify`函数并导出,并且需要传入参数。
### 传入字符串
首先看这个测试
```js
expect(arrify("foo")).toEqual(["foo"])
```
`arrify`传入一个字符串，返回的是一个数组，而且这个数组将我们传入的字符串包裹起来。那我们可以很简单的实现出来。
```js
export function arrify(value) {
  if (typeof value === "string") {
    return [value]
  }
}
```
### 传入`null`或`undefined`
下面看下这个测试
```js
expect(arrify(null)).toEqual([])

expect(arrify(undefined)).toEqual([])
```
如果传入的是`null`或者`undefined`则直接返回`[]`
```js
export function arrify(value) {
  if (value === null || value === undefined) {
    return []
  }
  ···
}
```
### 传入数组
```js
expect(arrify([1, 2])).toEqual([1, 2])
```
如果传入的是数组，则直接返回
```js
export function arrify(value) {
  ···
  if (Array.isArray(value)) {
    return value
  }
  ···
}
```
### 可迭代对象
```js
expect(arrify(new Map([[1, 2]]))).toEqual([[1, 2]])

expect(arrify(new Set([1, 2]))).toEqual([1, 2])
```
这里要着重介绍一下。`Symbol.iterator` 为每一个对象定义了默认的迭代器。当需要对一个对象进行迭代时（比如开始用于一个`for..of`循环中），它的`@@iterator`方法都会在不传参情况下被调用，返回的`迭代器`用于获取要迭代的值。

一些内置类型拥有默认的迭代器行为，其他类型（如 [`Object`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object)）则没有。下表中的内置类型拥有默认的`@@iterator`方法：

-   [`Array.prototype[@@iterator]()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/@@iterator)
-   [`TypedArray.prototype[@@iterator]()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/@@iterator)
-   [`String.prototype[@@iterator]()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/String/@@iterator)
-   [`Map.prototype[@@iterator]()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Map/@@iterator)
-   [`Set.prototype[@@iterator]()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Set/@@iterator)


我们可以像下面这样创建自定义的迭代器：
```js
var myIterable = {}
myIterable[Symbol.iterator] = function* () {
    yield 1;
    yield 2;
    yield 3;
};
[...myIterable] // [1, 2, 3]
```
所以我们想要让测试通过就可以判断`value[Symbol.iterator]`的类型是不是`function`即可
```js
export function arrify(value) {
  ···
  if (typeof value[Symbol.iterator] === "function") {
    return [...value]
  }
}
```

## 总结
以上就是我实现的一个手写`arrify`库。在手写过程中，会有很多自己的想法，思考测试该怎么写，思考代码该怎么重构，更重要的是你真的懂了源码，把它写下来就变成你自己的了。刚开始手写的库比较简单，后面会不断的给自己加大难度。

欢迎大家提出建议和意见，觉得还可以的话，点个赞。欢迎大家来个star
[掘金](https://juejin.cn/post/7143239847421935624/)