import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";
import { db, storage } from "./firebase.js";

export const COLLECTIONS = {
  posts: "posts",
  cases: "cases",
  research: "research"
};

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

export async function uploadFile(file, folder) {
  const safe = file.name.replace(/[^\w.\u0600-\u06FF-]+/g, "-");
  const path = `${folder}/${Date.now()}-${safe}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: file.type || "application/octet-stream" });
  return getDownloadURL(fileRef);
}
