## 主要流程
现在我们就来一起分析一个简易的`vue3`的编译原理。一句话概括一下我们想要实现的功能，那就是将`template`模板生成我们想要的`render`函数即可。简单的一句话却蕴含着大量的知识。

```js
<div>hi, {{message}}</div> 
```
最后生成
```js
import { toDisplayString as _toDisplayString, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

export function render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createElementBlock("div", null, "hi, " + _toDisplayString(_ctx.message), 1 /* TEXT */))
}
```
首先`template`会通过词法分析、语法分析解析成`AST`(抽象语法树)，然后利用`transform`对`AST`进行优化，最后通过`generate`模块生成我们想要的`render`函数。

在`vue3`的源码中主要分成了3个部分（以下是简化后的源码）
```js
export function baseCompile(template){
  const ast = baseParse(template)
  transform(ast)
  return generate(ast)
}
```
- 通过`parse`将`template`生成`ast`
- 通过`transform`优化`ast`
- 通过`generate`生成`render`函数

由于这3个部分牵扯的东西比较多，我们这篇文章主要来讲解一下`parse`的实现(友情提示：为了让大家刚好的理解，本文的代码全部都是精简过得哦)
## parse的实现
我们就拿一个简单的例子入手
```js
<div><p>hi</p>{{message}}</div>
```
看似一个简单的例子，其实3种类型：`element`、`text`、插值。我们将这三种类型用枚举定义一下。
```js
const enum NodeTypes {
  ROOT,
  INTERPOLATION,
  SIMPLE_EXPRESSION,
  ELEMENT,
  TEXT
}
```
`ROOT`类型表示根节点，`SIMPLE_EXPRESSION`类型表示插值的内容。最后我们想要通过`parse`生成一个`ast`。
```js
{
    type: NodeTypes.ROOT
    children: [
        {
          type: NodeTypes.ELEMENT,
          tag: "div",
          children: [
            {
              type: NodeTypes.ELEMENT,
              tag: "p",
              children: [
                {
                  type: NodeTypes.TEXT,
                  content: "hi"
                }
              ]
            },
            {
              type: NodeTypes.INTERPOLATION,
              content: {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: "message"
              }
            }
          ]
        }
    ]
}
```
基于源码我们可以知道`ast`是由函数`baseParse`生成。那我们就从这个函数入手。
### baseParse
```js
export function baseParse(content: string) {
  const context = createParseContext(content)
  return createRoot(parserChildren(context, []))
}

function createParseContext(content: string) {
  return {
    source: content
  }
}

function createRoot(children) {
  return {
    children,
    type: NodeTypes.ROOT
  }
}

```
首先创建一个全局的上下文对象`context`,并且存储了`source`。`source`就是我们传入的模板内容。接着创建根节点，包含了`type`和`children`。而`children`是由`parseChildren`创建。
#### parseChildren
```js
function parseChildren(context, ancestors) {
  const nodes: any = []

  while (!isEnd(context, ancestors)) {
    const s = context.source
    let node
    if (s.startsWith("{{")) {
      node = parseInterpolation(context)
    } else if (s[0] === "<") {
      if (/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors)
      }
    } else {
      node = parseText(context)
    }
    nodes.push(node)
  }
  return nodes
}
```
`parseChildren`是负责解析子节点并创建`ast`节点数组。`parseChildren`是自顶向下分析各个子节点的，对于模板内容要从左到右依次解析。每当碰到一个`element`节点都要递归的调用`parseChildren`去解析它的子节点。当碰到`{{`则认为需要处理的是插值节点，当碰到`<`则认为需要处理的是`element`节点，其余的则统一认为处理的是`text`节点。每处理完一个节点都会生成`node`并`push`到`nodes`中，最后返回`nodes`当做是父`ast`节点的`children`属性。

当然从左到右依次循环解析就一定要有一个退出循环的条件`isEnd`
```js
function isEnd(context, ancestors) {
  const s = context.source

  if (s.startsWith("</")) {
    for (let i = 0; i < ancestors.length; i++) {
      const tag = ancestors[i]
      if (startsWithEndTagOpen(s, tag)) {
        return true
      }
    }
  }

  return !s
}
function startsWithEndTagOpen(source, tag) {
  return (
    source.startsWith("</") &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
  )
}
```
`ancestors`表示`element`标签的集合，大致的意思就是当碰到了结束标识符`</`,并且结束标签（`source.slice(2, 2 + tag.length)`）和`element`标签的集合中的标签匹配则说明当前的`element`节点处理完毕，则退出循环

