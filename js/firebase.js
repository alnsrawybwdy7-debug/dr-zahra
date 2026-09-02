import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

export function isFirebaseConfigured() {
  const key = (firebaseConfig.apiKey || "").trim();
  const project = (firebaseConfig.projectId || "").trim();
  return Boolean(key && project && key !== "YOUR_API_KEY" && project !== "YOUR_PROJECT_ID");
}

let app = null;
let db = null;
let auth = null;
let storage = null;

if (isFirebaseConfigured()) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
}

export { app, db, auth, storage };
