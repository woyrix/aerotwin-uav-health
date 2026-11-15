# Aerotwin

Static two-page prototype for UAV fleet health monitoring and a virtual aircraft simulator.

## Run locally

For local UI work, serve this folder (ES modules do not work from `file://`): `python -m http.server 8000`, then open `http://localhost:8000`.

## Firebase setup

1. Create a Firebase project and register a Web app. Enable **Authentication → Email/Password** and **Cloud Firestore**.
2. Put only the Web app configuration object in `firebase-config.js` (`export const firebaseConfig = { ... };`). Publish the rules in `firestore.rules`.
3. Install Node.js 22 and Firebase CLI, run `firebase login`, then `firebase use --add` and select this Firebase project.
4. Revoke any Gemini API key shared in chat/source control and create a replacement in Google AI Studio. Run `firebase functions:secrets:set GEMINI_API_KEY` and enter the new key into the CLI's hidden prompt. Never place it in browser code, `firebase-config.js`, Vercel client variables, or GitHub.
5. Run `firebase deploy --only functions` to deploy the authenticated Woyrix callable backend. The function reads only the signed-in user's Firestore fleet and applies a per-account request limit. Cloud Functions deployment requires the Firebase project to use the Blaze plan; function and Gemini usage can incur charges.
6. Import this repository into Vercel. Set the project root to the repository root, no build command, and output directory `.`. Deploy Firebase Functions separately from the Aerotwin folder. After both cloud deployments finish, the site and Woyrix keep running with your PC off.

Create accounts from Aerotwin's sign-in page. Usernames map to Firebase Auth email addresses as `<username>@aerotwin.app`. Add `localhost` and your deployed domain in Firebase Authentication's **Settings → Authorized domains**. Authenticated fleet data lives at `users/{uid}/data/fleet`; Firestore rules scope reads and writes to the signed-in UID. Create virtual UAVs in the simulator; it assigns each a passkey. On the dashboard, choose **Add aircraft → connect** to enter that UAV ID and passkey and open its twin. Demo fleet access is disabled; a new account starts empty, and a manually registered aircraft shows unavailable health values until telemetry is recorded.

## Prototype scope

The simulator uses deterministic client-side formulas to generate simulated telemetry and heuristic estimates; they are not validated aircraft diagnostics or operational flight guidance. The dashboard averages only values present on account aircraft. Manually registered aircraft remain `—` until telemetry is recorded. The simulator renders an interactive procedural Three.js concept airframe with a transparent inspection shell, visible flight controller and sensor modules. It loads Three.js from jsDelivr, so the simulator needs an internet connection for the 3D renderer. Replace the concept geometry with a validated aircraft CAD/GLTF asset and calibrated sensor/prediction models before using it to make maintenance or flight decisions.

Woyrix is a Gemini-powered chat advisor. The browser never receives the Gemini key. Every prompt sends the latest message and up to 20 prior conversation messages to the Firebase callable; the server appends the signed-in user's current fleet telemetry and sends it to Google's Gemini Interactions API with `store: false`.
