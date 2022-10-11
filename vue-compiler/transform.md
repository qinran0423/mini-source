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
`traverseNode`递归的遍历`ast`中的每个节点，然后执行一些转换函数，有些转换函数还会设计退出函数，然后用`exitFns`接收，这些退出函数在子节点处理完毕之后执行，因为有些逻辑需要依赖子节点处理完毕的结果。

下面我们来看下转换函数,这里我们主要讲解3种转换函数：`Element`、表达式和`Text`。
### Element转换函数
```js
export const transformElement: NodeTransform = (node, context) => {
//  返回退出函数 
  return function postTransformElement() {
    node = context.currentNode!

    if (
      !(
        node.type === NodeTypes.ELEMENT &&
        (node.tagType === ElementTypes.ELEMENT ||
          node.tagType === ElementTypes.COMPONENT)
      )
    ) {
      return
    }

    const { tag, props } = node
    const isComponent = node.tagType === ElementTypes.COMPONENT

    let vnodeTag = isComponent
      ? resolveComponentType(node as ComponentNode, context)
      : `"${tag}"`

    const isDynamicComponent =
      isObject(vnodeTag) && vnodeTag.callee === RESOLVE_DYNAMIC_COMPONENT
    // 属性
    let vnodeProps: VNodeCall['props']
    // 子节点
    let vnodeChildren: VNodeCall['children']
    // 动态组件、TELEPORT、SUSPENSE被视为Block
    let shouldUseBlock =
      // dynamic component may resolve to plain elements
      isDynamicComponent ||
      vnodeTag === TELEPORT ||
      vnodeTag === SUSPENSE ||
      (!isComponent &&
        (tag === 'svg' || tag === 'foreignObject'))

    // 属性处理
    if (props.length > 0) {
      ···
    }

    // 子节点处理
    if (node.children.length > 0) {

      const shouldBuildAsSlots =
        isComponent &&
        // Teleport is not a real component and has dedicated runtime handling
        vnodeTag !== TELEPORT &&
        // explained above.
        vnodeTag !== KEEP_ALIVE

      if (shouldBuildAsSlots) {
        // 插槽的处理
        const { slots, hasDynamicSlots } = buildSlots(node, context)
        vnodeChildren = slots
        if (hasDynamicSlots) {
          patchFlag |= PatchFlags.DYNAMIC_SLOTS
        }
      } else if (node.children.length === 1 && vnodeTag !== TELEPORT) {
        const child = node.children[0]
        const type = child.type
        // check for dynamic text children
        const hasDynamicTextChild =
          type === NodeTypes.INTERPOLATION ||
          type === NodeTypes.COMPOUND_EXPRESSION
        if (
          hasDynamicTextChild &&
          getConstantType(child, context) === ConstantTypes.NOT_CONSTANT
        ) {
          patchFlag |= PatchFlags.TEXT
        }
        // pass directly if the only child is a text node
        // (plain / interpolation / expression)
        if (hasDynamicTextChild || type === NodeTypes.TEXT) {
          vnodeChildren = child as TemplateTextChildNode
        } else {
          vnodeChildren = node.children
        }
      } else {
        vnodeChildren = node.children
      }
    }

    node.codegenNode = createVNodeCall(
      context,
      vnodeTag,
      vnodeProps,
      vnodeChildren,
      vnodePatchFlag,
      vnodeDynamicProps,
      vnodeDirectives,
      !!shouldUseBlock,
      false /* disableTracking */,
      isComponent,
      node.loc
    )
  }
}
```
这里我截取了比较核心的代码。`transformElement`返回一个退出函数，会在当前的节点的所有子节点处理完毕之后执行。这里的优化部分我们先跳过（主要还没深入了解😄）。处理了节点的属性`props`,然后处理了节点的`children`。我们主要看一下对节点的`children`的处理。

如果组件有子节点，那么说明是组件的插槽。如果是普通的元素节点，那么直接将`children`赋值给`vnodeChildren`。如果节点只有一个子节点，而且是插值，表达式或者文本节点，则直接将这个节点复制给`vnodeChildren`。
