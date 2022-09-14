class Node {
  value
  next
  constructor(value) {
    this.value = value
  }
}

// 队列 链表
export default class Queue {
  #head // 头节点
  #tail // 尾结点
  #size = 0 // 队列长度
  constructor() {}
  // 插入队列
  enqueue(value) {
    const node = new Node(value)

    // 如果没有头节点 说明此时队列是空
    if (this.#head) {
      // 如果头节点存在 则添加的时候 尾结点则指向node 并且尾结点向后移动一位
      this.#tail.next = node
      this.#tail = node
    } else {
      // 则 头节点和尾结点是一样的
      this.#head = node
      this.#tail = node
    }

    this.#size++
  }
  // 删除头节点
  dequeue() {
    // current存储当前头节点的值 因为最后要返回
    const current = this.#head

    if (!current) {
      return
    }

    this.#head = this.#head.next
    this.#size--

    return current.value
  }

  clear() {
    this.#head = undefined
    this.#tail = undefined
    this.#size = 0
  }

  get size() {
    return this.#size
  }

  *[Symbol.iterator]() {
    let current = this.#head
    while (current) {
      yield current.value
      current = current.next
    }
  }
}
