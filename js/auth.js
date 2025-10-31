// js/auth.js
// Shared authentication helpers

/**
 * Sign up a user (or admin) with email & password.
 * Stores role in 'users' collection: { uid, email, role }
 * role: "admin" | "user"
 */
async function signUp(email, password, role = "user") {
  const res = await auth.createUserWithEmailAndPassword(email, password);
  const uid = res.user.uid;
  await db.collection("users").doc(uid).set({ email, role, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  await logAction({ uid, userEmail: email, action: "signup", meta: { role } });
  return res.user;
}

async function signIn(email, password) {
  const res = await auth.signInWithEmailAndPassword(email, password);
  await logAction({ uid: res.user.uid, userEmail: email, action: "signin" });
  return res.user;
}

async function signOut() {
  const user = auth.currentUser;
  if (user) {
    await logAction({ uid: user.uid, userEmail: user.email, action: "signout" });
  }
  return auth.signOut();
}

async function getUserRole(uid) {
  const doc = await db.collection("users").doc(uid).get();
  if (!doc.exists) return null;
  return doc.data().role || null;
}
