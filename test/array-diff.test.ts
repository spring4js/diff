import ArrayDiff from '../../src/diff/array-diff/dp'
import { EditStep } from '../../src/diff/array-diff/types'

test('array-diff', async () => {
  const oldArray = 'afcde'
  const newArray = 'caabcd'
  const arrayDiff = new ArrayDiff({
    newArray,
    oldArray,
  })
  const editSteps: EditStep[] = arrayDiff.getEditSteps()
  expect(editSteps).toMatchObject([
    {
      opType: 'add',
      newPos: 0,
      newElement: 'c',
    },
    {
      opType: 'reserve',
      newPos: 1,
      oldPos: 0,
      oldElement: 'a',
      newElement: 'a',
    },
    {
      opType: 'add',
      newPos: 2,
      newElement: 'a',
    },
    {
      opType: 'replace',
      newPos: 3,
      oldPos: 1,
      oldElement: 'f',
      newElement: 'b',
    },
    {
      opType: 'reserve',
      newPos: 4,
      oldPos: 2,
      oldElement: 'c',
      newElement: 'c',
    },
    {
      opType: 'reserve',
      newPos: 5,
      oldPos: 3,
      oldElement: 'd',
      newElement: 'd',
    },
    {
      opType: 'remove',
      oldPos: 4,
      oldElement: 'e',
    },
  ])
})
