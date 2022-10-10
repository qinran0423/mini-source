上一篇主要讲到了在`vue`中，`template`通过`parse`生成`ast`（抽象语法树）的主要核心流程。这个`ast`是对模板的完整描述，不能直接拿来生成代码，缺乏语义化，并且没有包含编译优化的相关属性，还需要进一步转换，所以用到了我们今天需要讲解的`transform`。

### 主要流程
```js
export function transform(root, options = {}) {
  const context = createTransformsContext(root, options)

  traverseNode(root, context)

  createRootCodegen(root)

  root.helpers = [...context.helpers.keys()]
}
```
首先是创建`transform`上下文，通过`traverseNode`遍历`ast`节点，通过`createRootCodegen`创建根代码生成节点（当然还有一些静态提升的东东，这里暂时先不描述了）。
### 创建transform上下文
```js
function createTransformsContext(root, options) {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms || [],
    helpers: new Map(),
    helper(key) {
      context.helpers.set(key, 1)
    }
  }

  return context
}
```
`transform`上下文对象中维护了一些配置，这里我们就把核心流程中主要用的配置拿了出来。比如整个`ast`节点，转换过程中需要调用的一些转换函数。
### 遍历AST节点
```js
function traverseNode(node: any, context) {
  // 节点转换函数
  const nodeTransforms = context.nodeTransforms
  const exitFns: any = []
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i]
    // 有些转换函数会设计一个退出函数，在处理完子节点后执行
    const onExit = transform(node, context)
    if (onExit) exitFns.push(onExit)
  }

  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      // 需要导入toString辅助函数
      context.helper(TO_DISPLAT_STRING)
      break
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      // 遍历子节点
      traverseChildren(node, context)
      break
    default:
      break
  }

  // 执行转换函数返回的退出函数
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}
```