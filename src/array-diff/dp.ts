// 动态规划算法实现的最短编辑距离
import { Options, ArrayDiff, EditStep, ItemEqualComparator, EOpType } from './types'

export default class DynamicProgramDiff implements ArrayDiff {
  oldArray: any[] | string
  newArray: any[] | string
  itemEqualComparator?: ItemEqualComparator

  editDistanceMap: { [index: string]: number } // index 格式 i-j i/j为序号 基数为1
  opTypeMap: { [index: string]: EOpType } // index 格式 i-j i/j为序号 基数为1

  constructor(options: Options) {
    this.newArray = options.newArray
    this.oldArray = options.oldArray
    this.itemEqualComparator = options.itemEqualComparator
  }

  getEditSteps(): EditStep[] {
    this.editDistanceMap = {}
    this.opTypeMap = {}
    this.calcMinEditDistance()
    return this.genMinEditStep()
  }

  // 计算最短距离
  private calcMinEditDistance() {
    const oldLength = this.oldArray.length
    const newLength = this.newArray.length
    this.editDistanceMap[`0-0`] = 0
    for (let i = 1; i <= oldLength; i++) {
      this.editDistanceMap[`${i}-0`] = i
      this.opTypeMap[`${i}-0`] = EOpType.Remove
    }
    for (let j = 1; j <= newLength; j++) {
      this.editDistanceMap[`0-${j}`] = j
      this.opTypeMap[`0-${j}`] = EOpType.Add
    }

    for (let i = 1; i <= oldLength; i++) {
      for (let j = 1; j <= newLength; j++) {
        const removeDistance = this.editDistanceMap[`${i - 1}-${j}`] + 1 // 删除链路距离
        const addDistance = this.editDistanceMap[`${i}-${j - 1}`] + 1 // 新增链路距离
        const replaceDistance = this.editDistanceMap[`${i - 1}-${j - 1}`] + 1
        // 保留距离
        let opType: EOpType
        let reserveDistance = Number.MAX_VALUE
        if (this.equals(this.oldArray[i - 1], this.newArray[j - 1])) {
          reserveDistance = this.editDistanceMap[`${i - 1}-${j - 1}`]
        }

        const min = Math.min(removeDistance, addDistance, replaceDistance, reserveDistance)
        if (min === addDistance) {
          opType = EOpType.Add
        } else if (min === removeDistance) {
          opType = EOpType.Remove
        } else if (min === reserveDistance) {
          opType = EOpType.Reserve
        } else if (min === replaceDistance) {
          opType = EOpType.Replace
        } else {
          throw new Error('最小距离计算错误')
        }
        this.editDistanceMap[`${i}-${j}`] = min
        this.opTypeMap[`${i}-${j}`] = opType
      }
    }
  }
  // 构造编辑路径
  private genMinEditStep(): EditStep[] {
    let i = this.oldArray.length
    let j = this.newArray.length
    const editSteps: EditStep[] = []
    while (i > 0 || j > 0) {
      const op = this.opTypeMap[`${i}-${j}`]
      if (op === EOpType.Add) {
        // 新增第j个元素
        editSteps.push({
          opType: op,
          newPos: j - 1,
          newElement: this.newArray[j - 1],
        })
        j--
      } else if (op === EOpType.Remove) {
        // 删除第i个元素
        editSteps.push({
          opType: op,
          oldPos: i - 1,
          oldElement: this.oldArray[i - 1],
        })
        i--
      } else if (op === EOpType.Reserve) {
        // 保留
        editSteps.push({
          opType: op,
          newPos: j - 1,
          oldPos: i - 1,
          oldElement: this.oldArray[i - 1],
          newElement: this.newArray[j - 1],
        })
        i--
        j--
      } else if (op === EOpType.Replace) {
        editSteps.push({
          opType: op,
          newPos: j - 1,
          oldPos: i - 1,
          oldElement: this.oldArray[i - 1],
          newElement: this.newArray[j - 1],
        })
        i--
        j--
      } else {
        throw new Error('编辑步骤计算错误')
      }
    }
    return editSteps.reverse()
  }

  private equals(left: any, right: any) {
    if (this.itemEqualComparator) {
      return this.itemEqualComparator(left, right)
    } else {
      return left === right
    }
  }
}
