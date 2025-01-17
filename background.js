// background.js

let categories = [];

// 1. 从 local 存储中读取数据并初始化
chrome.storage.local.get(["categories"], (result) => {
  categories = result.categories || [];
  createContextMenu(categories);
});

// 2. 监听存储变化，动态更新右键菜单
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.categories) {
    categories = changes.categories.newValue || [];
    chrome.contextMenus.removeAll(() => {
      createContextMenu(categories);
    });
  }
});

/**
 * 动态创建右键菜单
 */
function createContextMenu(categories) {
  // 根菜单
  chrome.contextMenus.create({
    id: "saveToCategory",
    title: "收藏到...",
    contexts: ["page"]
  });

  // 子菜单
  categories.forEach((cat) => {
    chrome.contextMenus.create({
      id: `cat-${cat.id}`,
      parentId: "saveToCategory",
      title: cat.name,
      contexts: ["page"]
    });
  });
}

/**
 * 监听右键菜单点击，添加书签
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // 判断点击的子菜单是哪一个分类
  const prefix = "cat-";
  if (info.menuItemId.startsWith(prefix)) {
    const catId = info.menuItemId.slice(prefix.length);
    const bookmarkTitle = tab.title;
    const bookmarkUrl = tab.url;
    addBookmark(catId, bookmarkTitle, bookmarkUrl);
  }
});

function addBookmark(categoryId, title, url) {
  const newBookmark = {
    id: crypto.randomUUID(),
    title,
    url,
    dateAdded: Date.now()
  };

  // 更新内存
  categories = categories.map((cat) => {
    if (cat.id === categoryId) {
      if (!Array.isArray(cat.bookmarks)) {
        cat.bookmarks = [];
      }
      cat.bookmarks.push(newBookmark);
    }
    return cat;
  });

  // 同步到 local
  chrome.storage.local.set({ categories });
}
