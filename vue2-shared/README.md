上篇文章写了[arrify转数组](https://juejin.cn/post/7143239847421935624)，无论传给`arrify`什么样的数据都是返回一个数组，相对而言还是比较简单的。这篇文章分享一个比较有意思的东西，那就是`Vue`中如何实现`cache`缓存的。提前揭晓答案--闭包。下面我们就来手写一个吧。第一步，毫无疑问当然是我们的测试文件咯。
## 添加测试文件
继续使用`vitest`测试,想知道具体怎么操作的，可以看下专栏第一篇文章。

刚开始学习写测试，大家多提意见哈。😋
```js
test.only("cached", () => {
  const fnMock = vi.fn((str) => str)
  const getName = cached(fnMock)
  const name = getName("mick")
  expect(name).toBe("mick")
  expect(fnMock).toHaveBeenCalled()
  expect(fnMock).toHaveBeenCalledTimes(1)
  const name1 = getName("mick")
  expect(name1).toBe("mick")
  expect(fnMock).toHaveBeenCalledTimes(1)
})
```
首先模拟一个函数，这个函数传入一个字符串，返回一个字符串。为什么要这么模拟呢？我们拿`Vue`当中`capitalize`首字母转大写举例（当然我们可以暂时不用太多的关心`capitalize`是怎么实现的）
```js
const capitalize = cached((str) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
})
```
可以看到`cached`传入了一个函数，这个函数要实现的就是传入一个字符串，返回一个字符串（首字母转成大写）。所以我们要模拟的就是类似这样的一个函数。

回归正题

模拟了一个函数`fnMock`,传给`cached`并执行，返回了`getName`函数。然后调用`getName`函数传入字符串`mick`,用`name`变量接收，这个变量我们期望应该是`mick`。此时模拟的`fnMock`应该被调用了一次，当再次执行`getName`函数同样传入`mick`时，仍然能拿到这个值，但是模拟的`fnMock`还是被调用一次。因为`mick`被缓存了。

没错，就是用文章开头提到的"闭包"解决。

## 实现cache
不废话，直接上代码
```js
export function cached(fn) {
  const cache = Object.create(null)
  return function cachedFn(str) {
    var hit = cache[str]
    return hit || (cache[str] = fn(str))
  }
}
```
首先创建一个空对象方便存储需要缓存的值。然后返回一个函数`cachedFn`,参数`fn`就是就是我们测试中的`fnMock`,函数内部首先去获取我们想要拿到的值`cache[str]`,第一次肯定是拿不到的，所以需要对其赋值`cache[str] = fn(str)`并返回,此时`fnMock`已经被执行了1次。此时根据闭包的特性，传入的`str`已经被缓存了起来。当第二次传入同样的值的时候，`var hit = cache[str]`就可以获取到了，则直接返回，所以`fnMock`不会被再次执行，只有首次执行了1次。


欢迎大家提出建议和意见，觉得还可以的话，点个star。
[juejin](https://juejin.cn/post/7144286257613389831)


