import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { isFirebaseConfigured, auth } from "../js/firebase.js";
import {
  COLLECTIONS,
  listItems,
  createItem,
  updateItem,
  removeItem,
  uploadFile
} from "../js/content.js";
import { SEED_POSTS, SEED_CASES } from "../js/seed-content.js";

const setupView = document.getElementById("setupView");
const loginView = document.getElementById("loginView");
const appView = document.getElementById("appView");
const listEl = document.getElementById("list");
const statusMsg = document.getElementById("statusMsg");
const sectionTitle = document.getElementById("sectionTitle");
const seedBtn = document.getElementById("seedBtn");
const overlay = document.getElementById("editorOverlay");
const editorForm = document.getElementById("editorForm");
const editorTitle = document.getElementById("editorTitle");
const galleryFields = document.getElementById("galleryFields");
const researchFields = document.getElementById("researchFields");
const imagePreview = document.getElementById("imagePreview");
const fileHint = document.getElementById("fileHint");
const editorError = document.getElementById("editorError");
const loginError = document.getElementById("loginError");

const TITLES = {
  posts: "المنشورات",
  cases: "حالات العيادة",
  research: "النشاط الأكاديمي"
};

let currentTab = "posts";
let items = [];
let editingId = null;
let existingImageUrl = "";
let existingFileUrl = "";

function show(el) {
  el.classList.remove("hidden");
}

function hide(el) {
  el.classList.add("hidden");
}

function setStatus(text) {
  if (!text) {
    hide(statusMsg);
    statusMsg.textContent = "";
    return;
  }
  statusMsg.textContent = text;
  show(statusMsg);
}

function setError(el, text) {
  if (!text) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = text;
}

async function refresh() {
  setStatus("جاري التحميل...");
  items = await listItems(COLLECTIONS[currentTab]);
  setStatus(items.length ? "" : "ماكو عناصر بهالقسم بعد.");
  renderList();
  const canSeed = currentTab !== "research" && items.length === 0;
  seedBtn.classList.toggle("hidden", !canSeed);
}

function renderList() {
  if (!items.length) {
    listEl.innerHTML = "";
    return;
  }

  listEl.innerHTML = items.map((item) => {
    const title = item.title || "بدون عنوان";
    const meta = currentTab === "research"
      ? [item.venue, item.date].filter(Boolean).join(" · ")
      : (item.tag || "");
    const img = item.imageUrl
      ? `<img src="${item.imageUrl}" alt="">`
      : `<div class="thumb"></div>`;
    return `
      <article class="item" data-id="${item.id}">
        ${img}
        <div>
          <h3>${title}</h3>
          <p>${meta}</p>
        </div>
        <div class="item-actions">
          <button type="button" class="btn ghost" data-edit="${item.id}">تعديل</button>
          <button type="button" class="btn danger" data-delete="${item.id}">حذف</button>
        </div>
      </article>
    `;
  }).join("");
}

function openEditor(item) {
  editingId = item?.id || null;
  existingImageUrl = item?.imageUrl || "";
  existingFileUrl = item?.fileUrl || "";
  editorTitle.textContent = editingId ? "تعديل" : "إضافة";
  setError(editorError, "");
  editorForm.reset();

  const isResearch = currentTab === "research";
  galleryFields.classList.toggle("hidden", isResearch);
  researchFields.classList.toggle("hidden", !isResearch);

  if (isResearch) {
    document.getElementById("fieldResearchTitle").value = item?.title || "";
    document.getElementById("fieldVenue").value = item?.venue || "";
    document.getElementById("fieldDate").value = item?.date || "";
    document.getElementById("fieldUrl").value = item?.url || "";
    fileHint.textContent = existingFileUrl ? "ملف مرفوع مسبقاً. ارفع ملف جديد فقط إذا تريد تبديله." : "";
  } else {
    document.getElementById("fieldTag").value = item?.tag || "";
    document.getElementById("fieldTitle").value = item?.title || "";
    document.getElementById("fieldBody").value = item?.body || "";
    if (existingImageUrl) {
      imagePreview.src = existingImageUrl;
      imagePreview.classList.remove("hidden");
    } else {
      imagePreview.removeAttribute("src");
      imagePreview.classList.add("hidden");
    }
  }

  overlay.classList.remove("hidden");
}