下面我们就来看一下插值节点`parseInterpolation`、`element`节点`parseElement`和文本节点`parseText`分别是怎么处理的
#### parseInterpolation
```js
function parseInterpolation(context) {
  const openDelimiter = "{{"
  const closeDelimiter = "}}"

  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiter.length
  )

  advanceBy(context, openDelimiter.length)

  const rawContentLength = closeIndex - openDelimiter.length

  const rawContent = parseTextData(context, rawContentLength)

  const content = rawContent.trim()
  advanceBy(context, closeDelimiter.length)

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content
    }
  }
}

function advanceBy(context: any, length: number) {
  context.source = context.source.slice(length)
}

function parseTextData(context: any, length) {
  const content = context.source.slice(0, length)

  advanceBy(context, content.length)
  return content
}
```
我们主要是为了获取插值的内容然后返回一个插值对象即可。`closeIndex`表示“}}”所在的位置。`advanceBy`函数的功能是推进。比如"{{"是不需要处理的，那么就直接把它截取掉。`rawContentLength`代表“{{”和“}}”中间内容的长度，通过`parseTextData`获取“{{”和“}}”中间的内容，并返回。然后把中间内容的部分做推进。由于我们写代码习惯可能会给内容的前后做留白，所以需要用`trim`做处理。然后把最后的“}}”推进，返回一个插值类型的对象即可。
### parseElement
```js
function parseElement(context, ancestors) {
  const element: any = parseTag(context, TagType.Start)
  ancestors.push(element)
  element.children = parseChildren(context, ancestors)
  ancestors.pop()

  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End)
  } else {
    throw new Error(`缺少结束标签: ${element.tag}`)
  }

  return element
}

function parseTag(context: any, type: TagType) {
  const match: any = /^<\/?([a-z]*)/i.exec(context.source)
  const tag = match[1]
  advanceBy(context, match[0].length)
  advanceBy(context, 1)

  if (type === TagType.End) return

  return {
    type: NodeTypes.ELEMENT,
    tag
  }
}

function startsWithEndTagOpen(source, tag) {
  return (
    source.startsWith("</") &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
  )
}
```
`parseElement`第二个参数`ancestors`是一个数组来收集标签的（作用在上面的`isEnd`已经提到了）。通过`parseTag`获取标签名，`parseTag`通过正则拿到标签名然后返回一个标签对象，处理过的内容继续做推进。如果是结束标签则什么都不做。然后通过`parseChildren`递归的处理`element`的子节点。然后对结束标签进行处理，`startsWithEndTagOpen`判断是够存在结束标签，如果不存在则报错。
### parseText
```js
function parseText(context: any): any {
  let endIndex = context.source.length
  let endToken = ["<", "{{"]

  for (let i = 0; i < endToken.length; i++) {
    const index = context.source.indexOf(endToken[i])
    if (index !== -1 && endIndex > index) {
      endIndex = index
    }
  }

  const content = parseTextData(context, endIndex)

  return {
    type: NodeTypes.TEXT,
    content
  }
}
```
`endIndex`表示内容长度（此时内容的长度是已经推进过的字符到最后一个字符的长度）。比如
```js
<div>hi,{{message}}</div> 
```
能够进入到`parseText`函数中说明开始标签已经处理过了，所以`context.source`应该是
```js
hi,{{message}}</div>
```
所以`endIndex`的长度应该是上面代码的长度。当碰到”<“或者”{{“的时候，则我们需要改变`endIndex`的值，比如上面的代码，我们想要拿到的文本内容应该是`hi,`,所以当碰到”{{“时，改变`endIndex`然后通过`parseTextData`拿到文本内容，返回一个文本对象。
## 总结
`parse`的作用就是将`template`生成`ast`对象。则需要对`template`从左到右依次处理，处理过了则进行推进，碰到`element`标签还需要递归处理，并把添加到`element.children`上，最终返回一个`ast`抽象语法树。