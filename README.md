# ev
# EV Recharge Bunk

Simple prototype for EV charging slot discovery & booking using Firebase and Google Maps.

## Quick start

1. Copy repo to local machine or GitHub Pages.
2. Create Firebase project:
   - Enable Firestore and Authentication (Email/Password).
   - Copy config and paste into `js/firebase.js`.
3. Replace `YOUR_GOOGLE_MAPS_API_KEY` in `index.html`.
4. Open `index.html` (or host via Firebase Hosting).
5. Use `js/seed.js` (run in browser console) to create sample bunks & slots.

## Features
- User signup/login
- Admin signup/login (create role="admin" in Firestore manually or create via signUp and then change role)
- Admin: add bunks and slots, view bookings
- User: find nearby bunks, view slots, book slot
- Firestore `logs` collection captures actions for auditing

## Data model (Firestore)
- bunks (collection)
  - { name, address, lat, lng, mobile, ... }
  - slots (subcollection)
    - { name, status: "available"|"booked", bookedBy?, bookedAt? }
- bookings (collection)
  - { bunkId, slotId, userId, userEmail, status, createdAt }
- users (collection)
  - { email, role }
- logs (collection)
  - { uid, userEmail, action, meta, timestamp }

## To improve (next steps)
- Add better UI/UX (slot timings, durations, pricing)
- Add push notifications / SMS integration
- Add secure Firestore rules
- Add automated tests

