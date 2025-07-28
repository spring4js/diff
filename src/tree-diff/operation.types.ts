export enum OperationType {
  Remove = 'remove',
  Add = 'add',
  Replace = 'replace',
  Move = 'move',
  ModifyProperty = 'modifyProperty',
}
export interface Operation {
  operationType: OperationType
}

export interface AddOperation extends Operation {
  operationType: OperationType.Add
  nodeId: string
  parentNodeId: string
  preNodeId: string
}

export interface RemoveOperation extends Operation {
  operationType: OperationType.Remove
  nodeId: string
}

export interface MoveOperation extends Operation {
  operationType: OperationType.Move
  nodeId: string
  parentNodeId: string
  preNodeId: string
}

export interface ReplaceOperatioin extends Operation {
  operationType: OperationType.Replace
  sourceNodeId: string
  targetNodeId: string
}

export interface ModifyPropertyOperation extends Operation {
  operationType: OperationType.ModifyProperty
  detail: any
}
