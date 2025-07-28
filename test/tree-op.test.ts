import OldTree from './data/old-tree'
import NewTree from './data/new-tree'

import TreeDiff from '../../src/diff/tree-diff/TreeDiff'
test('tree-diff', async () => {
  const diff = new TreeDiff({
    oldTree: OldTree,
    newTree: NewTree,
    getChildren: (node) => node.children,
    getNodeId: (node) => node.name,
    getPropertyModifyDetail: (oldNode, newNode) => undefined,
  })
  const ops = diff.getOperations()
  console.log(JSON.stringify(ops))
})
