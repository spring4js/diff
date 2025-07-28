export type GetChildren = (node: any) => any[]

/**
 * 获取node节点 全局唯一id
 */
export type GetNodeId = (node: any) => string
export type IsNodePropertyChanged = (oldNode: any, newNode: any) => boolean
// 获取节点属性变化详情，格式由外部定义。 如果没有则返回undefined
export type GetPropertyModifyDetail = (oldNode: any, newNode: any) => any
export type ItemEqualComparator = (left: any, right: any) => boolean
export type TraverseCallback = (node: any, parentNode: any, index: number) => void

export type CopyTreeCallback = (sourceSubNode: any, targetTreeParentNode: any, index: number) => any
