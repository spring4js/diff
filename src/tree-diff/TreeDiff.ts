import { GetChildren, GetNodeId, GetPropertyModifyDetail, IsNodePropertyChanged, ItemEqualComparator } from './types'
import { EditNode, EditType, ReserveEditNode } from './edit-node.types'
import {
  AddOperation,
  ModifyPropertyOperation,
  MoveOperation,
  Operation,
  OperationType,
  RemoveOperation,
  ReplaceOperatioin,
} from './operation.types'
import { copyTree, tranverseTreeParentFirst, tranverseTreeParentLast } from './utils'
import ArrayDiff from '../array-diff/dp'
import { EOpType } from '../array-diff/types'

/**
 * 计算tree的操作步骤
 * 操作 移动节点 删除节点 新增节点 修改节点属性
 */

export interface Options {
  oldTree: any
  newTree: any
  getChildren: GetChildren
  getNodeId: GetNodeId
  getPropertyModifyDetail: GetPropertyModifyDetail
  isObjectHasSameIdentity?: (left: any, right: any) => boolean
}

export default class TreeDiff {
  oldTree: any
  newTree: any
  getChildren: GetChildren
  getNodeId: GetNodeId
  isNodePropertyChanged: IsNodePropertyChanged
  getPropertyModifyDetail: GetPropertyModifyDetail
  itemEqualComparator: ItemEqualComparator

  nextEditNodeId: number

  oldTreeNodeIndex: { [id: string]: any }
  oldTreeParentIndex: { [id: string]: any }

  newTreeNodeIndex: { [id: string]: any }
  newTreeParentIndex: { [id: string]: any }

  // 编辑树
  editTreeRootNode: ReserveEditNode
  editTreeGenerated: boolean
  oldTreeNodeToEditTreeNodeMap: { [id: string]: EditNode }
  newTreeNodeToEditTreeNodeMap: { [id: string]: EditNode }

  addedNodeIds: string[] // 新树中新增的node
  removedNodeIds: string[] // 老树中删除的node
  movedNodeIds: string[] // 移动的节点

  // 操作步骤
  operations: Operation[]
  operationGenerated: boolean

  constructor(options: Options) {
    this.oldTree = options.oldTree
    this.newTree = options.newTree
    this.getChildren = (node) => {
      return options.getChildren(node) || []
    }
    this.getNodeId = (node) => {
      const id = options.getNodeId(node)
      if (!id) {
        throw new Error(`getNodeId 返回的node id 为空 ${JSON.stringify(node)}`)
      }
      return id
    }
    this.getPropertyModifyDetail = options.getPropertyModifyDetail
    this.isNodePropertyChanged = (oldNode: any, newNode: any) => {
      return !!options.getPropertyModifyDetail(oldNode, newNode)
    }
    this.itemEqualComparator = (left, right): boolean => {
      if (options.isObjectHasSameIdentity) {
        return options.isObjectHasSameIdentity(left, right)
      }
      return this.getNodeId(left) === this.getNodeId(right)
    }
  }

  getEditTree(): EditNode {
    if (!this.editTreeGenerated) {
      // 初始化
      this.init()
      // 生成编辑树
      this.generateEditTree()
      // 变化flag设置
      this.setChangeFlagForEditTree()
      // 构造所有删除节点
      this.patchAllRemovedNode()
      // 构造所有新增节点
      this.patchAllAddedNode()
      // 整合同一个节点的删除 新增操作为移动
      this.generateMoveEditStep()
      // 移动节点属性变化检测
      this.setMoveStepChangeFlag()

      this.editTreeGenerated = true
    }
    return this.editTreeRootNode
  }

