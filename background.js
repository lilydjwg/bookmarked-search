const searchEngines = new Map()

function traverseTree(node) {
  if(node.url && node.url.includes('%s')) {
    searchEngines.set(node.id, {
      url: node.url,
      title: node.title,
    })
  }

  if(node.children) {
    for(let child of node.children) {
      traverseTree(child)
    }
  }
}

async function initSearchEngines() {
  const trees = await browser.bookmarks.getTree()
  traverseTree(trees[0])
  console.log('Found bookmarked search engines:', searchEngines)
  updateMenus()
}

function updateMenus() {
  browser.contextMenus.removeAll()

  for(let se of searchEngines.values()) {
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

browser.bookmarks.onCreated.addListener(function(id, node) {
  if(node.url && node.url.includes('%s')) {
    console.log('new bookmarked search engine', node)
    browser.contextMenus.create({
      id: node.url,
      title: node.title,
      contexts: ['selection']
    })
  }
})

browser.bookmarks.onChanged.addListener(function(id, change) {
  if(change.url && change.url.includes('%s')) {
    console.log('updated bookmarked search engine', change)
    searchEngines.set(id, change)
    updateMenus()
  } else if(change.url && searchEngines.has(id)) {
    console.log('no longer bookmarked search engine', change)
    searchEngines.delete(id)
    updateMenus()
  } else if(searchEngines.has(id) && change.title) {
    const se = searchEngines.get(id)
    se.title = change.title
    updateMenus()
  }
})

browser.bookmarks.onRemoved.addListener(function(id, info) {
  if(searchEngines.has(id)) {
    console.log('removed bookmarked search engine', info)
    searchEngines.delete(id)
    updateMenus()
  }
})

initSearchEngines()
