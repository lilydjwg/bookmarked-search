const searchEngines = new Map()
const RootMenuId = 'bookmarked-search@lilydjwg.me'
const EmptyMenuId = 'EMPTY'
let LOGGING = false

function log(...args) {
  if(LOGGING) {
    console.log(...args)
  }
}

function error(...args) {
  if(LOGGING) {
    console.error(...args)
  }
}

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
  log('Found bookmarked search engines:', searchEngines)
  updateMenus()
}

function updateMenus() {
  browser.contextMenus.removeAll()
  browser.contextMenus.create({
    id: RootMenuId,
    title: browser.i18n.getMessage('contextMenuItemRoot'),
    contexts: ['selection'],
  })

  if(searchEngines.size == 0) {
    browser.contextMenus.create({
      id: EmptyMenuId,
      title: browser.i18n.getMessage('contextMenuItemEmpty'),
      contexts: ['selection'],
      parentId: RootMenuId,
      enabled: false,
    })
  } else {
    for(let se of searchEngines.values()) {
      browser.contextMenus.create({
        id: se.url,
        title: se.title,
        contexts: ['selection'],
        parentId: RootMenuId,
      })
    }
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
    error(e)
  })
})

browser.bookmarks.onCreated.addListener(function(id, node) {
  if(node.url && node.url.includes('%s')) {
    log('new bookmarked search engine', node)
    browser.contextMenus.remove(EmptyMenuId).catch(e => {})
    browser.contextMenus.create({
      id: node.url,
      title: node.title,
      contexts: ['selection'],
      parentId: RootMenuId,
    })
  }
})

browser.bookmarks.onChanged.addListener(async function(id, change) {
  if(change.url && change.url.includes('%s')) {
    log('updated url of bookmarked search engine', change)
    const se = searchEngines.get(id) || {}
    se.url = change.url
    if(change.title) {
      se.title = change.title
    } else if(!se.title) {
      const bookmarks = await browser.bookmarks.get(id)
      se.title = bookmarks[0].title
    }
    searchEngines.set(id, se)
    updateMenus()
  } else if(change.url && searchEngines.has(id)) {
    log('no longer bookmarked search engine', change)
    searchEngines.delete(id)
    updateMenus()
  } else if(searchEngines.has(id) && change.title) {
    log('updated title of bookmarked search engine', change)
    const se = searchEngines.get(id)
    se.title = change.title
    updateMenus()
  }
})

browser.bookmarks.onRemoved.addListener(function(id, info) {
  if(searchEngines.has(id)) {
    log('removed bookmarked search engine', info)
    searchEngines.delete(id)
    updateMenus()
  }
})

initSearchEngines()
