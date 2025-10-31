// js/main.js
let map, userMarker;
let userLocation = null;

document.getElementById("signinBtn").addEventListener("click", async ()=>{
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  try {
    await signIn(email, pass);
    adjustAuthUI();
  } catch (e) { alert(e.message); }
});

document.getElementById("signupBtn").addEventListener("click", async ()=>{
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  try {
    await signUp(email, pass, "user");
    adjustAuthUI();
  } catch (e) { alert(e.message); }
});

document.getElementById("signoutBtn").addEventListener("click", async ()=>{
  await signOut();
  adjustAuthUI();
});

auth.onAuthStateChanged(user => {
  adjustAuthUI();
});

function adjustAuthUI(){
  const user = auth.currentUser;
  if(user){
    document.getElementById("signinBtn").style.display="none";
    document.getElementById("signupBtn").style.display="none";
    document.getElementById("signoutBtn").style.display="inline-block";
  } else {
    document.getElementById("signinBtn").style.display="inline-block";
    document.getElementById("signupBtn").style.display="inline-block";
    document.getElementById("signoutBtn").style.display="none";
  }
}

// Map init
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), { center: {lat:20.5937, lng:78.9629}, zoom: 5 });
  // try geolocation
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(pos=>{
      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      map.setCenter(userLocation);
      map.setZoom(14);
      userMarker = new google.maps.Marker({ position: userLocation, map, title: "You" });
    });
  }
}

window.initMap = initMap; // maps callback

// Find nearby bunks
document.getElementById("findNearbyBtn").addEventListener("click", async ()=>{
  const radiusKm = Number(document.getElementById("searchRadius").value) || 5;
  if(!userLocation) {
    alert("Allow geolocation and try again.");
    return;
  }
  const bunksSnapshot = await db.collection("bunks").get();
  const bunks = [];
  bunksSnapshot.forEach(doc=>{
    const d = doc.data(); d.id = doc.id; bunks.push(d);
  });

  // compute distance (Haversine)
  function distKm(a, b){
    const R = 6371;
    const toRad = x => x * Math.PI/180;
    const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lng - a.lng);
    const la = toRad(a.lat), lb = toRad(b.lat);
    const aa = Math.sin(dLat/2)**2 + Math.cos(la)*Math.cos(lb)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
  }

  const nearby = bunks.map(b => ({...b, distance: distKm(userLocation, {lat: b.lat, lng: b.lng})}))
                     .filter(b => b.distance <= radiusKm)
                     .sort((a,b)=>a.distance - b.distance);

  renderBunks(nearby);
});

function clearMarkersExceptUser(){
  // naive: reload map markers by re-centering (we keep it simple).
  // In production store marker objects & clear them.
  initMap(); // quick refresh
}

function renderBunks(list){
  const ul = document.getElementById("bunksUl");
  ul.innerHTML = "";
  clearMarkersExceptUser();

  list.forEach(b=>{
    // marker
    new google.maps.Marker({ position: {lat: b.lat, lng: b.lng}, map, title: b.name });

    const li = document.createElement("li");
    li.innerHTML = `<strong>${b.name}</strong> — ${b.address} — ${b.distance.toFixed(2)} km
      <button data-id="${b.id}" class="viewBtn">View Slots</button>`;
    ul.appendChild(li);
  });

  document.querySelectorAll(".viewBtn").forEach(btn => {
    btn.addEventListener("click", async (e)=>{
      const bunkId = e.target.dataset.id;
      await openBunkModal(bunkId);
    });
  });
}

// modal & booking
async function openBunkModal(bunkId){
  const bunkDoc = await db.collection("bunks").doc(bunkId).get();
  if(!bunkDoc.exists) return alert("Not found");
  const bunk = bunkDoc.data(); bunk.id = bunkDoc.id;

  document.getElementById("modalBunkTitle").innerText = `${bunk.name} — ${bunk.address}`;

  // get slots
  const slotsSnap = await db.collection("bunks").doc(bunkId).collection("slots").get();
  const slots = [];
  slotsSnap.forEach(s=>{ const d=s.data(); d.id=s.id; slots.push(d); });

  const container = document.getElementById("slotsContainer");
  container.innerHTML = "";
  slots.forEach(s=>{
    const div = document.createElement("div");
    div.innerHTML = `<div class="slot">
      <span>Slot: ${s.name} — Status: ${s.status || "available"}</span>
      <button data-slot="${s.id}" data-bunk="${bunk.id}" class="bookBtn" ${s.status==="booked" ? "disabled" : ""}>Book</button>
    </div>`;
    container.appendChild(div);
  });

  document.querySelectorAll(".bookBtn").forEach(btn=>{
    btn.addEventListener("click", async (e)=>{
      const user = auth.currentUser;
      if(!user) return alert("Sign in to book.");
      const slotId = e.target.dataset.slot;
      const bunkId = e.target.dataset.bunk;
      // transaction: mark slot booked, create booking doc
      const slotRef = db.collection("bunks").doc(bunkId).collection("slots").doc(slotId);
      const bookingRef = db.collection("bookings").doc();

      await db.runTransaction(async (tx)=>{
        const slotDoc = await tx.get(slotRef);
        if(!slotDoc.exists) throw "Slot missing";
        if(slotDoc.data().status === "booked") throw "Already booked";
        tx.update(slotRef, { status: "booked", bookedBy: user.uid, bookedAt: firebase.firestore.FieldValue.serverTimestamp() });
        tx.set(bookingRef, {
          bunkId,
          slotId,
          userId: user.uid,
          userEmail: user.email,
          status: "active",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      await logAction({ uid: user.uid, userEmail: user.email, action: "book_slot", meta: { bunkId, slotId } });
      alert("Booked!");
      await openBunkModal(bunkId); // refresh modal
    });
  });

  document.getElementById("bookingModal").style.display = "block";
}

document.getElementById("closeModal").addEventListener("click", ()=> {
  document.getElementById("bookingModal").style.display = "none";
});
