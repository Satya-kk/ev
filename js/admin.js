// js/admin.js

document.getElementById("adminSignin").addEventListener("click", async ()=>{
  const email = document.getElementById("adminEmail").value;
  const pass = document.getElementById("adminPassword").value;
  try {
    const user = await signIn(email, pass);
    const role = await getUserRole(user.uid);
    if(role !== "admin") {
      alert("Not an admin account.");
      await signOut();
      return;
    }
    adjustAdminUI(true);
    startAdminListeners();
  } catch (e) { alert(e.message); }
});

document.getElementById("adminSignout").addEventListener("click", async ()=>{
  await signOut(); adjustAdminUI(false);
});

function adjustAdminUI(signedIn){
  document.getElementById("createBunkSection").style.display = signedIn ? "block" : "none";
  document.getElementById("manageBunksSection").style.display = signedIn ? "block" : "none";
  document.getElementById("viewBookings").style.display = signedIn ? "block" : "none";
  document.getElementById("adminSignin").style.display = signedIn ? "none" : "inline-block";
  document.getElementById("adminSignout").style.display = signedIn ? "inline-block" : "none";
}

document.getElementById("createBunkBtn").addEventListener("click", async ()=>{
  const name = document.getElementById("bunkName").value;
  if(!name) return alert("Name required");
  const address = document.getElementById("bunkAddress").value || "";
  const lat = parseFloat(document.getElementById("bunkLat").value);
  const lng = parseFloat(document.getElementById("bunkLng").value);
  const mobile = document.getElementById("bunkMobile").value || "";

  const bunkRef = await db.collection("bunks").add({
    name, address, lat, lng, mobile, createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await logAction({ uid: auth.currentUser.uid, userEmail: auth.currentUser.email, action: "create_bunk", meta: { bunkId: bunkRef.id } });
  alert("Bunk created: " + bunkRef.id);
});

// Admin listing & slot creation UI
async function startAdminListeners(){
  // bunks list
  db.collection("bunks").onSnapshot(snapshot=>{
    const ul = document.getElementById("adminBunksList");
    ul.innerHTML = "";
    snapshot.forEach(doc=>{
      const b = doc.data(); b.id = doc.id;
      const li = document.createElement("li");
      li.innerHTML = `<strong>${b.name}</strong> (${b.address}) — ${b.lat}, ${b.lng}
        <button data-id="${b.id}" class="addSlotBtn">Add Slot</button>
        <button data-id="${b.id}" class="viewSlotsBtn">View Slots</button>`;
      ul.appendChild(li);
    });
    document.querySelectorAll(".addSlotBtn").forEach(btn=>{
      btn.addEventListener("click", async e=>{
        const bunkId = e.target.dataset.id;
        const slotName = prompt("Slot name (e.g. A1):");
        if(!slotName) return;
        const slotRef = await db.collection("bunks").doc(bunkId).collection("slots").add({
          name: slotName, status: "available", createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await logAction({ uid: auth.currentUser.uid, userEmail: auth.currentUser.email, action: "create_slot", meta: { bunkId, slotId: slotRef.id } });
        alert("Slot added.");
      });
    });

    document.querySelectorAll(".viewSlotsBtn").forEach(btn=>{
      btn.addEventListener("click", async e=>{
        const bunkId = e.target.dataset.id;
        const slotsSnap = await db.collection("bunks").doc(bunkId).collection("slots").get();
        let out = "Slots:\n";
        slotsSnap.forEach(s=>{ out += `${s.id} -> ${JSON.stringify(s.data())}\n`; });
        alert(out);
      });
    });
  });

  // bookings
  db.collection("bookings").onSnapshot(snapshot=>{
    const ul = document.getElementById("bookingsList"); ul.innerHTML="";
    snapshot.forEach(doc=>{
      const b = doc.data(); b.id = doc.id;
      const li = document.createElement("li");
      li.innerHTML = `<strong>${b.id}</strong> user:${b.userEmail} bunk:${b.bunkId} slot:${b.slotId} status:${b.status}
        <button data-id="${b.id}" class="completeBtn">Complete</button>
        <button data-id="${b.id}" class="cancelBtn">Cancel</button>`;
      ul.appendChild(li);
    });

    document.querySelectorAll(".completeBtn").forEach(btn=>{
      btn.addEventListener("click", async e=>{
        const bookingId = e.target.dataset.id;
        const bookingDoc = await db.collection("bookings").doc(bookingId).get();
        if(!bookingDoc.exists) return alert("Not found");
        const b = bookingDoc.data();
        // mark booking completed & free slot
        await db.runTransaction(async tx=>{
          tx.update(db.collection("bookings").doc(bookingId), { status: "completed", completedAt: firebase.firestore.FieldValue.serverTimestamp() });
          tx.update(db.collection("bunks").doc(b.bunkId).collection("slots").doc(b.slotId), { status: "available", bookedBy: firebase.firestore.FieldValue.delete(), bookedAt: firebase.firestore.FieldValue.delete() });
        });
        await logAction({ uid: auth.currentUser.uid, userEmail: auth.currentUser.email, action: "complete_booking", meta: { bookingId } });
        alert("Completed");
      });
    });

    document.querySelectorAll(".cancelBtn").forEach(btn=>{
      btn.addEventListener("click", async e=>{
        const bookingId = e.target.dataset.id;
        const bookingDoc = await db.collection("bookings").doc(bookingId).get();
        if(!bookingDoc.exists) return alert("Not found");
        const b = bookingDoc.data();
        await db.runTransaction(async tx=>{
          tx.update(db.collection("bookings").doc(bookingId), { status: "cancelled", cancelledAt: firebase.firestore.FieldValue.serverTimestamp() });
          tx.update(db.collection("bunks").doc(b.bunkId).collection("slots").doc(b.slotId), { status: "available", bookedBy: firebase.firestore.FieldValue.delete(), bookedAt: firebase.firestore.FieldValue.delete() });
        });
        await logAction({ uid: auth.currentUser.uid, userEmail: auth.currentUser.email, action: "cancel_booking", meta: { bookingId } });
        alert("Cancelled");
      });
    });
  });
}