  getOperations(): Operation[] {
    if (!this.operationGenerated) {
      const editTreeRootNode = this.getEditTree()
      // 结构调整操作记录
      tranverseTreeParentFirst(
        editTreeRootNode,
        (node: EditNode, parentNode: EditNode, index: number) => {
          if (node.editType === EditType.Add) {
            this.operations.push({
              operationType: OperationType.Add,
              nodeId: node.newTreeNodeId,
              parentNodeId: parentNode.newTreeNodeId,
              preNodeId: this.getExistNewTreeNodeIdUnderEditStep(parentNode, index),
            } as AddOperation)
          } else if (node.editType === EditType.Remove) {
            this.operations.push({
              operationType: OperationType.Remove,
              nodeId: node.oldTreeNodeId,
            } as RemoveOperation)
          } else if (node.editType === EditType.Move && node.moveTarget) {
            // 如果移动前后 父节点 前面兄弟节点一样，则忽略此移动步骤
            if (
              !this.isMovedNodeHasSameRelativePosition(
                this.oldTreeNodeIndex[node.oldTreeNodeId],
                this.newTreeNodeIndex[node.newTreeNodeId]
              )
            ) {
              this.operations.push({
                operationType: OperationType.Move,
                nodeId: node.newTreeNodeId,
                parentNodeId: parentNode.newTreeNodeId,
                preNodeId: this.getExistNewTreeNodeIdUnderEditStep(parentNode, index),
              } as MoveOperation)
            }
          } else if (node.editType === EditType.Replace) {
            this.operations.push({
              operationType: OperationType.Replace,
              sourceNodeId: node.oldTreeNodeId,
              targetNodeId: node.newTreeNodeId,
            } as ReplaceOperatioin)
          }
        },
        (node) => node.children
      )

      // 属性修改操作记录
      tranverseTreeParentFirst(
        editTreeRootNode,
        (node: EditNode, parentNode: EditNode, index: number) => {
          if (node.editType === EditType.Reserve && node.isPropertyChanged) {
            this.operations.push({
              operationType: OperationType.ModifyProperty,
              detail: this.getPropertyModifyDetail(
                this.oldTreeNodeIndex[node.oldTreeNodeId],
                this.newTreeNodeIndex[node.newTreeNodeId]
              ),
            } as ModifyPropertyOperation)
          } else if (node.editType === EditType.Move && node.moveTarget && node.isPropertyChanged) {
            this.operations.push({
              operationType: OperationType.ModifyProperty,
              detail: this.getPropertyModifyDetail(
                this.oldTreeNodeIndex[node.oldTreeNodeId],
                this.newTreeNodeIndex[node.newTreeNodeId]
              ),
            } as ModifyPropertyOperation)
          }
        },
        (node) => node.children
      )

      this.operationGenerated = true
    }
    return this.operations
  }

  private init() {
    const oldTreeRootNodeId = this.getNodeId(this.oldTree)
    const newTreeRootNodeId = this.getNodeId(this.newTree)
    if (oldTreeRootNodeId !== newTreeRootNodeId) {
      throw new Error(`新树老树的根节点id必须一样 new: ${oldTreeRootNodeId} old: ${newTreeRootNodeId}`)
    }
    this.nextEditNodeId = 1
    // 老树索引
    this.oldTreeNodeIndex = {}
    this.oldTreeParentIndex = {}
    this.buildOldTreeIndex()

    // 新树索引
    this.newTreeNodeIndex = {}
    this.newTreeParentIndex = {}
    this.buildNewTreeIndex()

    // 编辑树初始化
    this.editTreeRootNode = {
      id: this.nextEditNodeId++,
      editType: EditType.Reserve,
      reserved: true,
      isPropertyChanged: false,
      hasChildChanged: false,
      oldTreeNodeId: this.getNodeId(this.oldTree),
      newTreeNodeId: this.getNodeId(this.newTree),
      children: [],
    }
    // 新老树 和 编辑树 的映射关系初始化
    this.oldTreeNodeToEditTreeNodeMap = {}
    this.newTreeNodeToEditTreeNodeMap = {}
    this.oldTreeNodeToEditTreeNodeMap[oldTreeRootNodeId] = this.editTreeRootNode
    this.newTreeNodeToEditTreeNodeMap[newTreeRootNodeId] = this.editTreeRootNode

    this.addedNodeIds = []
    this.removedNodeIds = []
    this.movedNodeIds = []

    // 操作步骤
    this.operations = []
  }

  private buildOldTreeIndex() {
    tranverseTreeParentFirst(
      this.oldTree,
      (node: any, parentNode: any, index: number) => {
        const id = this.getNodeId(node)
        if (this.oldTreeParentIndex[id]) {
          throw new Error(`老树中id重名 ${id}`)
        }
        this.oldTreeNodeIndex[id] = node
        if (parentNode) {
          const parentId = this.getNodeId(parentNode)

          this.oldTreeParentIndex[id] = parentId
        }
      },
      this.getChildren
    )
  }

  private buildNewTreeIndex() {
    tranverseTreeParentFirst(
      this.newTree,
      (node: any, parentNode: any, index: number) => {
        const id = this.getNodeId(node)
        if (this.newTreeNodeIndex[id]) {
          throw new Error(
            `新树中id重名 id=${id} one=${JSON.stringify(node)} two=${JSON.stringify(this.newTreeNodeIndex[id])}`
          )
        }
        this.newTreeNodeIndex[id] = node
        if (parentNode) {
          const parentId = this.getNodeId(parentNode)
          this.newTreeParentIndex[id] = parentId
        }
      },
      this.getChildren
    )
  }

