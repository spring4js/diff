import OldTree from './data/old-tree'
import NewTree from './data/new-tree'

import TreeDiff from '../../src/diff/tree-diff/TreeDiff'
test('tree-diff', async () => {
  const diff = new TreeDiff({
    oldTree: OldTree,
    newTree: NewTree,
    getChildren: (node) => node.children,
    getNodeId: (node) => node.name,
    getPropertyModifyDetail: (oldNode: any, newNode: any) => undefined,
  })
  const rootStep = diff.getEditTree()
  console.log(JSON.stringify(rootStep))
})
