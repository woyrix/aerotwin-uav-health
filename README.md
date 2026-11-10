# Aerotwin

Static two-page prototype for UAV fleet health monitoring and a virtual aircraft simulator.

## Run locally

Serve this folder from a local web server (ES modules and Firebase imports do not work from `file://`). For example, from this directory run `python -m http.server 8000`, then open `http://localhost:8000`.

## Firebase setup

1. Create a Firebase project and register a Web app.
2. Enable **Authentication → Email/Password** and **Cloud Firestore**.
3. Put the web app configuration in `firebase-config.js`.
4. Create Firebase Auth users in the console with email addresses in the form `username@aerotwin.app`. Users sign in on the page with only the part before `@` and their Firebase password. Firebase Auth itself uses email/password; this app maps the displayed username to that email address.
5. Publish the rules in `firestore.rules`.

Authenticated fleet data lives at `users/{uid}/data/fleet`; Firestore rules scope reads and writes to the signed-in UID. Create virtual UAVs in the simulator; it assigns each a passkey. On the dashboard, choose **Add aircraft → connect** to enter that UAV ID and passkey and open its twin. Without Firebase configuration, **Explore demo fleet** uses browser-local demo storage. Do not use demo mode for private or production fleet data.

## Prototype scope

The dashboard and telemetry are demonstration UI and deterministic client-side estimates, not validated aircraft diagnostics or an operational flight system. The simulator renders an interactive procedural Three.js concept airframe with a transparent inspection shell, visible flight controller and sensor modules. It loads Three.js from jsDelivr, so the simulator needs an internet connection for the 3D renderer. Replace the concept geometry with a validated aircraft CAD/GLTF asset and calibrated sensor/prediction models before using it to make maintenance or flight decisions. The buzzer preference and alert are currently interface-level prototypes.
