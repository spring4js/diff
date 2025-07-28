import { GetChildren, TraverseCallback, CopyTreeCallback } from './types'
/**
 * 深度优先遍历，父节点优先
 */
export function tranverseTreeParentFirst(
  treeNode: any,
  callback: TraverseCallback,
  getChildren: GetChildren,
  parentNode: any = null,
  currentIndex: number = -1
) {
  getChildren = getChildren || ((node) => node.children || [])
  callback(treeNode, parentNode, currentIndex)
  const children = getChildren(treeNode) || []
  for (let index = 0; index < children.length; index++) {
    const subNode = children[index]
    tranverseTreeParentFirst(subNode, callback, getChildren, treeNode, index)
  }
}

/**
 * 深度优先遍历，子节点优先
 */
export function tranverseTreeParentLast(
  treeNode: any,
  callback: TraverseCallback,
  getChildren: GetChildren,
  parentNode: any = null,
  currentIndex: number = -1
) {
  const children = getChildren(treeNode) || []
  for (let index = 0; index < children.length; index++) {
    const subNode = children[index]
    tranverseTreeParentLast(subNode, callback, getChildren, treeNode, index)
  }
  callback(treeNode, parentNode, currentIndex)
}

/**
 * 复制树 将originTree的子节点复制到newTreeRootNode中
 * callback执行节点复制操作，并返回新节点
 */

export function copyTree(originTree: any, newTreeRootNode: any, callback: CopyTreeCallback, getChildren: GetChildren) {
  getChildren = getChildren || ((node) => node.children || [])
  const children = getChildren(originTree)
  for (let index = 0; index < children.length; index++) {
    const subNode = children[index]
    const newNode = callback(subNode, newTreeRootNode, index)
    copyTree(subNode, newNode, callback, getChildren)
  }
}
