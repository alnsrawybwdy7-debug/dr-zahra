import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { db, auth } from "./firebase.js";

export const COLLECTIONS = {
  posts: "posts",
  cases: "cases",
  research: "research"
};

// رابط الـ Cloudflare Worker المسؤول عن رفع الصور إلى R2.
// بدّل هذا بالرابط الحقيقي بعد نشر الـ Worker (شوف تعليمات النشر).
const UPLOAD_ENDPOINT = "https://dr-zahra-upload.YOUR-SUBDOMAIN.workers.dev";

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value === "number") return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function listItems(collectionName) {
  const snap = await getDocs(collection(db, collectionName));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
}

export async function createItem(collectionName, data) {
  const payload = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  const refDoc = await addDoc(collection(db, collectionName), payload);
  return refDoc.id;
}

export async function updateItem(collectionName, id, data) {
  await updateDoc(doc(db, collectionName, id), { ...data, updatedAt: serverTimestamp() });
}

export async function removeItem(collectionName, id) {
  await deleteDoc(doc(db, collectionName, id));
}

// رفع الصور صار عبر Cloudflare R2 بدل Firebase Storage
// (Firebase Storage صار يتطلب خطة Blaze إجبارياً من فبراير 2026)
export async function uploadFile(file, folder) {
  const user = auth.currentUser;
  if (!user) throw new Error("لازم تسجل دخول قبل رفع الصور.");

  const idToken = await user.getIdToken();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await fetch(UPLOAD_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
    body: formData
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "فشل رفع الصورة، جرب مرة ثانية.");
  }

  const data = await res.json();
  return data.url;
}
