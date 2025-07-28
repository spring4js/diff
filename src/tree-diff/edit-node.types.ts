export enum EditType {
  Reserve = 'reserve',
  Remove = 'remove',
  Add = 'add',
  Replace = 'replace',
  Move = 'move',
}
// edit node
export interface EditNode {
  id: number
  editType: EditType
  moveSource?: boolean
  moveTarget?: boolean
  isPropertyChanged?: boolean // 属性是否被修改
  hasChildChanged?: boolean // 子节点是否有改动
  oldTreeNodeId?: string // old树中的节点
  newTreeNodeId?: string // new 树中的节点
  children: any[]
}

export interface ReserveEditNode extends EditNode {
  reserved: true
  isPropertyChanged: boolean
  hasChildChanged: boolean
  oldTreeNodeId: any
  newTreeNodeId: any
  children: any[]
}

export interface RemoveEditNode extends EditNode {
  removed: true
  oldTreeNodeId: any
  children: any[]
}

export interface AddEditNode extends EditNode {
  added: true
  newTreeNodeId: any
  children: any[]
}

export interface MoveSourceEditNode extends EditNode {
  moveSource: true
  isPropertyChanged: boolean
  oldTreeNodeId: any
  newTreeNodeId: any
  children: any[]
}

export interface MoveTargetEditNode extends EditNode {
  moveTarget: true
  isPropertyChanged: boolean
  oldTreeNodeId: any
  newTreeNodeId: any
  children: any[]
}

export interface ReplaceSourceEditNode extends EditNode {
  replaceSource: true
  oldTreeNodeId: any
  newTreeNodeId: any
  children: any[]
}

export interface ReplaceTargetEditNode extends EditNode {
  replaceTarget: true
  oldTreeNodeId: any
  newTreeNodeId: any
  children: any[]
}
