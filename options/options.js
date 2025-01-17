// options.js
let categories = [];

/**
 * 初始化入口
 */
function init() {
  chrome.storage.local.get(["categories"], (result) => {
    categories = result.categories || [];
    renderCategories();
  });

  // 监听“添加分类”按钮
  document.getElementById("btnAddCategory").addEventListener("click", () => {
    const name = document.getElementById("categoryName").value.trim();
    const iconSvg = document.getElementById("categoryIcon").value.trim();

    if (!name) {
      alert("分类名称不能为空！");
      return;
    }
    addCategory(name, iconSvg);
  });
}

/**
 * 添加分类
 */
function addCategory(name, icon) {
  const newCategory = {
    id: crypto.randomUUID(),
    name,
    icon,
    bookmarks: [],
  };

  categories.push(newCategory);
  chrome.storage.local.set({ categories }, () => {
    document.getElementById("categoryName").value = "";
    document.getElementById("categoryIcon").value = "";
    renderCategories();
  });
}

/**
 * 真正执行删除分类
 */
function removeCategory(catId) {
  categories = categories.filter((cat) => cat.id !== catId);
  chrome.storage.local.set({ categories }, () => {
    renderCategories();
  });
}

/**
 * 删除书签
 */
function removeBookmark(catId, bmId) {
  categories = categories.map((cat) => {
    if (cat.id === catId) {
      cat.bookmarks = (cat.bookmarks || []).filter((bm) => bm.id !== bmId);
    }
    return cat;
  });
  chrome.storage.local.set({ categories }, () => {
    renderCategories();
  });
}

/**
 * 处理分类的删除与倒计时逻辑
 * @param {string} catId 分类 ID
 * @param {HTMLButtonElement} button 删除按钮元素
 */
function handleRemoveCategoryWithCountdown(catId, button) {
  // 如果当前处于“取消删除”状态，则说明用户点击的是“取消删除”
  if (button.classList.contains("pending-removal")) {
    cancelRemoveCategory(button);
    return;
  }

  // 否则，用户第一次点击“删除分类”
  // 1. 切换按钮文字和状态
  button.textContent = "取消删除";
  button.classList.add("pending-removal");

  // 2. 在按钮右侧插入一个用于显示环形动画+数字倒计时的容器
  const spinnerContainer = document.createElement("div");
  spinnerContainer.className = "countdown-spinner-container";
  spinnerContainer.innerHTML = `
    <svg class="countdown-spinner" width="24" height="24" viewBox="0 0 24 24">
      <!-- 环形进度条 -->
      <circle class="progress-ring" cx="12" cy="12" r="10" />
      <!-- 中间数字倒计时 -->
      <text class="countdown-text" x="50%" y="50%"
            dominant-baseline="middle" text-anchor="middle">5</text>
    </svg>
  `;
  button.insertAdjacentElement("afterend", spinnerContainer);

  // 圆弧相关，准备动画
  const circle = spinnerContainer.querySelector(".progress-ring");
  const circumference = 2 * Math.PI * circle.r.baseVal.value;
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = circumference;

  // 数字文本
  const textEl = spinnerContainer.querySelector(".countdown-text");

  // 3. 倒计时 + 动画控制
  let remainingTime = 5; // 5秒倒计时
  textEl.textContent = remainingTime; // 初始显示5

  // (1) 每秒更新文本
  const intervalId = setInterval(() => {
    remainingTime--;
    textEl.textContent = remainingTime;
    if (remainingTime <= 0) {
      clearInterval(intervalId);
    }
  }, 1000);

  // (2) 5 秒后真正执行删除
  const timeoutId = setTimeout(() => {
    removeCategory(catId);
  }, 5000);

  // (3) 启用环形动画，strokeDashoffset 从 circumference 过渡到 0
  window.getComputedStyle(circle).strokeDashoffset; // 强制重绘
  circle.style.transition = "stroke-dashoffset 5s linear";
  circle.style.strokeDashoffset = 0;

  // 将计时器的引用存到按钮的 dataset 中
  button.dataset.countdownTimer = timeoutId;
  button.dataset.countdownInterval = intervalId;
}

/**
 * 撤销删除分类
 * @param {HTMLButtonElement} button “取消删除”按钮
 */
function cancelRemoveCategory(button) {
  // 清除倒计时
  const countdownTimer = button.dataset.countdownTimer;
  const countdownInterval = button.dataset.countdownInterval;

  if (countdownTimer) clearTimeout(countdownTimer);
  if (countdownInterval) clearInterval(countdownInterval);

  // 还原按钮文字和样式
  button.textContent = "删除分类";
  button.classList.remove("pending-removal");
  delete button.dataset.countdownTimer;
  delete button.dataset.countdownInterval;

  // 移除环形动画
  const spinnerContainer = button.parentNode.querySelector(".countdown-spinner-container");
  if (spinnerContainer) {
    spinnerContainer.remove();
  }
}

/**
 * 渲染分类到页面
 */
function renderCategories() {
  const container = document.getElementById("categoriesList");
  container.innerHTML = "";

  categories.forEach((cat) => {
    // 创建分类卡片
    const catCard = document.createElement("div");
    catCard.className = "category-card";

    // 卡片头部
    const headerDiv = document.createElement("div");
    headerDiv.className = "category-header";

    // 图标 + 名称
    const infoDiv = document.createElement("div");
    infoDiv.className = "category-info";
    let svgHtml = cat.icon ? cat.icon : "";
    infoDiv.innerHTML = `${svgHtml}<span class="category-name">${cat.name}</span>`;

    // 删除分类按钮
    const removeCatBtn = document.createElement("button");
    removeCatBtn.className = "btn-remove-category";
    removeCatBtn.textContent = "删除分类";
    removeCatBtn.addEventListener("click", () => {
      handleRemoveCategoryWithCountdown(cat.id, removeCatBtn);
    });

    headerDiv.appendChild(infoDiv);
    headerDiv.appendChild(removeCatBtn);

    // 书签列表
    const bookmarkList = document.createElement("div");
    bookmarkList.className = "bookmark-list";

    (cat.bookmarks || []).forEach((bm) => {
      const bmItem = document.createElement("div");
      bmItem.className = "bookmark-item";
      bmItem.innerHTML = `
        <a class="bookmark-title" href="${bm.url}" target="_blank">
          ${bm.title || bm.url}
        </a>
        <button class="btn-remove-bookmark">删除</button>
      `;
      bmItem.querySelector(".btn-remove-bookmark").addEventListener("click", () => {
        removeBookmark(cat.id, bm.id);
      });
      bookmarkList.appendChild(bmItem);
    });

    catCard.appendChild(headerDiv);
    catCard.appendChild(bookmarkList);
    container.appendChild(catCard);
  });
}

// 启动
init();
