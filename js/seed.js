// js/seed.js
(async function seed(){
  const bunks = [
    { name: "EV Bunk A", address: "MG Road", lat: 18.5204, lng:73.8567, mobile: "9876543210" },
    { name: "EV Bunk B", address: "Shivaji Nagar", lat: 18.5246, lng:73.8478, mobile: "9876500000" }
  ];
  for(const b of bunks){
    const ref = await db.collection("bunks").add({ ...b, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    // create 3 slots each
    for(let i=1;i<=3;i++){
      await db.collection("bunks").doc(ref.id).collection("slots").add({ name: `S${i}`, status: "available", createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    }
    console.log("Created bunk", ref.id);
  }
  console.log("Seeding complete");
})();