function closeEditor() {
  overlay.classList.add("hidden");
  editingId = null;
}

async function saveItem(event) {
  event.preventDefault();
  setError(editorError, "");
  const saveBtn = document.getElementById("saveBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "جارٍ الحفظ...";

  try {
    if (currentTab === "research") {
      const title = document.getElementById("fieldResearchTitle").value.trim();
      if (!title) throw new Error("أكتب عنوان البحث.");
      const file = document.getElementById("fieldFile").files[0];
      let fileUrl = existingFileUrl;
      if (file) fileUrl = await uploadFile(file, "research");
      const data = {
        title,
        venue: document.getElementById("fieldVenue").value.trim(),
        date: document.getElementById("fieldDate").value.trim(),
        url: document.getElementById("fieldUrl").value.trim(),
        fileUrl
      };
      if (editingId) await updateItem(COLLECTIONS.research, editingId, data);
      else await createItem(COLLECTIONS.research, data);
    } else {
      const title = document.getElementById("fieldTitle").value.trim();
      if (!title) throw new Error("أكتب العنوان.");
      const image = document.getElementById("fieldImage").files[0];
      let imageUrl = existingImageUrl;
      if (image) imageUrl = await uploadFile(image, currentTab);
      const data = {
        tag: document.getElementById("fieldTag").value.trim(),
        title,
        body: document.getElementById("fieldBody").value.trim(),
        imageUrl
      };
      if (editingId) await updateItem(COLLECTIONS[currentTab], editingId, data);
      else await createItem(COLLECTIONS[currentTab], data);
    }
    closeEditor();
    await refresh();
  } catch (err) {
    console.error(err);
    setError(editorError, err.message || "ما تم الحفظ. تأكد من تسجيل الدخول وقواعد فايربيس.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "حفظ";
  }
}

async function importSeed() {
  const source = currentTab === "cases" ? SEED_CASES : SEED_POSTS;
  if (!source.length) return;
  if (!confirm("راح تنضاف النصوص الحالية الموجودة بالموقع إلى فايربيس. تكمل؟")) return;
  for (const item of source) {
    await createItem(COLLECTIONS[currentTab], item);
  }
  await refresh();
}

if (!isFirebaseConfigured()) {
  show(setupView);
} else {
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    setError(loginError, "");
    try {
      await signInWithEmailAndPassword(
        auth,
        document.getElementById("email").value.trim(),
        document.getElementById("password").value
      );
    } catch (err) {
      setError(loginError, "بيانات الدخول غلط أو الحساب مو مفعّل بفايربيس.");
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", () => signOut(auth));
  document.getElementById("addBtn").addEventListener("click", () => openEditor(null));
  document.getElementById("cancelBtn").addEventListener("click", closeEditor);
  document.getElementById("seedBtn").addEventListener("click", () => {
    importSeed().catch((err) => {
      console.error(err);
      setStatus("فشل استيراد المحتوى.");
    });
  });
  editorForm.addEventListener("submit", saveItem);

  document.getElementById("fieldImage")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    imagePreview.src = URL.createObjectURL(file);
    imagePreview.classList.remove("hidden");
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", async () => {
      currentTab = tab.dataset.tab;
      document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("is-active", t === tab));
      sectionTitle.textContent = TITLES[currentTab];
      await refresh();
    });
  });

  listEl.addEventListener("click", async (e) => {
    const editId = e.target.dataset.edit;
    const deleteId = e.target.dataset.delete;
    if (editId) {
      const item = items.find((x) => x.id === editId);
      if (item) openEditor(item);
    }
    if (deleteId) {
      if (!confirm("متأكد تريد تحذف هذا العنصر؟")) return;
      await removeItem(COLLECTIONS[currentTab], deleteId);
      await refresh();
    }
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeEditor();
  });

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      hide(loginView);
      hide(setupView);
      show(appView);
      await refresh();
    } else {
      hide(appView);
      hide(setupView);
      show(loginView);
    }
  });
}
