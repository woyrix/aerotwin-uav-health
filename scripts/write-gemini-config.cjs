const fs = require('node:fs');
const path = require('node:path');

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error('Missing GEMINI_API_KEY. Add it in your Vercel project environment settings.');
  process.exit(1);
}

const output = path.join(__dirname, '..', 'gemini-config.js');
fs.writeFileSync(output, `window.AEROTWIN_GEMINI_API_KEY = ${JSON.stringify(key)};\n`, { encoding: 'utf8', mode: 0o600 });
console.log('Wrote Gemini runtime config for static deployment.');
