import { isFirebaseConfigured } from "./firebase.js";
import { listItems, COLLECTIONS } from "./content.js";

const RESEARCH_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>`;
const ARROW = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg>`;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
  } catch {
    return "";
  }
  return "";
}

function showEmpty(container, message) {
  container.innerHTML = `<p class="empty-state">${message}</p>`;
}

function bindModal(items) {
  const overlay = document.getElementById("modalOverlay");
  if (!overlay) return;

  const modalImg = document.getElementById("modalImg");
  const modalTag = document.getElementById("modalTag");
  const modalTitle = document.getElementById("modalTitle");
  const modalContent = document.getElementById("modalContent");
  const closeBtn = document.getElementById("modalClose");

  function open(item) {
    modalImg.src = item.imageUrl || "";
    modalImg.alt = item.title || "";
    modalTag.textContent = item.tag || "";
    modalTitle.textContent = item.title || "";
    modalContent.innerHTML = item.body || "";
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function close() {
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  document.querySelectorAll(".grid-tile").forEach((tile) => {
    tile.addEventListener("click", () => {
      const item = items[Number(tile.dataset.index)];
      if (item) open(item);
    });
  });

  closeBtn?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
}

function renderGallery(grid, items) {
  if (!items.length) {
    showEmpty(grid, "ماكو محتوى بهالقسم حالياً.");
    return;
  }

  grid.innerHTML = items.map((item, index) => `
    <button type="button" class="grid-tile" data-index="${index}">
      ${item.tag ? `<span class="grid-tile-tag">${escapeHtml(item.tag)}</span>` : ""}
      ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}">` : `<div class="grid-tile-placeholder"></div>`}
      <span class="grid-tile-overlay">${escapeHtml(item.title)}</span>
    </button>
  `).join("");

  bindModal(items);
}

function renderResearch(list, items) {
  if (!items.length) {
    showEmpty(list, "ماكو مساهمات أكاديمية معروضة حالياً.");
    return;
  }

  list.innerHTML = items.map((item) => {
    const href = safeUrl(item.url || item.fileUrl || "");
    const meta = [item.venue, item.date].filter(Boolean).join(" · ");
    const link = href
      ? `<a class="research-link" href="${escapeHtml(href)}" target="_blank" rel="noopener">عرض ${ARROW}</a>`
      : "";
    return `
      <div class="research-item">
        <div class="research-icon">${RESEARCH_ICON}</div>
        <div class="research-info">
          <h3>${escapeHtml(item.title) || "بدون عنوان"}</h3>
          ${meta ? `<p class="research-meta">${escapeHtml(meta)}</p>` : ""}
        </div>
        ${link}
      </div>
    `;
  }).join("");
}

async function boot() {
  const grid = document.getElementById("contentGrid");
  const researchList = document.getElementById("researchList");

  if (!grid && !researchList) return;

  if (!isFirebaseConfigured()) {
    const msg = "الموقع لسه مو مربوط بفايربيس. أضف إعدادات المشروع في js/firebase-config.js";
    if (grid) showEmpty(grid, msg);
    if (researchList) showEmpty(researchList, msg);
    return;
  }

  try {
    if (grid) {
      const name = grid.dataset.collection === "cases" ? COLLECTIONS.cases : COLLECTIONS.posts;
      const items = await listItems(name);
      renderGallery(grid, items);
    }
    if (researchList) {
      const items = await listItems(COLLECTIONS.research);
      renderResearch(researchList, items);
    }
  } catch (err) {
    console.error(err);
    const msg = "ما قدرنا نحمّل المحتوى. تأكد من قواعد فايربيس واتصال الإنترنت.";
    if (grid) showEmpty(grid, msg);
    if (researchList) showEmpty(researchList, msg);
  }
}

boot();