  // 对比每个节点的孩子节点
  private generateEditTree() {
    const stack: ReserveEditNode[] = [this.editTreeRootNode]
    while (stack.length > 0) {
      const editNode = stack.shift()
      const oldTreeNode = this.oldTreeNodeIndex[editNode.oldTreeNodeId]
      const newTreeNode = this.newTreeNodeIndex[editNode.newTreeNodeId]
      const oldChildren = this.getChildren(oldTreeNode)
      const newChildren = this.getChildren(newTreeNode)

      const diff = new ArrayDiff({
        oldArray: oldChildren,
        newArray: newChildren,
        itemEqualComparator: this.itemEqualComparator,
      })
      const editSteps = diff.getEditSteps()
      for (const editStep of editSteps) {
        const oldChild = oldChildren[editStep.oldPos]
        const newChild = newChildren[editStep.newPos]
        const childEditNode: EditNode = {
          id: this.nextEditNodeId++,
          editType: EditType.Reserve,
          isPropertyChanged: false,
          hasChildChanged: false,
          oldTreeNodeId: oldChild && this.getNodeId(oldChild),
          newTreeNodeId: newChild && this.getNodeId(newChild),
          children: [],
        }
        editNode.children.push(childEditNode)
        // 构建索引
        if (oldChild) {
          this.oldTreeNodeToEditTreeNodeMap[this.getNodeId(oldChild)] = childEditNode
        }
        if (newChild) {
          this.newTreeNodeToEditTreeNodeMap[this.getNodeId(newChild)] = childEditNode
        }

        if (editStep.opType === EOpType.Remove) {
          childEditNode.editType = EditType.Remove
          this.removedNodeIds.push(this.getNodeId(oldChild))
        } else if (editStep.opType === EOpType.Add) {
          childEditNode.editType = EditType.Add
          this.addedNodeIds.push(this.getNodeId(newChild))
        } else if (editStep.opType === EOpType.Reserve) {
          childEditNode.editType = EditType.Reserve
          stack.push(childEditNode as ReserveEditNode)
        } else if (editStep.opType === EOpType.Replace) {
          childEditNode.editType = EditType.Replace
          stack.push(childEditNode as ReserveEditNode)
        }
      }
    }
  }

  private setChangeFlagForEditTree() {
    tranverseTreeParentLast(
      this.editTreeRootNode,
      (editNode: EditNode, parentNode, index) => {
        if (editNode.editType !== EditType.Reserve) return
        editNode.isPropertyChanged = this.isNodePropertyChanged(
          this.oldTreeNodeIndex[editNode.oldTreeNodeId],
          this.newTreeNodeIndex[editNode.newTreeNodeId]
        )

        const children = editNode.children
        for (const child of children) {
          if (child.removed || child.added || child.isPropertyChanged || child.hasChildChanged) {
            editNode.hasChildChanged = true
            break
          }
        }
      },
      (node) => node.children || []
    )
  }

  private patchAllRemovedNode() {
    const patchedRemovedNodeIds: string[] = []
    for (const removedId of this.removedNodeIds) {
      patchedRemovedNodeIds.push(removedId)
      const oldNode = this.oldTreeNodeIndex[removedId]
      const editNode = this.oldTreeNodeToEditTreeNodeMap[removedId]
      copyTree(
        oldNode,
        editNode,
        (child, editParent: EditNode, index) => {
          const childId = this.getNodeId(child)
          const removedEditNode = {
            id: this.nextEditNodeId++,
            editType: EditType.Remove,
            removed: true,
            oldTreeNodeId: child && this.getNodeId(child),
            children: [],
          }
          this.oldTreeNodeToEditTreeNodeMap[childId] = removedEditNode
          editParent.children.push(removedEditNode)
          patchedRemovedNodeIds.push(childId)
          return removedEditNode
        },
        this.getChildren
      )
    }
    this.removedNodeIds = patchedRemovedNodeIds
  }

