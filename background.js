function traverseTree(node, results) {
  if(node.url && node.url.includes('%s')) {
    results.push({
      url: node.url,
      title: node.title,
    })
  }

  if(node.children) {
    for(let child of node.children) {
      traverseTree(child, results)
    }
  }
}

async function init_search_engines() {
  const trees = await browser.bookmarks.getTree()
  const searchEngines = []
  traverseTree(trees[0], searchEngines)
  console.log('Found bookmarked search engines:', searchEngines)

  browser.contextMenus.removeAll()

  for(let se of searchEngines) {
    browser.contextMenus.create({
      id: se.url,
      title: se.title,
      contexts: ['selection']
    })
  }
}

browser.contextMenus.onClicked.addListener(function(info, tab) {
  const searchString = info.selectionText
  const urlPattern = info.menuItemId
  const targetUrl = urlPattern.replace(
    '%s', encodeURIComponent(searchString))
  browser.tabs.create({
    active: false,
    openerTabId: tab.id,
    url: targetUrl
  }).then(null, (e) => {
    console.error(e)
  })
})

init_search_engines()
