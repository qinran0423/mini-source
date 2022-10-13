上一篇主要讲到了在`vue`中，`template`通过`parse`生成`ast`（抽象语法树）的主要核心流程。这个`ast`是对模板的完整描述，不能直接拿来生成代码，缺乏语义化，并且没有包含编译优化的相关属性，还需要进一步转换，所以用到了我们今天需要讲解的`transform`。

### 主要流程
```js
export function transform(root: RootNode, options: TransformOptions) {
  const context = createTransformContext(root, options)
  traverseNode(root, context)
  if (options.hoistStatic) {
    hoistStatic(root, context)
  }
  if (!options.ssr) {
    createRootCodegen(root, context)
  }
  // finalize meta information
  root.helpers = [...context.helpers.keys()]
  root.components = [...context.components]
  root.directives = [...context.directives]
  root.imports = context.imports
  root.hoists = context.hoists
  root.temps = context.temps
  root.cached = context.cached

  if (__COMPAT__) {
    root.filters = [...context.filters!]
  }
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
    ···
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

最后通过`createVNodeCall`创建一个`VNodeCall`接口的代码生成节点
```js
export function createVNodeCall(
  context: TransformContext | null,
  tag: VNodeCall['tag'],
  props?: VNodeCall['props'],
  children?: VNodeCall['children'],
  patchFlag?: VNodeCall['patchFlag'],
  dynamicProps?: VNodeCall['dynamicProps'],
  directives?: VNodeCall['directives'],
  isBlock: VNodeCall['isBlock'] = false,
  disableTracking: VNodeCall['disableTracking'] = false,
  isComponent: VNodeCall['isComponent'] = false,
  loc = locStub
): VNodeCall {
  if (context) {
    if (isBlock) {
      context.helper(OPEN_BLOCK)
      context.helper(getVNodeBlockHelper(context.inSSR, isComponent))
    } else {
      context.helper(getVNodeHelper(context.inSSR, isComponent))
    }
    if (directives) {
      context.helper(WITH_DIRECTIVES)
    }
  }

  return {
    type: NodeTypes.VNODE_CALL,
    tag,
    props,
    children,
    patchFlag,
    dynamicProps,
    directives,
    isBlock,
    disableTracking,
    isComponent,
    loc
  }
}
```
代码多次出现了`context.helper`，会把`Symbol`对象添加到`context.helpers`数组中，主要是为了生成最后的代码用，我们分析`generate`的时候会提到。
### 表达式转换函数
```js
export const transformExpression: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.INTERPOLATION) {
    node.content = processExpression(
      node.content as SimpleExpressionNode,
      context
    )
  } else if (node.type === NodeTypes.ELEMENT) {
    // handle directives on element
    for (let i = 0; i < node.props.length; i++) {
      const dir = node.props[i]
      // do not process for v-on & v-for since they are special handled
      if (dir.type === NodeTypes.DIRECTIVE && dir.name !== 'for') {
        const exp = dir.exp
        const arg = dir.arg
        // do not process exp if this is v-on:arg - we need special handling
        // for wrapping inline statements.
        if (
          exp &&
          exp.type === NodeTypes.SIMPLE_EXPRESSION &&
          !(dir.name === 'on' && arg)
        ) {
          dir.exp = processExpression(
            exp,
            context,
            // slot args must be processed as function params
            dir.name === 'slot'
          )
        }
        if (arg && arg.type === NodeTypes.SIMPLE_EXPRESSION && !arg.isStatic) {
          dir.arg = processExpression(arg, context)
        }
      }
    }
  }
}
```
我们可以看到`transformExpression`主要对插值节点和`element`节点做了区分。如果是插值节点则执行`processExpression`函数。我们从测试用例中的一个简单的例子来说，`{{ foo }}`执行了`processExpression`函数大概会生成这个样子`_ctx.foo`。当碰到表达式的值会变成一个复合表达式对象，这里就不多赘述了，感兴趣的大家自己解刨😁。如果是`element`节点则会对属性进行处理。
### Text转换函数
```js
export const transformText: NodeTransform = (node, context) => {
  if (
    node.type === NodeTypes.ROOT ||
    node.type === NodeTypes.ELEMENT ||
    node.type === NodeTypes.FOR ||
    node.type === NodeTypes.IF_BRANCH
  ) {
    // 返回一个退出函数
    return () => {
      const children = node.children
      let currentContainer: CompoundExpressionNode | undefined = undefined
      let hasText = false
      // 通过双层循环将相邻的两个节点合并
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (isText(child)) {
          hasText = true
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j]
            if (isText(next)) {
              if (!currentContainer) {
                 //创建COMPOUND_EXPRESSION 
                currentContainer = children[i] = createCompoundExpression(
                  [child],
                  child.loc
                )
              }
              // 合并
              currentContainer.children.push(` + `, next)
              children.splice(j, 1)
              j--
            } else {
              currentContainer = undefined
              break
            }
          }
        }
      }

      if (
        !hasText ||
        // 单个文件子节点 直接退出 因为可以直接赋值 不需要转换
        (children.length === 1 &&
          (node.type === NodeTypes.ROOT ||
            (node.type === NodeTypes.ELEMENT &&
              node.tagType === ElementTypes.ELEMENT &&
              !node.props.find(
                p =>
                  p.type === NodeTypes.DIRECTIVE &&
                  !context.directiveTransforms[p.name]
              ) &&
              !(__COMPAT__ && node.tag === 'template'))))
      ) {
        return
      }

      // 为每个文本节点创建代码生成节点
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (isText(child) || child.type === NodeTypes.COMPOUND_EXPRESSION) {
          const callArgs: CallExpression['arguments'] = []
         
          if (child.type !== NodeTypes.TEXT || child.content !== ' ') {
            callArgs.push(child)
          }
          // mark dynamic text with flag so it gets patched inside a block
          if (
            !context.ssr &&
            getConstantType(child, context) === ConstantTypes.NOT_CONSTANT
          ) {
            callArgs.push(
              PatchFlags.TEXT +
                (__DEV__ ? ` /* ${PatchFlagNames[PatchFlags.TEXT]} */` : ``)
            )
          }
          children[i] = {
            type: NodeTypes.TEXT_CALL,
            content: child,
            loc: child.loc,
            codegenNode: createCallExpression(
              context.helper(CREATE_TEXT),
              callArgs
            )
          }
        }
      }
    }
  }
}
```
首先对节点进行判断，如果是根节点、元素节点、`for`指令和`if`指令这返回一个退出函数（确保所有表达式节都已经被处理了）。然后通过双层循环将相邻的两个节点合并，最后为每个文本节点创建代码生成节点。我们直接来看用例吧:`<div>hi, {{message}}</div>`通过`parse`生成的`ast`
```js
  {
    tag: 'div',
    type: 2,
    children:[
      {
        content: 'hi',
        type: 3
      },
      {
        content: {
          content: 'message',
          type: 1
        },
        type: 0
      }
    ]
  }
