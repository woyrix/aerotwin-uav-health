# Aerotwin

Static two-page prototype for UAV fleet health monitoring and a virtual aircraft simulator.

## Run locally

For local UI work, serve this folder (ES modules do not work from `file://`): `python -m http.server 8000`, then open `http://localhost:8000`.

## Firebase setup

1. Create a Firebase project and register a Web app. Enable **Authentication → Email/Password** and **Cloud Firestore**.
2. Put only the Web app configuration object in `firebase-config.js` (`export const firebaseConfig = { ... };`). Publish the rules in `firestore.rules`.
3. For local use, create an ignored `gemini-config.js` containing `window.AEROTWIN_GEMINI_API_KEY = 'YOUR_DEMO_KEY';`. For Vercel, add `GEMINI_API_KEY` in Project Settings → Environment Variables and set the Build Command to `npm run build`.
4. Import this repository into Vercel. Use the repository root, Framework Preset **Other**, and output directory `.`. The build writes `gemini-config.js` into the deployed static output.

Create accounts from Aerotwin's sign-in page. Usernames map to Firebase Auth email addresses as `<username>@aerotwin.app`. Add `localhost` and your deployed domain in Firebase Authentication's **Settings → Authorized domains**. Authenticated fleet data lives at `users/{uid}/data/fleet`; Firestore rules scope reads and writes to the signed-in UID. Create virtual UAVs in the simulator; it assigns each a passkey. On the dashboard, choose **Add aircraft → connect** to enter that UAV ID and passkey and open its twin. Demo fleet access is disabled; a new account starts empty, and a manually registered aircraft shows unavailable health values until telemetry is recorded.

## Prototype scope

The simulator uses deterministic client-side formulas to generate simulated telemetry and heuristic estimates; they are not validated aircraft diagnostics or operational flight guidance. The dashboard averages only values present on account aircraft. Manually registered aircraft remain `—` until telemetry is recorded. The simulator renders an interactive procedural Three.js concept airframe with a transparent inspection shell, visible flight controller and sensor modules. It loads Three.js from jsDelivr, so the simulator needs an internet connection for the 3D renderer. Replace the concept geometry with a validated aircraft CAD/GLTF asset and calibrated sensor/prediction models before using it to make maintenance or flight decisions.

Woyrix is a Gemini-powered chat advisor. Every prompt sends the latest message, up to 20 prior conversation messages, and the signed-in user's current fleet telemetry directly from the browser to Gemini's Generate Content API. The key is not committed to GitHub, but the generated browser config is publicly readable by website users. Use a restricted, low-quota demo key and revoke it after the event. Do not reuse a production key.
