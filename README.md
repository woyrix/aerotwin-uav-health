# Aerotwin

Static two-page prototype for UAV fleet health monitoring and a virtual aircraft simulator.

## Run locally

Serve this folder from a local web server (ES modules and Firebase imports do not work from `file://`). For example, from this directory run `python -m http.server 8000`, then open `http://localhost:8000`.

## Firebase setup

1. Create a Firebase project and register a Web app.
2. Enable **Authentication → Email/Password** and **Cloud Firestore**.
3. Put the web app configuration in `firebase-config.js`.
4. Publish the rules in `firestore.rules`.

Create accounts from Aerotwin's sign-in page. Usernames map to Firebase Auth email addresses as `<username>@aerotwin.app`. Add `localhost` and your deployed domain in Firebase Authentication's **Settings → Authorized domains**. Authenticated fleet data lives at `users/{uid}/data/fleet`; Firestore rules scope reads and writes to the signed-in UID. Create virtual UAVs in the simulator; it assigns each a passkey. On the dashboard, choose **Add aircraft → connect** to enter that UAV ID and passkey and open its twin. Demo fleet access is disabled; a new account starts empty, and a manually registered aircraft shows unavailable health values until telemetry is recorded.

## Prototype scope

The simulator uses deterministic client-side formulas to generate simulated telemetry and heuristic estimates; they are not validated aircraft diagnostics or operational flight guidance. The dashboard averages only values present on account aircraft. Manually registered aircraft remain `—` until telemetry is recorded. The simulator renders an interactive procedural Three.js concept airframe with a transparent inspection shell, visible flight controller and sensor modules. It loads Three.js from jsDelivr, so the simulator needs an internet connection for the 3D renderer. Replace the concept geometry with a validated aircraft CAD/GLTF asset and calibrated sensor/prediction models before using it to make maintenance or flight decisions.

Woyrix is a Gemini-powered chat advisor. Enter a Gemini API key in the chat panel; it is kept in page memory and not written to source files or Firestore. Every prompt sends the current account fleet telemetry to Google's Gemini Interactions API together with up to 20 visible conversation messages. Requests use `store: false`; the browser maintains the chat history. Restrict the key to the Gemini API and do not use a production key in this browser prototype.