```
转换后 文本节点和插值节点会被合并成一个复合节点（`COMPOUND_EXPRESSION`）
```js
{
  tag: 'div',
  type: 2,
  children:[
    {
      children: [
        {
          content: 'hi',
          type: 3
        },
        ' + ',
        {
          content: {
            content: 'message',
            type: 1
          },
          type: 0
        }
      ],
      type: 5 // COMPOUND_EXPRESSION
    }
  ]
}
```
合并节点之后，当只有一个单个文本子元素的节点时候，则什么都不需要做，直接退出，因为可以对`textContent`直接赋值更新。

最后为子文本节点创建一个调用函数表达式的代码生成节点。就是处理已经合并过的子节点，然后遍历找到文本节点或者是复合表达式节点，通过`createCallExpression`创建一个调用函数表达式的代码生成节点
```js
export function createCallExpression<T extends CallExpression['callee']>(
  callee: T,
  args: CallExpression['arguments'] = [],
  loc: SourceLocation = locStub
): InferCodegenNodeType<T> {
  return {
    type: NodeTypes.JS_CALL_EXPRESSION,
    loc,
    callee,
    arguments: args
  } as InferCodegenNodeType<T>
}
```
返回一个类型为`JS_CALL_EXPRESSION`的对象，`callee`为函数名，我们创建是函数表达式节点函数名应该是`createTextVNode`,参数就是`child`。
### createRootCodegen
最后创建根节点的代码生成器。
```js
function createRootCodegen(root: RootNode, context: TransformContext) {
  const { helper } = context
  const { children } = root
  if (children.length === 1) {
    // 子节点是单个元素节点
    const child = children[0]
    // if the single child is an element, turn it into a block.
    if (isSingleElementRoot(root, child) && child.codegenNode) {
      // single element root is never hoisted so codegenNode will never be
      // SimpleExpressionNode
      const codegenNode = child.codegenNode
      if (codegenNode.type === NodeTypes.VNODE_CALL) {
        makeBlock(codegenNode, context)
      }
      root.codegenNode = codegenNode
    } else {
      // - single <slot/>, IfNode, ForNode: already blocks.
      // - single text node: always patched.
      // root codegen falls through via genNode()
      root.codegenNode = child
    }
  } else if (children.length > 1) {
    // 子节点是多个节点，返回一个flagement代码生成节点
    // root has multiple nodes - return a fragment block.
    let patchFlag = PatchFlags.STABLE_FRAGMENT
    let patchFlagText = PatchFlagNames[PatchFlags.STABLE_FRAGMENT]
    // check if the fragment actually contains a single valid child with
    // the rest being comments
    if (
      __DEV__ &&
      children.filter(c => c.type !== NodeTypes.COMMENT).length === 1
    ) {
      patchFlag |= PatchFlags.DEV_ROOT_FRAGMENT
      patchFlagText += `, ${PatchFlagNames[PatchFlags.DEV_ROOT_FRAGMENT]}`
    }
    root.codegenNode = createVNodeCall(
      context,
      helper(FRAGMENT),
      undefined,
      root.children,
      patchFlag + (__DEV__ ? ` /* ${patchFlagText} */` : ``),
      undefined,
      undefined,
      true,
      undefined,
      false /* isComponent */
    )
  } else {
    // no children = noop. codegen will return null.
  }
}
```
首先对`root`的子节点判断，如果是单个元素节点，则返回一个`Block`,然后将`child`的`codegenNode`赋值给`root`节点的`codegenNode`。如果是多个元素节点，则返回一个`fragment`代码生成节点，然后赋值给`root`节点的`codegenNode`。

以上做的操作都是为了后面生成代码做准备的。

这篇我们大致讲解了`transform`的主要作用，以及一些转换函数的作用。当然我也借助了一些参考资料来帮助我理解，哪里写的不好或者写的不对的地方，希望大家多多评论。