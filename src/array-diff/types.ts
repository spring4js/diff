// 数组元素相等比较
export type ItemEqualComparator = (oldItem: any, newItem: any) => boolean
// 构造选项
export interface Options {
  newArray: any[] | string
  oldArray: any[] | string
  itemEqualComparator?: ItemEqualComparator
}
export enum EOpType {
  Remove = 'remove', // [i,j] 由 [i-1，j] 删除一个元素     已知i-1,j的编辑距离， i,j 删除一个元素得到 i-1,j
  Add = 'add', // [i,j] 由 [i，j-1] 新增一个元素        已知i,j-1的编辑距离， i,j-1 新增一个元素得到 i,j
  Reserve = 'reserve', // [i,j] 由 [i-1，j-1] 得到
  Replace = 'replace', // [i,j] 由 [i-1，j-1] 得到
}
export interface EditStep {
  opType: EOpType
  newPos?: number
  oldPos?: number
  oldElement?: any
  newElement?: any
}

export interface AddStep extends EditStep {
  added: true
  newPos: number
  newElement: any
}
export interface RemoveStep extends EditStep {
  removed: true
  oldPos: number
  oldElement: any
}
export interface ReserveStep extends EditStep {
  reserved: true
  newPos: number
  oldPos: number
  oldElement: any
  newElement: any
}

export interface ArrayDiff {
  getEditSteps(): EditStep[]
}
