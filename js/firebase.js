// js/firebase.js
// Replace with your own Firebase config
const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOURS",
  authDomain: "REPLACE_WITH_YOURS.firebaseapp.com",
  projectId: "REPLACE_WITH_YOURS",
  storageBucket: "REPLACE_WITH_YOURS.appspot.com",
  messagingSenderId: "REPLACE_WITH_YOURS",
  appId: "REPLACE_WITH_YOURS"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Helper: record action in logs collection
async function logAction({ uid = null, userEmail = null, action = "", meta = {} } = {}) {
  try {
    await db.collection("logs").add({
      uid,
      userEmail,
      action,
      meta,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.error("Logging failed", e);
  }
}