  private patchAllAddedNode() {
    const patchedAddedNodeIds: string[] = []

    for (const addedId of this.addedNodeIds) {
      patchedAddedNodeIds.push(addedId)
      const newNode = this.newTreeNodeIndex[addedId]
      const editNode = this.newTreeNodeToEditTreeNodeMap[addedId]
      copyTree(
        newNode,
        editNode,
        (child, editParent, index) => {
          const childId = this.getNodeId(child)
          const addedEditNode = {
            id: this.nextEditNodeId++,
            editType: EditType.Add,
            added: true,
            newTreeNodeId: child && this.getNodeId(child),
            children: [],
          }
          this.newTreeNodeToEditTreeNodeMap[childId] = addedEditNode
          patchedAddedNodeIds.push(childId)
          editParent.children.push(addedEditNode)
          return addedEditNode
        },
        this.getChildren
      )
    }
    this.addedNodeIds = patchedAddedNodeIds
  }

  private generateMoveEditStep() {
    // 对每个删除节点，检查是否新增过。如果有新增则认为是移动
    for (const removedId of this.removedNodeIds) {
      const hasAdded = this.addedNodeIds.indexOf(removedId) > -1
      if (!hasAdded) continue
      // 移动
      this.movedNodeIds.push(removedId)
      // 老树删除节点 改成 移动源
      const sourceEditNode = this.oldTreeNodeToEditTreeNodeMap[removedId]
      sourceEditNode.editType = EditType.Move
      sourceEditNode.moveSource = true
      sourceEditNode.isPropertyChanged = false
      sourceEditNode.oldTreeNodeId = removedId
      sourceEditNode.newTreeNodeId = removedId
      // 新树新增节点 改成 移动目标节点
      const targetEditNode = this.newTreeNodeToEditTreeNodeMap[removedId]
      targetEditNode.editType = EditType.Move
      targetEditNode.moveTarget = true
      targetEditNode.isPropertyChanged = false
      targetEditNode.oldTreeNodeId = removedId
      targetEditNode.newTreeNodeId = removedId
    }
  }

  private setMoveStepChangeFlag() {
    for (const moveId of this.movedNodeIds) {
      const oldNode = this.oldTreeNodeIndex[moveId]
      const newNode = this.newTreeNodeIndex[moveId]
      const isPropertyChanged = this.isNodePropertyChanged(oldNode, newNode)
      if (isPropertyChanged) {
        this.oldTreeNodeToEditTreeNodeMap[moveId].isPropertyChanged = true
        this.newTreeNodeToEditTreeNodeMap[moveId].isPropertyChanged = true
      }
    }
  }

  // 获取index之前 在newTree中存在的 node id
  private getExistNewTreeNodeIdUnderEditStep(editNode: EditNode, index: number): string {
    let existNodeId: string
    let currentIdx = index - 1
    const children = editNode.children
    while (currentIdx > -1) {
      const childEditNode: EditNode = children[currentIdx]
      if (childEditNode.editType === EditType.Add) {
        existNodeId = childEditNode.newTreeNodeId
        break
      }
      if (childEditNode.editType === EditType.Reserve) {
        existNodeId = childEditNode.newTreeNodeId
        break
      }
      if (childEditNode.editType === EditType.Move && childEditNode.moveTarget) {
        existNodeId = childEditNode.newTreeNodeId
        break
      }
      if (childEditNode.editType === EditType.Replace) {
        existNodeId = childEditNode.newTreeNodeId
        break
      }
      --currentIdx
    }
    return existNodeId
  }

  // 判断移动的节点，是否是一样的节点， 如果前面的兄弟节点和父节点是一样的，则认为他们相对位置一样
  private isMovedNodeHasSameRelativePosition(oldTreeNode: any, newTreeNode: any): boolean {
    // 对比父节点
    const oldParantId = this.oldTreeParentIndex[this.getNodeId(oldTreeNode)]
    const newParentId = this.newTreeParentIndex[this.getNodeId(newTreeNode)]
    if (oldParantId !== newParentId) return false
    // 对比兄弟的节点

    const oldPreSlibingId = this.getPreSlibingId(this.getChildren(this.oldTreeNodeIndex[oldParantId]), oldTreeNode)
    const newPreSlibingId = this.getPreSlibingId(this.getChildren(this.newTreeNodeIndex[newParentId]), newTreeNode)
    if (oldPreSlibingId !== newPreSlibingId) return false
    return true
  }
  private getPreSlibingId(children: any[], child: any): string {
    const childId = this.getNodeId(child)
    for (let i = 0; i < children.length; i++) {
      const currentId = this.getNodeId(children[i])
      if (currentId === childId) {
        if (i === 0) {
          return null
        } else {
          return this.getNodeId(children[i - 1])
        }
      }
    }
    throw new Error('查找兄弟节点异常')
  }
}
