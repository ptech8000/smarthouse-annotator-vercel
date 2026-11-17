# SmartHouse Annotator (Vercel Edition — Annotation-Only, Zero Smartwatches)

> [!IMPORTANT]
> **Existing Project Protected:** Not a single file in your existing `SmartHouse-Studio` Render repository was modified. Use this blueprint to create a **brand-new folder and GitHub repository** for Vercel so both deployments run side-by-side with **zero shared data**.

---

## 1. Guaranteeing 100% Data Separation (Render vs. Vercel)

To make sure test sessions, annotations, environments, and backups **never mix or overwrite** between your existing Render deployment and the new Vercel deployment, configure these 4 independent layers:

| Layer | Existing Render App | New Vercel Annotation-Only App |
| :--- | :--- | :--- |
| **GitHub Code Repo** | `ptech8000/SmartHouse-Studio` | New repository (e.g. `ptech8000/smarthouse-annotator-vercel`) |
| **PostgreSQL Database (`DATABASE_URL`)** | Existing Render Postgres DB | **Brand-new Postgres database** (e.g. free Neon DB in Vercel Storage / Marketplace) |
| **PostgreSQL Schema (`PG_SCHEMA`)** | `public` | **`annotator_v2`** (default on Vercel in new `server/database.js` — even if you ever pasted the old DB URL by mistake, tables live inside `"annotator_v2".*` and never touch `public.*`) |
| **Private Git Backup (`GITHUB_BACKUP_REPO`)** | `ptech8000/smarthouse-backups` | **Brand-new private repo** (e.g. `ptech8000/smarthouse-annotator-backups`) + new scoped Fine-Grained PAT |
| **Browser Local Storage** | IndexedDB `SmartHouseDB` / key `smarthouse_active_timer:` | IndexedDB **`SmartHouseAnnotatorDB`** / key **`smarthouse_annotator_timer:`** / SW cache **`smarthouse-annotator-v1`** |

---

## 2. File Action Checklist for the New Project

### A. Delete Completely (DO NOT include in the new repo)
- `sensors.json`
- `render.yaml`
- `.github/workflows/keep-alive.yml`
- `client/src/services/ble.ts`
- `client/src/components/SensorWaveform.tsx`

### B. Keep Unchanged (Copy directly from your existing project)
- Config JSON templates: `scenario.json`, `locations.json`, `activities.json`, `activities_location.json`
- Server helpers: `server/csvExport.js`, `server/gitBackup.js`
- Client config/static files: `.node-version`, `client/.gitignore`, `client/.oxlintrc.json`, `client/package.json`, `client/package-lock.json`, `client/tsconfig.json`, `client/tsconfig.app.json`, `client/tsconfig.node.json`, `client/vite.config.ts`, `client/public/favicon.svg`, `client/public/icons.svg`
- Client assets/utils/components: `client/src/assets/*`, `client/src/main.tsx`, `client/src/App.css`, `client/src/index.css`, `client/src/services/clock.ts`, `client/src/utils/environmentJson.ts`, `client/src/utils/interactions.ts`, `client/src/components/AdminLogin.tsx`, `client/src/components/BreadcrumbStack.tsx`, `client/src/components/EnvironmentBuilderModal.tsx`, `client/src/components/InAppNotifications.tsx`, `client/src/components/Screen1Location.tsx`, `client/src/components/Screen2Activity.tsx`, `client/src/components/Screen3Interaction.tsx`, `client/src/components/Screen4Person.tsx`

*(Note: Do **not** copy `server/data/smart_house.db` — let the new app initialize cleanly in its new PostgreSQL database.)*

### C. Add or Replace (Full clean code provided below)
1. `package.json` *(updated)*
2. `server/package.json` *(unchanged deps listed cleanly)*
3. `vercel.json` *(new)*
4. `api/index.js` *(new)*
5. `.gitignore` *(updated)*
6. `client/index.html` *(updated)*
7. `client/public/manifest.webmanifest` *(updated)*
8. `client/public/sw.js` *(updated)*
9. `server/configPipeline.js` *(updated — no `sensors.json` / `sensors`)*
10. `server/security.js` *(updated — no `validateSensorChunkPayload`, Vercel CORS support)*
11. `server/database.js` *(updated — no `wearables`/`sensor_chunks`/`sync_points`, `PG_SCHEMA` isolation + Postgres-required on Vercel)*
12. `server/index.js` *(updated — no `/api/ble/*`, Vercel serverless init & export + `/api/backup/cron`)*
13. `client/src/types.ts` *(updated — no wearable/sensor types)*
14. `client/src/services/outbox.ts` *(updated — `SmartHouseAnnotatorDB`)*
15. `client/src/services/api.ts` *(updated — no BLE endpoints)*
16. `client/src/components/AppHeader.tsx` *(updated — no Virtual Wearables tab or Watch pill)*
17. `client/src/components/Screen5Review.tsx` *(updated — no Wrist Tap spike box)*
18. `client/src/components/AdminConsole.tsx` *(updated — no Module 2 Virtual Wearables, no Sensor Chunks column, no `sensors.json` card)*
19. `client/src/App.tsx` *(updated — no BLE subscription, renamed timer key)*
20. `test_app.js` *(updated — 10 annotation/security/environment/backup suites, no BLE chunk test)*

---

## 3. Ready-to-Use Starter Prompt for Your New Conversation

Open a **new folder** (with your copied unchanged files) in a **new Antigravity conversation**, attach or reference this file (`vercel_annotation_only_blueprint.md`), and paste:

> I am launching the new Vercel-only, annotation-only version of SmartHouse Annotator using the attached blueprint (`vercel_annotation_only_blueprint.md`).
> 1. Delete `sensors.json`, `render.yaml`, `.github/workflows/keep-alive.yml`, `client/src/services/ble.ts`, `client/src/components/SensorWaveform.tsx`, and any local `server/data/*.db` files if present.
> 2. Write every new/updated file from `vercel_annotation_only_blueprint.md` cleanly.
> 3. Install dependencies, run `node test_app.js`, and run `npm run build` inside `client` to verify zero TypeScript or test errors.
> 4. Walk me through connecting a brand-new Neon Postgres DB (`DATABASE_URL`), setting `PG_SCHEMA=annotator_v2`, setting a brand-new private `GITHUB_BACKUP_REPO` + `GITHUB_BACKUP_TOKEN`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `CRON_SECRET`, and deploying to Vercel.

---

## 4. Vercel Deployment & Project Root Files

### File 1: `vercel.json` *(new)*
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "npm install && npm --prefix server install && npm --prefix client install --include=dev",
  "buildCommand": "npm --prefix client run build",
  "outputDirectory": "client/dist",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index.js"
    },
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ],
  "functions": {
    "api/index.js": {
      "includeFiles": "{scenario,locations,activities,activities_location}.json",
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/backup/cron",
      "schedule": "0 3 * * *"
    }
  ]
}
```

### File 2: `api/index.js` *(new)*
```js
const app = require('../server/index');

module.exports = app;
```

### File 3: `package.json` *(root — replaces existing)*
```json
{
  "name": "smarthouse-annotator",
  "version": "2.0.0",
  "description": "Smart House Activity Annotation Platform (Vercel + PostgreSQL, Annotation-Only)",
  "engines": {
    "node": "22.x"
  },
  "scripts": {
    "start": "node server/index.js",
    "dev:server": "node server/index.js",
    "dev:client": "cd client && npm run dev",
    "build:client": "npm --prefix client install --include=dev && npm --prefix client run build",
    "build": "npm --prefix server install && npm --prefix client install --include=dev && npm --prefix client run build",
    "vercel-build": "npm --prefix client run build",
    "test": "node test_app.js"
  },
  "dependencies": {
    "cors": "^2.8.6",
    "express": "^5.3.0",
    "pg": "^8.23.1"
  },
  "keywords": [
    "smart-house",
    "activity-annotation",
    "time-synchronization",
    "pwa",
    "vercel"
  ],
  "author": "",
  "license": "ISC"
}
```

### File 4: `server/package.json` *(keep matching root)*
```json
{
  "name": "server",
  "version": "2.0.0",
  "description": "SmartHouse Annotator Backend API",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Run root test_app.js\" && exit 0"
  },
  "keywords": [],
  "type": "commonjs",
  "dependencies": {
    "cors": "^2.8.6",
    "express": "^5.3.0",
    "pg": "^8.23.1"
  }
}
```

### File 5: `.gitignore`
```gitignore
node_modules/
server/node_modules/
client/node_modules/
client/dist/
server/data/*.db
server/data/*.db-wal
server/data/*.db-shm
.vercel/
.env
.env.*
!.env.example
*.log
```

### File 6: `client/index.html`
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#090d16" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="description" content="SmartHouse Annotator — Multi-resident smart home activity annotation platform." />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/favicon.svg" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <title>SmartHouse Annotator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### File 7: `client/public/manifest.webmanifest`
```json
{
  "name": "SmartHouse Annotator — Research Annotation Console",
  "short_name": "Annotator",
  "description": "Multi-resident smart home activity annotation console.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#090d16",
  "theme_color": "#090d16",
  "icons": [
    {
      "src": "/favicon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

### File 8: `client/public/sw.js`
```js
const CACHE_NAME = 'smarthouse-annotator-v1';
const APP_SHELL = ['/', '/manifest.webmanifest', '/favicon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never serve stale /api responses from cache
  if (url.pathname.startsWith('/api/')) return;

  // Navigation requests: network first, fallback to cached shell for offline resilience
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('/', clone)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Static assets: cache hit with background revalidation
  event.respondWith(
    caches.match(req).then(cached => {
      const networkFetch = fetch(req)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
```

---
## 5. Backend Server Files (`server/`)

*(Note: Keep `server/csvExport.js` and `server/gitBackup.js` copied unchanged from the existing project.)*

### File 9: `server/configPipeline.js`
```js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration directory is the parent directory where json files are located
const CONFIG_DIR = path.resolve(__dirname, '..');

// Helper to safely parse JSON tolerating trailing commas & comments
function tolerantJsonParse(rawText, filename) {
  try {
    // Strip UTF-8 BOM if present
    let cleaned = rawText.replace(/^\uFEFF/, '');
    // Strip single line & multi-line comments
    cleaned = cleaned
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^\\:])\/\/.*$/gm, '$1');
    // Strip trailing commas before } or ]
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse ${filename}: ${err.message}`);
  }
}

// Normalization utility
function normalizeKey(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, ' ');
}

const ALL_INTERACTION_KEYS = ['solo', 'collaborative', 'assistive'];
const INTERACTION_KEY_ALIASES = {
  solo: 'solo',
  collab: 'collaborative',
  collaborative: 'collaborative',
  assisted: 'assistive',
  assistive: 'assistive'
};

function normalizeAllowedInteractions(rawAct, fallbackCanDoTogether = true) {
  const rawList = Array.isArray(rawAct?.allowedInteractions)
    ? rawAct.allowedInteractions
    : Array.isArray(rawAct?.allowed_interactions)
      ? rawAct.allowed_interactions
      : null;

  if (rawList) {
    const picked = new Set();
    for (const item of rawList) {
      const alias = INTERACTION_KEY_ALIASES[String(item || '').trim().toLowerCase()];
      if (alias) picked.add(alias);
    }
    const ordered = ALL_INTERACTION_KEYS.filter(k => picked.has(k));
    if (ordered.length > 0) return ordered;
  }

  const canTogether =
    rawAct?.canDoTogether !== false &&
    rawAct?.can_do_together !== false &&
    fallbackCanDoTogether !== false;
  return canTogether ? [...ALL_INTERACTION_KEYS] : ['solo'];
}

// Known aliases for fuzzy matching
const ZONE_ALIASES = {
  'landing': 'landing area',
  'landing area': 'landing area',
  'bedroom 1': 'bedroom 1',
  'bedroom_1': 'bedroom 1',
  'bedroom 2': 'bedroom 2',
  'bedroom_2': 'bedroom 2'
};

// UI short labels for clean touch tiles
const SHORT_LABELS = {
  locations: {
    'front door': 'F Door',
    'back door': 'B Door',
    'landing area': 'Landing',
    'bedroom 1': 'Bedroom 1',
    'bedroom 2': 'Bedroom 2',
    'kitchen': 'Kitchen',
    'dining': 'Dining',
    'living': 'Living',
    'bathroom': 'Bathroom',
    'toilet': 'Toilet',
    'stairs': 'Stairs'
  },
  activities: {
    'operating TV': 'TV',
    'vacuuming living': 'Vacuum',
    'resting on the couch': 'Sit on couch',
    'resting or working on the couch': 'Sit on couch',
    'ventilating living': 'Window',
    'entering house': 'Enter',
    'exiting house': 'Exit',
    'climbing stairs': 'Ascending',
    'descending stairs': 'Descending',
    'transitioning at landing': 'Transit',
    'using bathroom': 'Bathroom',
    'ventilating bathroom': 'Ventilate',
    'using bedroom_1': 'Bedroom 1',
    'ventilating bedroom_1': 'Ventilate',
    'using bedroom_2': 'Bedroom 2',
    'ventilating bedroom_2': 'Ventilate',
    'using toilet': 'Toilet',
    'ventilating kitchen': 'Ventilate',
    'preparing hot drink': 'Hot drink',
    'using the fridge': 'Fridge',
    'operating dishwasher': 'Dishwasher',
    'operating washing machine': 'Wash machine',
    'preparing meal': 'Cooking',
    'transitioning at kitchen': 'Transit',
    'operating fan': 'Fan',
    'eating': 'Eating',
    'transitioning at dining': 'Transit'
  },
  interactions: {
    'solo': 'Solo',
    'collaborative': 'Collab',
    'assistive': 'Assisted'
  }
};

function loadAndValidateConfig() {
  const warnings = [];
  const errors = [];

  const scenarioPath = path.join(CONFIG_DIR, 'scenario.json');
  const locationsPath = path.join(CONFIG_DIR, 'locations.json');
  const activitiesPath = path.join(CONFIG_DIR, 'activities.json');
  const actLocPath = path.join(CONFIG_DIR, 'activities_location.json');

  let rawScenario, rawLocations, rawActivities, rawActLoc;

  try {
    rawScenario = tolerantJsonParse(fs.readFileSync(scenarioPath, 'utf8'), 'scenario.json');
  } catch (e) { errors.push(e.message); }

  try {
    rawLocations = tolerantJsonParse(fs.readFileSync(locationsPath, 'utf8'), 'locations.json');
  } catch (e) { errors.push(e.message); }

  try {
    rawActivities = tolerantJsonParse(fs.readFileSync(activitiesPath, 'utf8'), 'activities.json');
  } catch (e) { errors.push(e.message); }

  try {
    rawActLoc = tolerantJsonParse(fs.readFileSync(actLocPath, 'utf8'), 'activities_location.json');
  } catch (e) { errors.push(e.message); }

  if (errors.length > 0) {
    return { valid: false, errors, warnings, snapshot: null };
  }

  // 1. Validate Scenario
  const roles = Array.isArray(rawScenario.roles) ? rawScenario.roles : [];
  const residentNumber = rawScenario['resident number'] || roles.length;
  if (roles.length === 0) {
    errors.push('scenario.json has empty roles array');
  }
  if (roles.length !== residentNumber) {
    warnings.push(`resident number (${residentNumber}) does not match roles count (${roles.length})`);
  }

  // 2. Normalize Locations
  const locationMap = new Map();
  const normalizedLocationLookup = new Map();

  const locations = rawLocations.map((loc, idx) => {
    const rawName = loc.name || `Location ${loc.id ?? idx}`;
    const normName = normalizeKey(rawName);
    const resolvedName = ZONE_ALIASES[normName] || normName;
    const shortLabel = SHORT_LABELS.locations[normName] || SHORT_LABELS.locations[resolvedName] || rawName;

    const locObj = {
      id: typeof loc.id === 'number' ? loc.id : idx,
      name: rawName,
      normalizedName: resolvedName,
      shortLabel: shortLabel,
      description: loc.description || ''
    };

    locationMap.set(locObj.id, locObj);
    normalizedLocationLookup.set(resolvedName, locObj.id);
    normalizedLocationLookup.set(normName, locObj.id);
    return locObj;
  });

  // 3. Normalize Activities
  const activityMap = new Map();
  const activities = rawActivities.map((act, idx) => {
    const id = typeof act.id === 'number' ? act.id : idx;
    const name = act.name || `Activity ${id}`;
    const shortLabel = SHORT_LABELS.activities[name] || name;
    const allowedInteractions = normalizeAllowedInteractions(act, true);
    const canDoTogether = allowedInteractions.some(k => k !== 'solo');

    const actObj = {
      id,
      name,
      shortLabel,
      allowedInteractions,
      canDoTogether
    };
    activityMap.set(id, actObj);
    return actObj;
  });

  // 4. Map Activities to Locations
  const activityLocations = [];
  const locationActivitiesMap = {}; // locationId -> array of activity objects

  locations.forEach(l => {
    locationActivitiesMap[l.id] = [];
  });

  rawActLoc.forEach(entry => {
    const actId = entry.id;
    const rawZone = entry.zone;
    const normZone = normalizeKey(rawZone);
    const resolvedZone = ZONE_ALIASES[normZone] || normZone;

    let targetLocationId = null;
    if (typeof entry.location_id === 'number') {
      targetLocationId = entry.location_id;
    } else if (normalizedLocationLookup.has(resolvedZone)) {
      targetLocationId = normalizedLocationLookup.get(resolvedZone);
    } else if (normalizedLocationLookup.has(normZone)) {
      targetLocationId = normalizedLocationLookup.get(normZone);
    }

    if (targetLocationId !== null && locationMap.has(targetLocationId)) {
      const baseAct = activityMap.get(actId);
      const hasExplicitEntryRules =
        Array.isArray(entry.allowedInteractions) ||
        Array.isArray(entry.allowed_interactions) ||
        typeof entry.canDoTogether === 'boolean' ||
        typeof entry.can_do_together === 'boolean';
      const allowedInteractions = hasExplicitEntryRules
        ? normalizeAllowedInteractions(entry, true)
        : (baseAct?.allowedInteractions || normalizeAllowedInteractions(entry, true));
      const act = baseAct
        ? {
            ...baseAct,
            allowedInteractions,
            canDoTogether: allowedInteractions.some(k => k !== 'solo')
          }
        : {
            id: actId,
            name: entry.name,
            shortLabel: SHORT_LABELS.activities[entry.name] || entry.name,
            allowedInteractions,
            canDoTogether: allowedInteractions.some(k => k !== 'solo')
          };
      activityLocations.push({
        activityId: actId,
        locationId: targetLocationId,
        activityName: act.name,
        locationName: locationMap.get(targetLocationId).name
      });
      if (!locationActivitiesMap[targetLocationId].some(a => a.id === actId)) {
        locationActivitiesMap[targetLocationId].push(act);
      }
    } else {
      warnings.push(`Activity id ${actId} ("${entry.name}") references unmapped zone "${rawZone}"`);
    }
  });

  const { snapshot, hash } = buildSnapshotWithHash({
    residentNumber,
    roles,
    locations,
    activities,
    activityLocations,
    locationActivitiesMap
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    hash,
    snapshot
  };
}

const ROLE_NAME_RE = /^[A-Za-z0-9_-]{1,32}$/;

function buildSnapshotWithHash({
  residentNumber,
  roles,
  locations,
  activities,
  activityLocations,
  locationActivitiesMap
}) {
  const interactions = roles.length >= 2
    ? [
        { key: 'solo', label: 'Solo', shortLabel: 'Solo', requiresPerson: false },
        { key: 'collaborative', label: 'Collaborative', shortLabel: 'Collab', requiresPerson: true },
        { key: 'assistive', label: 'Assistive', shortLabel: 'Assisted', requiresPerson: true }
      ]
    : [
        { key: 'solo', label: 'Solo', shortLabel: 'Solo', requiresPerson: false }
      ];

  const snapshot = {
    schemaVersion: 2,
    loadedAt: new Date().toISOString(),
    residentNumber,
    roles,
    locations,
    activities,
    activityLocations,
    locationActivitiesMap,
    interactions
  };

  const serialized = JSON.stringify(snapshot, Object.keys(snapshot).sort());
  const hash = crypto.createHash('sha256').update(serialized).digest('hex');
  snapshot.hash = hash;
  return { snapshot, hash };
}

/**
 * Validates and builds a normalized ConfigSnapshot for an admin-created environment.
 */
function buildEnvironmentConfig(input) {
  const errors = [];
  const warnings = [];
  const body = input && typeof input === 'object' ? input : {};

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 2 || name.length > 64) {
    errors.push('Environment name must be between 2 and 64 characters');
  }

  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 240) : '';

  const rawRoles = Array.isArray(body.roles) ? body.roles : [];
  const roles = [];
  const seenRoles = new Set();
  for (const r of rawRoles) {
    const roleStr = typeof r === 'string' ? r.trim() : '';
    if (!roleStr) continue;
    if (!ROLE_NAME_RE.test(roleStr)) {
      errors.push(`Role "${roleStr}" must be 1–32 characters using only letters, numbers, underscores, or hyphens`);
      continue;
    }
    if (seenRoles.has(roleStr.toLowerCase())) {
      warnings.push(`Duplicate role "${roleStr}" ignored`);
      continue;
    }
    seenRoles.add(roleStr.toLowerCase());
    roles.push(roleStr);
  }
  if (roles.length === 0) {
    errors.push('At least 1 participant role is required');
  } else if (roles.length > 12) {
    errors.push('Maximum of 12 participant roles per environment');
  }

  const rawLocations = Array.isArray(body.locations) ? body.locations : [];
  if (rawLocations.length === 0) {
    errors.push('At least 1 location/room is required');
  } else if (rawLocations.length > 40) {
    errors.push('Maximum of 40 locations per environment');
  }

  const locations = [];
  const activities = [];
  const activityByNorm = new Map();
  const activityLocations = [];
  const locationActivitiesMap = {};
  const seenLocations = new Set();

  rawLocations.forEach((rawLoc, locIdx) => {
    const locName = typeof rawLoc?.name === 'string' ? rawLoc.name.trim() : '';
    if (!locName || locName.length > 64) {
      errors.push(`Location #${locIdx + 1} must have a name between 1 and 64 characters`);
      return;
    }
    const normLoc = ZONE_ALIASES[normalizeKey(locName)] || normalizeKey(locName);
    if (seenLocations.has(normLoc)) {
      errors.push(`Duplicate location "${locName}"`);
      return;
    }
    seenLocations.add(normLoc);

    const shortLabelRaw = typeof rawLoc?.shortLabel === 'string' ? rawLoc.shortLabel.trim() : '';
    const shortLabel = (shortLabelRaw || SHORT_LABELS.locations[normLoc] || locName).slice(0, 32);
    const locId = locations.length;

    const locObj = {
      id: locId,
      name: locName,
      normalizedName: normLoc,
      shortLabel,
      description: typeof rawLoc?.description === 'string' ? rawLoc.description.trim().slice(0, 120) : ''
    };
    locations.push(locObj);
    locationActivitiesMap[locId] = [];

    const rawActs = Array.isArray(rawLoc?.activities) ? rawLoc.activities : [];
    if (rawActs.length === 0) {
      errors.push(`Location "${locName}" must include at least 1 activity`);
      return;
    }
    if (rawActs.length > 30) {
      errors.push(`Location "${locName}" cannot exceed 30 activities`);
      return;
    }

    const seenActsInLoc = new Set();
    rawActs.forEach(rawAct => {
      const actName = typeof rawAct === 'string'
        ? rawAct.trim()
        : (typeof rawAct?.name === 'string' ? rawAct.name.trim() : '');
      if (!actName || actName.length > 64) {
        errors.push(`Invalid activity name in location "${locName}"`);
        return;
      }
      const normAct = normalizeKey(actName);
      if (seenActsInLoc.has(normAct)) return;
      seenActsInLoc.add(normAct);

      const actAllowedInteractions = typeof rawAct === 'object'
        ? normalizeAllowedInteractions(rawAct, true)
        : [...ALL_INTERACTION_KEYS];
      const actCanDoTogether = actAllowedInteractions.some(k => k !== 'solo');

      let actObj = activityByNorm.get(normAct);
      if (!actObj) {
        const actShortRaw = typeof rawAct === 'object' && typeof rawAct?.shortLabel === 'string'
          ? rawAct.shortLabel.trim()
          : '';
        actObj = {
          id: activities.length,
          name: actName,
          shortLabel: (actShortRaw || SHORT_LABELS.activities[actName] || actName).slice(0, 32),
          allowedInteractions: [...actAllowedInteractions],
          canDoTogether: actCanDoTogether
        };
        activities.push(actObj);
        activityByNorm.set(normAct, actObj);
      } else {
        const merged = ALL_INTERACTION_KEYS.filter(
          k => actObj.allowedInteractions.includes(k) || actAllowedInteractions.includes(k)
        );
        actObj.allowedInteractions = merged;
        actObj.canDoTogether = merged.some(k => k !== 'solo');
      }

      locationActivitiesMap[locId].push({
        id: actObj.id,
        name: actObj.name,
        shortLabel: actObj.shortLabel,
        allowedInteractions: [...actAllowedInteractions],
        canDoTogether: actCanDoTogether
      });
      activityLocations.push({
        activityId: actObj.id,
        locationId: locId,
        activityName: actObj.name,
        locationName: locObj.name
      });
    });
  });

  if (errors.length > 0) {
    return { valid: false, errors, warnings, name, description, hash: null, snapshot: null };
  }

  const { snapshot, hash } = buildSnapshotWithHash({
    residentNumber: roles.length,
    roles,
    locations,
    activities,
    activityLocations,
    locationActivitiesMap
  });

  return {
    valid: true,
    errors: [],
    warnings,
    name,
    description,
    hash,
    snapshot
  };
}

/**
 * Builds a clean, portable JSON export for a saved environment,
 * including both unified schema and PRD-compatible split structures.
 */
function buildEnvironmentExportPayload(env) {
  const snap = env?.snapshot || {};
  const roles = Array.isArray(snap.roles) ? snap.roles : [];
  const locations = Array.isArray(snap.locations) ? snap.locations : [];
  const activities = Array.isArray(snap.activities) ? snap.activities : [];
  const locActsMap = snap.locationActivitiesMap || {};
  const activityLocations = Array.isArray(snap.activityLocations) ? snap.activityLocations : [];

  const structuredLocations = locations.map(loc => ({
    id: loc.id,
    name: loc.name,
    shortLabel: loc.shortLabel || loc.name,
    description: loc.description || '',
    activities: (locActsMap[loc.id] || []).map(act => {
      const allowedInteractions = normalizeAllowedInteractions(act, true);
      return {
        id: act.id,
        name: act.name,
        shortLabel: act.shortLabel || act.name,
        allowedInteractions,
        canDoTogether: allowedInteractions.some(k => k !== 'solo')
      };
    })
  }));

  return {
    format: 'smarthouse-environment-v1',
    exportedAt: new Date().toISOString(),
    name: env.name || 'Imported Environment',
    description: env.description || '',
    roles,
    locations: structuredLocations,
    prdFiles: {
      scenario: {
        'resident number': roles.length,
        roles
      },
      locations: locations.map(l => ({
        id: l.id,
        name: l.name,
        description: l.description || ''
      })),
      activities: activities.map(a => {
        const allowedInteractions = normalizeAllowedInteractions(a, true);
        return {
          id: a.id,
          name: a.name,
          allowedInteractions,
          canDoTogether: allowedInteractions.some(k => k !== 'solo')
        };
      }),
      activities_location: activityLocations.length > 0
        ? activityLocations.map(al => ({
            id: al.activityId,
            name: al.activityName,
            zone: al.locationName,
            location_id: al.locationId
          }))
        : structuredLocations.flatMap(loc =>
            loc.activities.map(act => ({
              id: act.id,
              name: act.name,
              zone: loc.name,
              location_id: loc.id
            }))
          )
    }
  };
}

/**
 * Normalizes any supported Environment JSON upload shape into a draft input
 * for buildEnvironmentConfig().
 */
function parseEnvironmentImportPayload(rawInput, fallbackName = '') {
  const data = rawInput && typeof rawInput === 'object' ? rawInput : {};
  const cleanFallback = typeof fallbackName === 'string' && fallbackName.trim()
    ? fallbackName.trim()
    : 'Imported Environment';

  // Case A: Saved Environment record or Snapshot with locationActivitiesMap
  const snap = data.snapshot && typeof data.snapshot === 'object'
    ? data.snapshot
    : (data.locationActivitiesMap ? data : null);
  if (snap && Array.isArray(snap.locations) && Array.isArray(snap.roles)) {
    return {
      name: (typeof data.name === 'string' && data.name.trim()) ? data.name.trim() : cleanFallback,
      description: typeof data.description === 'string' ? data.description.trim() : '',
      roles: snap.roles,
      locations: snap.locations.map(loc => ({
        name: loc.name,
        shortLabel: loc.shortLabel || loc.name,
        description: loc.description || '',
        activities: (snap.locationActivitiesMap?.[loc.id] || []).map(a => {
          const allowedInteractions = normalizeAllowedInteractions(a, true);
          return {
            name: a.name,
            shortLabel: a.shortLabel || a.name,
            allowedInteractions,
            canDoTogether: allowedInteractions.some(k => k !== 'solo')
          };
        })
      }))
    };
  }

  // Case B: Portable smarthouse-environment-v1 or simplified { name, roles, locations: [{ name, activities }] }
  if (Array.isArray(data.locations) && Array.isArray(data.roles) &&
      data.locations.some(l => Array.isArray(l?.activities))) {
    return {
      name: (typeof data.name === 'string' && data.name.trim()) ? data.name.trim() : cleanFallback,
      description: typeof data.description === 'string' ? data.description.trim() : '',
      roles: data.roles,
      locations: data.locations.map(loc => ({
        name: loc.name,
        shortLabel: loc.shortLabel || loc.name,
        description: loc.description || '',
        activities: Array.isArray(loc.activities) ? loc.activities : []
      }))
    };
  }

  // Case C: Classic PRD split structure inside wrapper or top-level (scenario + locations + activities_location)
  const src = data.prdFiles && typeof data.prdFiles === 'object' ? data.prdFiles : data;
  if (src.scenario && Array.isArray(src.locations) && Array.isArray(src.activities_location)) {
    const roles = Array.isArray(src.scenario.roles) ? src.scenario.roles : [];
    const locMap = new Map();
    const normMap = new Map();
    const mappedLocations = src.locations.map((loc, idx) => {
      const id = typeof loc.id === 'number' ? loc.id : idx;
      const item = {
        id,
        name: loc.name || `Location ${id}`,
        shortLabel: loc.shortLabel || SHORT_LABELS.locations[normalizeKey(loc.name)] || loc.name || `Location ${id}`,
        description: loc.description || '',
        activities: []
      };
      locMap.set(id, item);
      const norm = ZONE_ALIASES[normalizeKey(item.name)] || normalizeKey(item.name);
      normMap.set(norm, item);
      normMap.set(normalizeKey(item.name), item);
      return item;
    });

    const actInfo = new Map();
    if (Array.isArray(src.activities)) {
      src.activities.forEach(a => {
        if (a && typeof a.name === 'string') {
          const allowedInteractions = normalizeAllowedInteractions(a, true);
          actInfo.set(a.id, {
            name: a.name,
            allowedInteractions,
            canDoTogether: allowedInteractions.some(k => k !== 'solo')
          });
        }
      });
    }

    src.activities_location.forEach(entry => {
      const target = typeof entry.location_id === 'number'
        ? locMap.get(entry.location_id)
        : normMap.get(ZONE_ALIASES[normalizeKey(entry.zone)] || normalizeKey(entry.zone));
      const meta = actInfo.get(entry.id);
      const actName = entry.name || meta?.name;
      const hasEntryOverride =
        Array.isArray(entry.allowedInteractions) ||
        Array.isArray(entry.allowed_interactions) ||
        typeof entry.canDoTogether === 'boolean' ||
        typeof entry.can_do_together === 'boolean';
      const allowedInteractions = hasEntryOverride
        ? normalizeAllowedInteractions(entry, true)
        : (meta ? meta.allowedInteractions : normalizeAllowedInteractions(entry, true));
      if (target && actName && !target.activities.some(a => a.name === actName)) {
        target.activities.push({
          name: actName,
          shortLabel: SHORT_LABELS.activities[actName] || actName,
          allowedInteractions,
          canDoTogether: allowedInteractions.some(k => k !== 'solo')
        });
      }
    });

    return {
      name: (typeof data.name === 'string' && data.name.trim()) ? data.name.trim() : cleanFallback,
      description: typeof data.description === 'string' ? data.description.trim() : '',
      roles,
      locations: mappedLocations
    };
  }

  return data;
}

module.exports = {
  loadAndValidateConfig,
  buildEnvironmentConfig,
  buildEnvironmentExportPayload,
  parseEnvironmentImportPayload
};
```

### File 10: `server/security.js`
```js
const crypto = require('crypto');

const SESSION_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (persisted in database)

// ==========================================================================
// 1. CRYPTOGRAPHIC PASSWORD & SESSION TOKEN UTILITIES
// ==========================================================================

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { hash: derived, salt };
}

function verifyPassword(password, storedHash, salt) {
  if (!password || !storedHash || !salt) return false;
  try {
    const derived = crypto.scryptSync(String(password), salt, 64);
    const expected = Buffer.from(storedHash, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return cookies;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      cookies[key] = decodeURIComponent(val);
    } catch {
      cookies[key] = val;
    }
  }
  return cookies;
}

// ==========================================================================
// 2. SECURITY HEADERS & CORS ALLOWLIST MIDDLEWARE
// ==========================================================================

function securityHeadersMiddleware(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' http://localhost:* https://localhost:* http://127.0.0.1:* https://127.0.0.1:* http://192.168.*:* http://10.*:*; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

function createAllowedOriginsSet(port, extraOrigins = []) {
  const os = require('os');
  const origins = new Set([
    `http://localhost:${port}`,
    `https://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    `https://127.0.0.1:${port}`,
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ]);

  if (!process.env.VERCEL) {
    const nets = os.networkInterfaces();
    for (const k of Object.keys(nets)) {
      for (const n of nets[k] || []) {
        if (n.family === 'IPv4' && !n.internal) {
          origins.add(`http://${n.address}:${port}`);
          origins.add(`https://${n.address}:${port}`);
        }
      }
    }
  }

  for (const host of [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
  ]) {
    if (host && host.trim()) {
      const clean = host.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
      origins.add(`https://${clean}`);
    }
  }

  if (process.env.PUBLIC_URL) {
    origins.add(process.env.PUBLIC_URL.trim().replace(/\/$/, ''));
  }

  for (const o of extraOrigins) {
    if (o && o.trim()) origins.add(o.trim());
  }

  return origins;
}

function createCorsOptions(port) {
  const extra = (process.env.ALLOWED_ORIGINS || '').split(',');
  const allowed = createAllowedOriginsSet(port, extra);

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowed.has(origin)) return callback(null, true);
      return callback(new Error('CORS policy: Origin not allowed'));
    },
    credentials: true
  };
}

// ==========================================================================
// 3. SLIDING-WINDOW RATE LIMITER
// ==========================================================================

function createRateLimiter({ windowMs, maxRequests, keyPrefix = 'rl', message = 'Too many requests. Please slow down.' }) {
  const store = new Map();

  const cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, timestamps] of store.entries()) {
      const fresh = timestamps.filter(ts => ts > cutoff);
      if (fresh.length === 0) store.delete(key);
      else store.set(key, fresh);
    }
  }, Math.max(30000, windowMs));
  cleanupTimer.unref?.();

  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    const cutoff = now - windowMs;

    const prev = (store.get(key) || []).filter(ts => ts > cutoff);
    if (prev.length >= maxRequests) {
      res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({ error: message });
    }
    prev.push(now);
    store.set(key, prev);
    next();
  };
}

// ==========================================================================
// 4. STRICT SCHEMA & BUSINESS-LOGIC VALIDATORS
// ==========================================================================

function validateSessionId(sessionId) {
  if (typeof sessionId !== 'string') {
    return { valid: false, error: 'Session ID must be a string' };
  }
  const trimmed = sessionId.trim();
  if (!SESSION_ID_RE.test(trimmed)) {
    return {
      valid: false,
      error: 'Session ID must be 1–64 characters using only letters, numbers, underscores, or hyphens'
    };
  }
  return { valid: true, value: trimmed };
}

function validateIsoTimestamp(val, fieldName) {
  if (typeof val !== 'string' || !val.trim()) {
    return { valid: false, error: `${fieldName} is required and must be a valid ISO timestamp` };
  }
  const ms = Date.parse(val);
  if (Number.isNaN(ms)) {
    return { valid: false, error: `${fieldName} is not a valid ISO timestamp` };
  }
  const now = Date.now();
  if (ms > now + 24 * 60 * 60 * 1000 || ms < Date.UTC(2020, 0, 1)) {
    return { valid: false, error: `${fieldName} is out of acceptable time range` };
  }
  return { valid: true, ms, iso: new Date(ms).toISOString() };
}

function validateAnnotationPayload(body, snapshot, verifiedParticipant = null) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const clientUuid = typeof body.client_uuid === 'string' ? body.client_uuid.trim() : '';
  if (!clientUuid || clientUuid.length > 128) {
    return { valid: false, error: 'client_uuid must be a non-empty string (<= 128 chars)' };
  }

  const sessCheck = validateSessionId(body.session_id);
  if (!sessCheck.valid) {
    return { valid: false, error: sessCheck.error };
  }

  const participant = verifiedParticipant || (typeof body.participant === 'string' ? body.participant.trim() : '');
  const allowedRoles = Array.isArray(snapshot?.roles) ? snapshot.roles : [];
  if (!participant || !allowedRoles.includes(participant)) {
    return { valid: false, error: 'Invalid or unrecognized participant role' };
  }

  const tsStarted = validateIsoTimestamp(body.timestamp_started, 'timestamp_started');
  if (!tsStarted.valid) return tsStarted;

  const tsSubmitted = validateIsoTimestamp(body.timestamp_submitted, 'timestamp_submitted');
  if (!tsSubmitted.valid) return tsSubmitted;

  if (tsStarted.ms > tsSubmitted.ms + 5000) {
    return { valid: false, error: 'timestamp_started cannot be after timestamp_submitted' };
  }

  const locId = Number(body.location_id);
  const locObj = Array.isArray(snapshot?.locations)
    ? snapshot.locations.find(l => Number(l.id) === locId)
    : null;
  if (!locObj) {
    return { valid: false, error: 'Invalid location_id for session configuration' };
  }

  const validActsForLoc = snapshot?.locationActivitiesMap?.[locObj.id] || snapshot?.activities || [];
  const actId = Number(body.activity_id);
  const actObj = validActsForLoc.find(a => Number(a.id) === actId);
  if (!actObj) {
    return { valid: false, error: 'Invalid activity_id for the chosen location' };
  }

  const interactionKey = typeof body.interaction === 'string' ? body.interaction.trim() : '';
  const interObj = Array.isArray(snapshot?.interactions)
    ? snapshot.interactions.find(i => i.key === interactionKey || i.name === interactionKey)
    : null;
  if (!interObj) {
    return { valid: false, error: 'Invalid interaction type' };
  }

  const allowedForAct = Array.isArray(actObj.allowedInteractions) && actObj.allowedInteractions.length > 0
    ? actObj.allowedInteractions
    : (actObj.canDoTogether === false ? ['solo'] : ['solo', 'collaborative', 'assistive']);

  if (!allowedForAct.includes(interObj.key)) {
    return {
      valid: false,
      error: `Interaction "${interObj.shortLabel || interObj.key}" is not enabled for activity "${actObj.name}"`
    };
  }

  let otherPerson = '';
  if (interObj.requiresPerson) {
    otherPerson = typeof body.other_person === 'string' ? body.other_person.trim() : '';
    if (!otherPerson || !allowedRoles.includes(otherPerson)) {
      return { valid: false, error: 'A valid collaborating resident must be selected for this interaction' };
    }
    if (otherPerson === participant) {
      return { valid: false, error: 'Participant cannot select themselves as a collaborator' };
    }
  }

  return {
    valid: true,
    data: {
      client_uuid: clientUuid,
      session_id: sessCheck.value,
      participant,
      timestamp_started: tsStarted.iso,
      timestamp_submitted: tsSubmitted.iso,
      location_id: locObj.id,
      location: locObj.name,
      activity_id: actObj.id,
      activity: actObj.name,
      interaction: interObj.key,
      other_person: otherPerson,
      edited: Boolean(body.edited)
    }
  };
}

module.exports = {
  TOKEN_TTL_MS,
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  parseCookies,
  securityHeadersMiddleware,
  createCorsOptions,
  createRateLimiter,
  validateSessionId,
  validateAnnotationPayload
};
```

### File 11: `server/database.js`
```js
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { hashPassword, generateToken } = require('./security');

const DATABASE_URL = typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.trim()
  ? process.env.DATABASE_URL.trim()
  : '';
const IS_POSTGRES = Boolean(DATABASE_URL);

// Schema-level isolation for PostgreSQL: defaults to 'annotator_v2' on Vercel so data can never mix with 'public'.
const RAW_SCHEMA = typeof process.env.PG_SCHEMA === 'string' ? process.env.PG_SCHEMA.trim() : '';
const PG_SCHEMA = RAW_SCHEMA || (process.env.VERCEL ? 'annotator_v2' : 'public');
if (IS_POSTGRES && !/^[a-z_][a-z0-9_]{0,40}$/.test(PG_SCHEMA)) {
  throw new Error(`Invalid PG_SCHEMA "${PG_SCHEMA}". Must match /^[a-z_][a-z0-9_]{0,40}$/.`);
}

function tbl(name) {
  return IS_POSTGRES && PG_SCHEMA !== 'public' ? `"${PG_SCHEMA}".${name}` : name;
}

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data');

let sqliteDb = null;
let pgPool = null;
let sqliteTxChain = Promise.resolve();
const sqliteStmtCache = new Map();

function convertPlaceholders(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

function createSqliteExecutor(connection) {
  const prepare = sql => {
    let stmt = sqliteStmtCache.get(sql);
    if (!stmt) {
      stmt = connection.prepare(sql);
      sqliteStmtCache.set(sql, stmt);
    }
    return stmt;
  };
  return {
    async all(sql, params = []) {
      return prepare(sql).all(...params);
    },
    async get(sql, params = []) {
      return prepare(sql).get(...params) || null;
    },
    async run(sql, params = []) {
      const info = prepare(sql).run(...params);
      return { changes: Number(info?.changes || 0) };
    }
  };
}

function createPgExecutor(querier) {
  return {
    async all(sql, params = []) {
      const res = await querier.query(convertPlaceholders(sql), params);
      return res.rows || [];
    },
    async get(sql, params = []) {
      const res = await querier.query(convertPlaceholders(sql), params);
      return res.rows && res.rows[0] ? res.rows[0] : null;
    },
    async run(sql, params = []) {
      const res = await querier.query(convertPlaceholders(sql), params);
      return { changes: Number(res.rowCount || 0) };
    }
  };
}

let rootExec = null;
let initPromise = null;

function buildSchemaStatements(isPg) {
  const autoPk = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';

  return [
    `CREATE TABLE IF NOT EXISTS ${tbl('sessions')} (
      id TEXT PRIMARY KEY,
      config_hash TEXT NOT NULL,
      config_snapshot TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      timezone TEXT NOT NULL DEFAULT 'UTC',
      started_at TEXT NOT NULL,
      ended_at TEXT,
      strict_session_lock INTEGER NOT NULL DEFAULT 0,
      environment_id TEXT DEFAULT 'default-smart-house',
      environment_name TEXT DEFAULT 'Default Smart House'
    )`,
    `CREATE TABLE IF NOT EXISTS ${tbl('annotations')} (
      id ${autoPk},
      client_uuid TEXT UNIQUE NOT NULL,
      session_id TEXT NOT NULL,
      participant TEXT NOT NULL,
      seq INTEGER NOT NULL,
      timestamp_started TEXT NOT NULL,
      timestamp_submitted TEXT NOT NULL,
      timestamp_received TEXT NOT NULL,
      location_id INTEGER NOT NULL,
      location TEXT NOT NULL,
      activity_id INTEGER NOT NULL,
      activity TEXT NOT NULL,
      interaction TEXT NOT NULL,
      other_person TEXT,
      edited INTEGER NOT NULL DEFAULT 0,
      config_version TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES ${tbl('sessions')}(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_annotations_session_participant ON ${tbl('annotations')}(session_id, participant)`,
    `CREATE INDEX IF NOT EXISTS idx_annotations_ts ON ${tbl('annotations')}(timestamp_submitted)`,
    `CREATE TABLE IF NOT EXISTS ${tbl('collaborator_locks')} (
      session_id TEXT NOT NULL,
      taken_person TEXT NOT NULL,
      taken_by TEXT NOT NULL,
      activity TEXT,
      locked_at TEXT NOT NULL,
      PRIMARY KEY (session_id, taken_person),
      FOREIGN KEY(session_id) REFERENCES ${tbl('sessions')}(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS ${tbl('admin_users')} (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      must_change_password INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS ${tbl('admin_sessions')} (
      token_hash TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(username) REFERENCES ${tbl('admin_users')}(username) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS ${tbl('participant_tokens')} (
      token TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      participant TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(session_id, participant),
      FOREIGN KEY(session_id) REFERENCES ${tbl('sessions')}(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS ${tbl('environments')} (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      config_hash TEXT NOT NULL,
      config_snapshot TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  ];
}

async function initializeDatabase() {
  if (IS_POSTGRES) {
    const isLocalPg = /@(localhost|127\.0\.0\.1)(:|\/)/i.test(DATABASE_URL);
    const disableSsl = /[?&]sslmode=disable/i.test(DATABASE_URL);
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: disableSsl || isLocalPg ? false : { rejectUnauthorized: false },
      max: process.env.VERCEL ? 5 : 10,
      idleTimeoutMillis: 30000
    });
    rootExec = createPgExecutor(pgPool);

    if (PG_SCHEMA !== 'public') {
      await pgPool.query(`CREATE SCHEMA IF NOT EXISTS "${PG_SCHEMA}"`);
    }

    for (const ddl of buildSchemaStatements(true)) {
      await pgPool.query(ddl);
    }

    const pgMigrations = [
      `ALTER TABLE ${tbl('sessions')} ADD COLUMN IF NOT EXISTS strict_session_lock INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE ${tbl('sessions')} ADD COLUMN IF NOT EXISTS environment_id TEXT DEFAULT 'default-smart-house'`,
      `ALTER TABLE ${tbl('sessions')} ADD COLUMN IF NOT EXISTS environment_name TEXT DEFAULT 'Default Smart House'`
    ];
    for (const sql of pgMigrations) {
      await pgPool.query(sql);
    }
    console.log(`[Database] Connected to PostgreSQL (schema "${PG_SCHEMA}").`);
  } else {
    if (process.env.VERCEL) {
      throw new Error(
        'DATABASE_URL environment variable is required when running on Vercel (local SQLite files are ephemeral in serverless functions).'
      );
    }
    const { DatabaseSync } = require('node:sqlite');
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const dbPath = path.join(DATA_DIR, 'smart_house_annotator.db');
    sqliteDb = new DatabaseSync(dbPath);
    sqliteDb.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    rootExec = createSqliteExecutor(sqliteDb);

    for (const ddl of buildSchemaStatements(false)) {
      sqliteDb.exec(ddl);
    }

    const sqliteMigrations = [
      `ALTER TABLE ${tbl('sessions')} ADD COLUMN strict_session_lock INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE ${tbl('sessions')} ADD COLUMN environment_id TEXT DEFAULT 'default-smart-house'`,
      `ALTER TABLE ${tbl('sessions')} ADD COLUMN environment_name TEXT DEFAULT 'Default Smart House'`
    ];
    for (const sql of sqliteMigrations) {
      try {
        sqliteDb.exec(sql);
      } catch {
        // Column already exists
      }
    }
    console.log(`[Database] Using local SQLite database at ${dbPath}`);
  }

  // Seed default researcher admin account on first boot if none exists
  const adminCountRow = await rootExec.get(`SELECT COUNT(*) AS cnt FROM ${tbl('admin_users')}`);
  const adminCount = Number(adminCountRow?.cnt || 0);
  if (adminCount === 0) {
    const defaultUsername = (process.env.ADMIN_USERNAME || 'admin').trim();
    const defaultPassword = process.env.ADMIN_PASSWORD || 'SmartHouse@2026';
    const { hash, salt } = hashPassword(defaultPassword);
    await rootExec.run(
      `INSERT INTO ${tbl('admin_users')} (username, password_hash, salt, must_change_password, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (username) DO NOTHING`,
      [
        defaultUsername,
        hash,
        salt,
        process.env.ADMIN_PASSWORD ? 0 : 1,
        new Date().toISOString()
      ]
    );
    console.log(
      `[Auth] Seeded initial admin user "${defaultUsername}".${
        process.env.ADMIN_PASSWORD ? '' : ' Change default password after first login.'
      }`
    );
  }
}

async function ensureReady() {
  if (!initPromise) {
    initPromise = initializeDatabase().catch(err => {
      initPromise = null;
      throw err;
    });
  }
  await initPromise;
}

async function inTransaction(fn) {
  await ensureReady();
  if (IS_POSTGRES) {
    const client = await pgPool.connect();
    const txExec = createPgExecutor(client);
    try {
      await client.query('BEGIN');
      const result = await fn(txExec);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Ignore rollback failure
      }
      throw err;
    } finally {
      client.release();
    }
  }

  const runTx = async () => {
    const txExec = createSqliteExecutor(sqliteDb);
    sqliteDb.exec('BEGIN IMMEDIATE');
    try {
      const result = await fn(txExec);
      sqliteDb.exec('COMMIT');
      return result;
    } catch (err) {
      try {
        sqliteDb.exec('ROLLBACK');
      } catch {
        // Already rolled back
      }
      throw err;
    }
  };

  const next = sqliteTxChain.then(runTx, runTx);
  sqliteTxChain = next.catch(() => {});
  return next;
}

function mapEnvironmentRow(row) {
  if (!row) return null;
  let snapshot = null;
  try {
    snapshot = JSON.parse(row.config_snapshot);
  } catch {
    snapshot = null;
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    config_hash: row.config_hash,
    is_default: Boolean(row.is_default),
    created_at: row.created_at,
    updated_at: row.updated_at,
    snapshot
  };
}

module.exports = {
  async init() {
    await ensureReady();
  },

  getStorageInfo() {
    return {
      engine: IS_POSTGRES ? 'postgresql' : 'sqlite',
      persistent: IS_POSTGRES || Boolean(process.env.DATA_DIR),
      schema: IS_POSTGRES ? PG_SCHEMA : undefined
    };
  },

  async ping() {
    await ensureReady();
    await rootExec.get('SELECT 1 AS ok');
    return true;
  },

  async ensureDefaultEnvironment(configHash, configSnapshot) {
    await ensureReady();
    const now = new Date().toISOString();
    await rootExec.run(
      `INSERT INTO ${tbl('environments')} (id, name, description, config_hash, config_snapshot, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         config_hash = excluded.config_hash,
         config_snapshot = excluded.config_snapshot,
         updated_at = excluded.updated_at`,
      [
        'default-smart-house',
        'Default Smart House',
        'Built-in PRD Smart House configuration (3 residents, 11 rooms)',
        configHash,
        JSON.stringify(configSnapshot),
        now,
        now
      ]
    );
    return rootExec.get(`SELECT * FROM ${tbl('environments')} WHERE id = ?`, ['default-smart-house']);
  },

  async listEnvironments() {
    await ensureReady();
    const rows = await rootExec.all(
      `SELECT id, name, description, config_hash, config_snapshot, is_default, created_at, updated_at FROM ${tbl('environments')} ORDER BY is_default DESC, created_at DESC`
    );
    return rows.map(mapEnvironmentRow);
  },

  async getEnvironment(id) {
    await ensureReady();
    const row = await rootExec.get(`SELECT * FROM ${tbl('environments')} WHERE id = ?`, [id]);
    return mapEnvironmentRow(row);
  },

  async createEnvironment({ id, name, description = '', configHash, configSnapshot }) {
    await ensureReady();
    const now = new Date().toISOString();
    await rootExec.run(
      `INSERT INTO ${tbl('environments')} (id, name, description, config_hash, config_snapshot, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, name, description, configHash, JSON.stringify(configSnapshot), now, now]
    );
    return this.getEnvironment(id);
  },

  async deleteEnvironment(id) {
    await ensureReady();
    const info = await rootExec.run(`DELETE FROM ${tbl('environments')} WHERE id = ? AND is_default = 0`, [id]);
    return { deleted: info.changes > 0, id };
  },

  async getSession(id) {
    await ensureReady();
    return rootExec.get(`SELECT * FROM ${tbl('sessions')} WHERE id = ?`, [id]);
  },

  async listSessions() {
    await ensureReady();
    return rootExec.all(
      `SELECT id, config_hash, status, timezone, started_at, ended_at, strict_session_lock, environment_id, environment_name FROM ${tbl('sessions')} ORDER BY started_at DESC`
    );
  },

  async getSessionSummaries() {
    await ensureReady();
    const aggExpr = IS_POSTGRES
      ? "STRING_AGG(DISTINCT a.participant, ',')"
      : 'GROUP_CONCAT(DISTINCT a.participant)';
    const rows = await rootExec.all(`
      SELECT
        s.id,
        s.status,
        s.timezone,
        s.started_at,
        s.ended_at,
        s.config_hash,
        COALESCE(s.environment_id, 'default-smart-house') AS environment_id,
        COALESCE(s.environment_name, 'Default Smart House') AS environment_name,
        (SELECT COUNT(*) FROM ${tbl('annotations')} a WHERE a.session_id = s.id) AS annotation_count,
        (SELECT ${aggExpr} FROM ${tbl('annotations')} a WHERE a.session_id = s.id) AS active_participants
      FROM ${tbl('sessions')} s
      ORDER BY s.started_at DESC
    `);
    return rows.map(r => ({
      ...r,
      annotation_count: Number(r.annotation_count || 0)
    }));
  },

  async createSession(
    id,
    configHash,
    configSnapshot,
    timezone = 'Europe/Paris',
    environmentId = 'default-smart-house',
    environmentName = 'Default Smart House'
  ) {
    await ensureReady();
    const startedAt = new Date().toISOString();
    await rootExec.run(
      `INSERT INTO ${tbl('sessions')} (id, config_hash, config_snapshot, status, timezone, started_at, environment_id, environment_name)
       VALUES (?, ?, ?, 'active', ?, ?, ?, ?)`,
      [id, configHash, JSON.stringify(configSnapshot), timezone, startedAt, environmentId, environmentName]
    );
    return this.getSession(id);
  },

  async startSession(id) {
    await ensureReady();
    await rootExec.run(`UPDATE ${tbl('sessions')} SET status = 'active', ended_at = NULL WHERE id = ?`, [id]);
    return this.getSession(id);
  },

  async stopSession(id) {
    await ensureReady();
    const endedAt = new Date().toISOString();
    await rootExec.run(`UPDATE ${tbl('sessions')} SET status = 'stopped', ended_at = ? WHERE id = ?`, [endedAt, id]);
    return this.getSession(id);
  },

  async endSession(id) {
    return this.stopSession(id);
  },

  async deleteSession(id) {
    await inTransaction(async tx => {
      await tx.run(`DELETE FROM ${tbl('participant_tokens')} WHERE session_id = ?`, [id]);
      await tx.run(`DELETE FROM ${tbl('collaborator_locks')} WHERE session_id = ?`, [id]);
      await tx.run(`DELETE FROM ${tbl('annotations')} WHERE session_id = ?`, [id]);
      await tx.run(`DELETE FROM ${tbl('sessions')} WHERE id = ?`, [id]);
    });
    return { success: true, id };
  },

  async setSessionLockPolicy(sessionId, strict) {
    await ensureReady();
    await rootExec.run(`UPDATE ${tbl('sessions')} SET strict_session_lock = ? WHERE id = ?`, [strict ? 1 : 0, sessionId]);
    const updated = await this.getSession(sessionId);
    return updated ? Boolean(updated.strict_session_lock) : false;
  },

  async getAdminUser(username) {
    await ensureReady();
    return rootExec.get(`SELECT * FROM ${tbl('admin_users')} WHERE username = ?`, [username]);
  },

  async updateAdminPassword(username, hash, salt) {
    await ensureReady();
    await rootExec.run(
      `UPDATE ${tbl('admin_users')} SET password_hash = ?, salt = ?, must_change_password = 0, updated_at = ? WHERE username = ?`,
      [hash, salt, new Date().toISOString(), username]
    );
    return this.getAdminUser(username);
  },

  async createAdminSession(tokenHash, username, ttlMs) {
    await ensureReady();
    const now = Date.now();
    await rootExec.run(`DELETE FROM ${tbl('admin_sessions')} WHERE expires_at <= ?`, [new Date(now).toISOString()]);
    const createdAt = new Date(now).toISOString();
    const expiresAt = new Date(now + ttlMs).toISOString();
    await rootExec.run(
      `INSERT INTO ${tbl('admin_sessions')} (token_hash, username, expires_at, created_at) VALUES (?, ?, ?, ?)`,
      [tokenHash, username, expiresAt, createdAt]
    );
    return { tokenHash, username, expiresAt };
  },

  async getAdminSession(tokenHash) {
    await ensureReady();
    if (!tokenHash) return null;
    const row = await rootExec.get(`SELECT * FROM ${tbl('admin_sessions')} WHERE token_hash = ?`, [tokenHash]);
    if (!row) return null;
    if (Date.parse(row.expires_at) <= Date.now()) {
      await rootExec.run(`DELETE FROM ${tbl('admin_sessions')} WHERE token_hash = ?`, [tokenHash]);
      return null;
    }
    return row;
  },

  async deleteAdminSession(tokenHash) {
    await ensureReady();
    if (tokenHash) {
      await rootExec.run(`DELETE FROM ${tbl('admin_sessions')} WHERE token_hash = ?`, [tokenHash]);
    }
  },

  async ensureParticipantTokens(sessionId, roles) {
    await ensureReady();
    const existing = await rootExec.all(`SELECT * FROM ${tbl('participant_tokens')} WHERE session_id = ?`, [sessionId]);
    const byRole = {};
    for (const row of existing) {
      byRole[row.participant] = row.token;
    }
    const now = new Date().toISOString();
    for (const role of roles) {
      if (!byRole[role]) {
        const tok = generateToken(24);
        await rootExec.run(
          `INSERT INTO ${tbl('participant_tokens')} (token, session_id, participant, created_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT DO NOTHING`,
          [tok, sessionId, role, now]
        );
        byRole[role] = tok;
      }
    }
    const finalRows = await rootExec.all(`SELECT * FROM ${tbl('participant_tokens')} WHERE session_id = ?`, [sessionId]);
    const result = {};
    for (const row of finalRows) {
      result[row.participant] = row.token;
    }
    return result;
  },

  async getParticipantToken(token) {
    await ensureReady();
    if (!token || typeof token !== 'string') return null;
    return rootExec.get(`SELECT * FROM ${tbl('participant_tokens')} WHERE token = ?`, [token.trim()]);
  },

  async getSessionLocks(_sessionId) {
    return [];
  },

  async releaseLock(sessionId, takenPerson) {
    await ensureReady();
    await rootExec.run(`DELETE FROM ${tbl('collaborator_locks')} WHERE session_id = ? AND taken_person = ?`, [sessionId, takenPerson]);
    return [];
  },

  async releaseAllLocks(sessionId) {
    await ensureReady();
    await rootExec.run(`DELETE FROM ${tbl('collaborator_locks')} WHERE session_id = ?`, [sessionId]);
    return [];
  },

  async saveAnnotation(data) {
    return inTransaction(async tx => {
      const selectSessionSql = IS_POSTGRES
        ? `SELECT * FROM ${tbl('sessions')} WHERE id = ? FOR UPDATE`
        : `SELECT * FROM ${tbl('sessions')} WHERE id = ?`;
      const session = await tx.get(selectSessionSql, [data.session_id]);
      if (!session) {
        const err = new Error(`Session "${data.session_id}" does not exist.`);
        err.statusCode = 404;
        throw err;
      }
      if (session.status !== 'active') {
        const err = new Error(
          `Session "${data.session_id}" is currently ${session.status.toUpperCase()}. Annotations cannot be submitted while the session is stopped.`
        );
        err.statusCode = 409;
        throw err;
      }

      const existing = await tx.get(`SELECT * FROM ${tbl('annotations')} WHERE client_uuid = ?`, [data.client_uuid]);
      if (existing) {
        return { row: existing, isDuplicate: true };
      }

      const otherPerson = data.other_person ? String(data.other_person).trim() : '';
      if (otherPerson && otherPerson === data.participant) {
        const err = new Error('Participant cannot select themselves as a collaborator.');
        err.statusCode = 400;
        throw err;
      }

      const seqRow = await tx.get(
        `SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq FROM ${tbl('annotations')} WHERE session_id = ? AND participant = ?`,
        [data.session_id, data.participant]
      );
      const nextSeq = Number(seqRow?.next_seq || 1);
      const tsReceived = new Date().toISOString();

      await tx.run(
        `INSERT INTO ${tbl('annotations')} (
          client_uuid, session_id, participant, seq,
          timestamp_started, timestamp_submitted, timestamp_received,
          location_id, location, activity_id, activity,
          interaction, other_person, edited, config_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.client_uuid,
          data.session_id,
          data.participant,
          nextSeq,
          data.timestamp_started,
          data.timestamp_submitted,
          tsReceived,
          data.location_id,
          data.location,
          data.activity_id,
          data.activity,
          data.interaction,
          otherPerson,
          data.edited ? 1 : 0,
          data.config_version
        ]
      );

      const saved = await tx.get(`SELECT * FROM ${tbl('annotations')} WHERE client_uuid = ?`, [data.client_uuid]);
      return { row: saved, isDuplicate: false };
    });
  },

  async getAnnotations(sessionId, participant = null) {
    await ensureReady();
    if (participant) {
      return rootExec.all(
        `SELECT * FROM ${tbl('annotations')} WHERE session_id = ? AND participant = ? ORDER BY timestamp_submitted ASC`,
        [sessionId, participant]
      );
    }
    return rootExec.all(
      `SELECT * FROM ${tbl('annotations')} WHERE session_id = ? ORDER BY timestamp_submitted ASC, participant ASC`,
      [sessionId]
    );
  },

  async exportBackup() {
    await ensureReady();
    const [environments, sessions, participant_tokens, annotations] = await Promise.all([
      rootExec.all(`SELECT * FROM ${tbl('environments')} ORDER BY is_default DESC, created_at ASC`),
      rootExec.all(`SELECT * FROM ${tbl('sessions')} ORDER BY started_at ASC`),
      rootExec.all(`SELECT * FROM ${tbl('participant_tokens')} ORDER BY created_at ASC`),
      rootExec.all(`SELECT * FROM ${tbl('annotations')} ORDER BY session_id ASC, seq ASC`)
    ]);

    return {
      format: 'smarthouse-backup-v1',
      exportedAt: new Date().toISOString(),
      storage: this.getStorageInfo(),
      data: {
        environments,
        sessions,
        participant_tokens,
        annotations
      }
    };
  },

  async restoreBackup(backupPayload) {
    if (!backupPayload || typeof backupPayload !== 'object' || backupPayload.format !== 'smarthouse-backup-v1') {
      const err = new Error('Invalid backup format. Expected "smarthouse-backup-v1" JSON file.');
      err.statusCode = 400;
      throw err;
    }
    const data = backupPayload.data;
    if (!data || typeof data !== 'object') {
      const err = new Error('Backup file is missing the "data" payload.');
      err.statusCode = 400;
      throw err;
    }

    const summary = {
      environmentsAdded: 0,
      sessionsAdded: 0,
      tokensAdded: 0,
      annotationsAdded: 0
    };

    await inTransaction(async tx => {
      const envs = Array.isArray(data.environments) ? data.environments : [];
      for (const env of envs) {
        if (!env || typeof env.id !== 'string' || !env.id.trim() || env.id === 'default-smart-house') continue;
        const snapshotStr = typeof env.config_snapshot === 'string'
          ? env.config_snapshot
          : JSON.stringify(env.config_snapshot || {});
        const res = await tx.run(
          `INSERT INTO ${tbl('environments')} (id, name, description, config_hash, config_snapshot, is_default, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO NOTHING`,
          [
            env.id.trim(),
            String(env.name || env.id),
            String(env.description || ''),
            String(env.config_hash || ''),
            snapshotStr,
            env.is_default ? 1 : 0,
            String(env.created_at || new Date().toISOString()),
            String(env.updated_at || new Date().toISOString())
          ]
        );
        summary.environmentsAdded += res.changes;
      }

      const sessions = Array.isArray(data.sessions) ? data.sessions : [];
      for (const s of sessions) {
        if (!s || typeof s.id !== 'string' || !s.id.trim()) continue;
        const snapshotStr = typeof s.config_snapshot === 'string'
          ? s.config_snapshot
          : JSON.stringify(s.config_snapshot || {});
        const res = await tx.run(
          `INSERT INTO ${tbl('sessions')} (id, config_hash, config_snapshot, status, timezone, started_at, ended_at, strict_session_lock, environment_id, environment_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO NOTHING`,
          [
            s.id.trim(),
            String(s.config_hash || ''),
            snapshotStr,
            s.status === 'stopped' ? 'stopped' : 'active',
            String(s.timezone || 'Europe/Paris'),
            String(s.started_at || new Date().toISOString()),
            s.ended_at ? String(s.ended_at) : null,
            s.strict_session_lock ? 1 : 0,
            String(s.environment_id || 'default-smart-house'),
            String(s.environment_name || 'Default Smart House')
          ]
        );
        summary.sessionsAdded += res.changes;
      }

      const validSessionRows = await tx.all(`SELECT id FROM ${tbl('sessions')}`);
      const validSessionIds = new Set(validSessionRows.map(r => r.id));

      const tokens = Array.isArray(data.participant_tokens) ? data.participant_tokens : [];
      for (const t of tokens) {
        if (!t || !t.token || !t.session_id || !t.participant || !validSessionIds.has(t.session_id)) continue;
        const res = await tx.run(
          `INSERT INTO ${tbl('participant_tokens')} (token, session_id, participant, created_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT DO NOTHING`,
          [
            String(t.token),
            String(t.session_id),
            String(t.participant),
            String(t.created_at || new Date().toISOString())
          ]
        );
        summary.tokensAdded += res.changes;
      }

      const annotations = Array.isArray(data.annotations) ? data.annotations : [];
      for (const a of annotations) {
        if (!a || !a.client_uuid || !a.session_id || !validSessionIds.has(a.session_id)) continue;
        const res = await tx.run(
          `INSERT INTO ${tbl('annotations')} (
            client_uuid, session_id, participant, seq,
            timestamp_started, timestamp_submitted, timestamp_received,
            location_id, location, activity_id, activity,
            interaction, other_person, edited, config_version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (client_uuid) DO NOTHING`,
          [
            String(a.client_uuid),
            String(a.session_id),
            String(a.participant),
            Number(a.seq || 1),
            String(a.timestamp_started || a.timestamp_submitted || new Date().toISOString()),
            String(a.timestamp_submitted || new Date().toISOString()),
            String(a.timestamp_received || new Date().toISOString()),
            Number(a.location_id || 0),
            String(a.location || ''),
            Number(a.activity_id || 0),
            String(a.activity || ''),
            String(a.interaction || 'solo'),
            String(a.other_person || ''),
            a.edited ? 1 : 0,
            String(a.config_version || '')
          ]
        );
        summary.annotationsAdded += res.changes;
      }
    });

    return summary;
  }
};
```

### File 12: `server/index.js`
```js
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const {
  loadAndValidateConfig,
  buildEnvironmentConfig,
  buildEnvironmentExportPayload,
  parseEnvironmentImportPayload
} = require('./configPipeline');
const db = require('./database');
const gitBackup = require('./gitBackup');
const { generateAnnotationsCsv } = require('./csvExport');
const {
  TOKEN_TTL_MS,
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  parseCookies,
  securityHeadersMiddleware,
  createCorsOptions,
  createRateLimiter,
  validateSessionId,
  validateAnnotationPayload
} = require('./security');

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const ADMIN_COOKIE_NAME = 'sh_admin_sid';
const IS_VERCEL = Boolean(process.env.VERCEL);

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(securityHeadersMiddleware);
app.use(cors(createCorsOptions(PORT)));

// Tight default JSON body limit (100kb), with scoped larger limit only for backup restore
const defaultJsonParser = express.json({ limit: '100kb' });
const backupJsonParser = express.json({ limit: '10mb' });
app.use((req, res, next) => {
  if (req.path === '/api/backup/restore') {
    return backupJsonParser(req, res, next);
  }
  return defaultJsonParser(req, res, next);
});

// Rate limiters
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  keyPrefix: 'auth',
  message: 'Too many authentication attempts. Please try again later.'
});

const apiWriteLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 180,
  keyPrefix: 'write',
  message: 'Write rate limit exceeded. Please slow down.'
});

// Cache config in memory
let cachedConfig = loadAndValidateConfig();

// Ensure DB & default environment are initialized once per serverless cold start (or server boot)
let bootstrapPromise = null;
function ensureAppReady() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await db.init();
      if (cachedConfig.valid) {
        await db.ensureDefaultEnvironment(cachedConfig.hash, cachedConfig.snapshot);
      }
    })().catch(err => {
      bootstrapPromise = null;
      throw err;
    });
  }
  return bootstrapPromise;
}

app.use('/api', async (_req, _res, next) => {
  try {
    await ensureAppReady();
    next();
  } catch (err) {
    next(err);
  }
});

function parseSessionSnapshot(session) {
  if (session && session.config_snapshot) {
    try {
      return JSON.parse(session.config_snapshot);
    } catch {
      // fallback to cachedConfig
    }
  }
  return cachedConfig.snapshot;
}

async function triggerPrivateGitBackup(reason, delayMs = 30000, waitInlineOnServerless = false) {
  if (!gitBackup.getConfig().configured) return;
  if (!IS_VERCEL) {
    gitBackup.scheduleAutoBackup(reason, () => db.exportBackup(), delayMs);
    return;
  }
  if (!waitInlineOnServerless) return;
  try {
    await gitBackup.runBackupNow({
      reason,
      exportBackupFn: () => db.exportBackup()
    });
  } catch (err) {
    console.warn(`[GitBackup] Vercel inline backup (${reason}) warning:`, err.message);
  }
}

// ==========================================================================
// AUTHENTICATION HELPERS & MIDDLEWARE
// ==========================================================================

async function resolveAdminAuth(req) {
  const cookies = parseCookies(req.headers.cookie);
  const rawSid = cookies[ADMIN_COOKIE_NAME];
  if (!rawSid) return null;
  const sessionRow = await db.getAdminSession(hashToken(rawSid));
  if (!sessionRow) return null;
  const user = await db.getAdminUser(sessionRow.username);
  if (!user) return null;
  return {
    username: user.username,
    mustChangePassword: Boolean(user.must_change_password),
    rawSid
  };
}

async function resolveParticipantAuth(req) {
  const headerTok = req.headers['x-participant-token'];
  const queryTok = req.query?.token;
  const rawTok = typeof headerTok === 'string' && headerTok.trim()
    ? headerTok.trim()
    : typeof queryTok === 'string' && queryTok.trim()
    ? queryTok.trim()
    : '';
  if (!rawTok) return null;
  return db.getParticipantToken(rawTok);
}

async function requireAdmin(req, res, next) {
  try {
    const admin = await resolveAdminAuth(req);
    if (!admin) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    req.adminAuth = admin;
    return next();
  } catch (err) {
    return next(err);
  }
}

async function requireAdminOrParticipant(req, res, next) {
  try {
    const admin = await resolveAdminAuth(req);
    if (admin) {
      req.adminAuth = admin;
      return next();
    }
    const participantAuth = await resolveParticipantAuth(req);
    if (participantAuth) {
      req.participantAuth = participantAuth;
      return next();
    }
    return res.status(401).json({ error: 'Authentication or valid participant invite token required' });
  } catch (err) {
    return next(err);
  }
}

function setAdminCookie(req, res, rawToken) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || Boolean(process.env.SSL_CERT_PATH);
  const parts = [
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(rawToken)}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${Math.floor(TOKEN_TTL_MS / 1000)}`
  ];
  if (isHttps) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearAdminCookie(req, res) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || Boolean(process.env.SSL_CERT_PATH);
  const parts = [
    `${ADMIN_COOKIE_NAME}=`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    'Max-Age=0'
  ];
  if (isHttps) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function safeServerError(res, err, publicMessage = 'Internal server error') {
  console.error('[Server Error]', err);
  if (err && err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  return res.status(500).json({ error: publicMessage });
}

// ==========================================================================
// 1. TIME SYNC & AUTHENTICATION ENDPOINTS
// ==========================================================================

app.get('/api/time', (_req, res) => {
  res.json({
    serverTime: Date.now(),
    iso: new Date().toISOString()
  });
});

app.get('/api/health', async (_req, res) => {
  try {
    await db.ping();
    res.json({
      ok: true,
      ...db.getStorageInfo(),
      gitBackupConfigured: gitBackup.getConfig().configured,
      serverTime: Date.now()
    });
  } catch {
    res.status(503).json({ ok: false, error: 'Database unavailable' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const admin = await resolveAdminAuth(req);
    if (admin) {
      return res.json({
        authenticated: true,
        role: 'admin',
        username: admin.username,
        mustChangePassword: admin.mustChangePassword
      });
    }
    const participantAuth = await resolveParticipantAuth(req);
    if (participantAuth) {
      return res.json({
        authenticated: true,
        role: 'participant',
        session_id: participantAuth.session_id,
        participant: participantAuth.participant
      });
    }
    return res.json({ authenticated: false });
  } catch (err) {
    safeServerError(res, err, 'Failed to verify authentication state');
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await db.getAdminUser(username);
    if (!user || !verifyPassword(password, user.password_hash, user.salt)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const rawToken = generateToken(32);
    await db.createAdminSession(hashToken(rawToken), user.username, TOKEN_TTL_MS);
    setAdminCookie(req, res, rawToken);

    res.json({
      authenticated: true,
      role: 'admin',
      username: user.username,
      mustChangePassword: Boolean(user.must_change_password)
    });
  } catch (err) {
    safeServerError(res, err, 'Login failed');
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const admin = await resolveAdminAuth(req);
    if (admin?.rawSid) {
      await db.deleteAdminSession(hashToken(admin.rawSid));
    }
    clearAdminCookie(req, res);
    res.json({ success: true });
  } catch (err) {
    safeServerError(res, err, 'Logout failed');
  }
});

app.post('/api/auth/change-password', requireAdmin, authLimiter, async (req, res) => {
  try {
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ error: 'New password must be between 8 and 128 characters' });
    }

    const user = await db.getAdminUser(req.adminAuth.username);
    if (!user || !verifyPassword(currentPassword, user.password_hash, user.salt)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const { hash, salt } = hashPassword(newPassword);
    await db.updateAdminPassword(user.username, hash, salt);

    res.json({ success: true, mustChangePassword: false });
  } catch (err) {
    safeServerError(res, err, 'Failed to change password');
  }
});

// ==========================================================================
// 2. NETWORK INFO & CONFIGURATION API
// ==========================================================================

app.get('/api/network-info', requireAdmin, (req, res) => {
  const os = require('os');
  const nets = os.networkInterfaces();
  const ips = [];
  if (!IS_VERCEL) {
    for (const k of Object.keys(nets)) {
      for (const n of nets[k] || []) {
        if (n.family === 'IPv4' && !n.internal) ips.push(n.address);
      }
    }
  }
  const hostIp = ips[0] || 'localhost';
  const proto = req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.SSL_CERT_PATH ? 'https' : 'http';
  const forwardedHost = req.headers['x-forwarded-host']
    ? String(req.headers['x-forwarded-host']).split(',')[0].trim()
    : null;
  const publicUrl =
    process.env.PUBLIC_URL?.replace(/\/$/, '') ||
    (forwardedHost ? `${proto}://${forwardedHost}` : null) ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  res.json({
    port: PORT,
    hostIp,
    protocol: proto,
    localUrl: publicUrl || `${proto}://localhost:${PORT}`,
    networkUrl: publicUrl || `${proto}://${hostIp}:${PORT}`
  });
});

app.get('/api/config', requireAdminOrParticipant, async (req, res) => {
  try {
    const requestedSessionId = req.participantAuth
      ? req.participantAuth.session_id
      : (typeof req.query?.session === 'string' && req.query.session.trim() ? req.query.session.trim() : null);

    if (requestedSessionId) {
      const session = await db.getSession(requestedSessionId);
      if (session) {
        const snapshot = parseSessionSnapshot(session);
        return res.json({
          valid: true,
          errors: [],
          warnings: [],
          hash: session.config_hash || snapshot?.hash || cachedConfig.hash,
          environment_id: session.environment_id || 'default-smart-house',
          environment_name: session.environment_name || 'Default Smart House',
          snapshot
        });
      }
      if (req.participantAuth) {
        return res.status(404).json({ error: 'Session not found' });
      }
    }

    const requestedEnvId = !req.participantAuth && typeof req.query?.environment_id === 'string' && req.query.environment_id.trim()
      ? req.query.environment_id.trim()
      : null;

    if (requestedEnvId) {
      const env = await db.getEnvironment(requestedEnvId);
      if (!env) return res.status(404).json({ error: 'Environment not found' });
      return res.json({
        valid: true,
        errors: [],
        warnings: [],
        hash: env.config_hash,
        environment_id: env.id,
        environment_name: env.name,
        snapshot: env.snapshot
      });
    }

    res.json({
      ...cachedConfig,
      environment_id: 'default-smart-house',
      environment_name: 'Default Smart House'
    });
  } catch (err) {
    safeServerError(res, err, 'Failed to load configuration');
  }
});

app.post('/api/config/reload', requireAdmin, apiWriteLimiter, async (req, res) => {
  try {
    cachedConfig = loadAndValidateConfig();
    if (cachedConfig.valid) {
      await db.ensureDefaultEnvironment(cachedConfig.hash, cachedConfig.snapshot);
    }
    res.json({
      message: 'Configuration reloaded',
      ...cachedConfig
    });
  } catch (err) {
    safeServerError(res, err, 'Failed to reload configuration');
  }
});

// ==========================================================================
// 2B. ENVIRONMENTS API (Admin only)
// ==========================================================================

async function createAndStoreEnvironmentFromInput(rawInput, fallbackName) {
  const normalized = parseEnvironmentImportPayload(rawInput, fallbackName);
  const built = buildEnvironmentConfig(normalized);
  if (!built.valid) {
    return { valid: false, built };
  }
  const slug = built.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'env';
  const envId = `env_${slug}_${crypto.randomBytes(3).toString('hex')}`;
  const created = await db.createEnvironment({
    id: envId,
    name: built.name,
    description: built.description,
    configHash: built.hash,
    configSnapshot: built.snapshot
  });
  return { valid: true, created, warnings: built.warnings };
}

app.get('/api/environments', requireAdmin, async (_req, res) => {
  try {
    res.json(await db.listEnvironments());
  } catch (err) {
    safeServerError(res, err, 'Failed to list environments');
  }
});

app.post('/api/environments', requireAdmin, apiWriteLimiter, async (req, res) => {
  try {
    const result = await createAndStoreEnvironmentFromInput(req.body);
    if (!result.valid) {
      return res.status(400).json({
        error: result.built.errors.join('; '),
        errors: result.built.errors,
        warnings: result.built.warnings
      });
    }
    await triggerPrivateGitBackup('environment-created', 20000, true);
    res.status(201).json({ ...result.created, warnings: result.warnings });
  } catch (err) {
    safeServerError(res, err, 'Failed to create environment');
  }
});

app.post('/api/environments/import', requireAdmin, apiWriteLimiter, async (req, res) => {
  try {
    const fallbackName = typeof req.body?.name === 'string' ? req.body.name : 'Imported Environment';
    const result = await createAndStoreEnvironmentFromInput(req.body, fallbackName);
    if (!result.valid) {
      return res.status(400).json({
        error: result.built.errors.join('; '),
        errors: result.built.errors,
        warnings: result.built.warnings
      });
    }
    await triggerPrivateGitBackup('environment-imported', 20000, true);
    res.status(201).json({ ...result.created, warnings: result.warnings });
  } catch (err) {
    safeServerError(res, err, 'Failed to import environment JSON');
  }
});

app.get('/api/environments/:id/export.json', requireAdmin, async (req, res) => {
  try {
    const env = await db.getEnvironment(req.params.id);
    if (!env) return res.status(404).json({ error: 'Environment not found' });
    const exportObj = buildEnvironmentExportPayload(env);
    const safeFileSlug = (env.name || env.id || 'environment')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'environment';
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileSlug}.environment.json"`);
    res.status(200).send(JSON.stringify(exportObj, null, 2));
  } catch (err) {
    safeServerError(res, err, 'Failed to export environment JSON');
  }
});

app.delete('/api/environments/:id', requireAdmin, apiWriteLimiter, async (req, res) => {
  try {
    const env = await db.getEnvironment(req.params.id);
    if (!env) return res.status(404).json({ error: 'Environment not found' });
    if (env.is_default) {
      return res.status(400).json({ error: 'The built-in default environment cannot be deleted' });
    }
    await db.deleteEnvironment(env.id);
    await triggerPrivateGitBackup('environment-deleted', 20000, true);
    res.json({ success: true, id: env.id });
  } catch (err) {
    safeServerError(res, err, 'Failed to delete environment');
  }
});

// ==========================================================================
// 3. SESSIONS API
// ==========================================================================

app.get('/api/sessions', requireAdminOrParticipant, async (req, res) => {
  try {
    if (req.participantAuth) {
      const s = await db.getSession(req.participantAuth.session_id);
      if (!s) return res.json([]);
      const { config_snapshot: _omit, ...safeSession } = s;
      return res.json([safeSession]);
    }
    const list = await db.listSessions();
    res.json(list);
  } catch (err) {
    safeServerError(res, err, 'Failed to list sessions');
  }
});

app.get('/api/sessions/summary', requireAdmin, async (_req, res) => {
  try {
    const summary = await db.getSessionSummaries();
    res.json(summary);
  } catch (err) {
    safeServerError(res, err, 'Failed to load session summaries');
  }
});

app.post('/api/sessions', requireAdmin, apiWriteLimiter, async (req, res) => {
  try {
    const sessCheck = validateSessionId(req.body?.id);
    if (!sessCheck.valid) {
      return res.status(400).json({ error: sessCheck.error });
    }
    if (await db.getSession(sessCheck.value)) {
      return res.status(409).json({ error: `Session "${sessCheck.value}" already exists` });
    }
    const timezone = typeof req.body?.timezone === 'string' && req.body.timezone.trim()
      ? req.body.timezone.trim().slice(0, 64)
      : 'Europe/Paris';

    const requestedEnvId = typeof req.body?.environment_id === 'string' && req.body.environment_id.trim()
      ? req.body.environment_id.trim()
      : null;

    let envHash = cachedConfig.hash;
    let envSnapshot = cachedConfig.snapshot;
    let envId = 'default-smart-house';
    let envName = 'Default Smart House';

    if (requestedEnvId) {
      const env = await db.getEnvironment(requestedEnvId);
      if (!env || !env.snapshot) {
        return res.status(404).json({ error: `Environment "${requestedEnvId}" not found` });
      }
      envHash = env.config_hash;
      envSnapshot = env.snapshot;
      envId = env.id;
      envName = env.name;
    }

    const session = await db.createSession(sessCheck.value, envHash, envSnapshot, timezone, envId, envName);
    const roles = envSnapshot?.roles || ['Person_A', 'Person_B', 'Person_C'];
    const tokens = await db.ensureParticipantTokens(session.id, roles);
    await triggerPrivateGitBackup('session-created', 15000, false);
    res.status(201).json({ ...session, participantTokens: tokens });
  } catch (err) {
    safeServerError(res, err, 'Failed to create session');
  }
});

app.get('/api/sessions/:id', requireAdminOrParticipant, async (req, res) => {
  try {
    if (req.participantAuth && req.participantAuth.session_id !== req.params.id) {
      return res.status(403).json({ error: 'Access denied to this session' });
    }
    const session = await db.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const { config_snapshot: _omit, ...safeSession } = session;
    res.json(safeSession);
  } catch (err) {
    safeServerError(res, err, 'Failed to fetch session');
  }
});

app.get('/api/sessions/:id/participant-links', requireAdmin, async (req, res) => {
  try {
    const session = await db.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    let snap = cachedConfig.snapshot;
    try {
      snap = JSON.parse(session.config_snapshot);
    } catch {
      // fallback to active config
    }
    const roles = snap?.roles || ['Person_A', 'Person_B', 'Person_C'];
    const tokens = await db.ensureParticipantTokens(session.id, roles);
    res.json({ session_id: session.id, tokens });
  } catch (err) {
    safeServerError(res, err, 'Failed to generate participant links');
  }
});

app.post('/api/sessions/:id/start', requireAdmin, apiWriteLimiter, async (req, res) => {
  try {
    const session = await db.startSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    await triggerPrivateGitBackup('session-started', 15000, false);
    res.json({ message: 'Session started', session });
  } catch (err) {
    safeServerError(res, err, 'Failed to start session');
  }
});

app.post('/api/sessions/:id/stop', requireAdmin, apiWriteLimiter, async (req, res) => {
  try {
    const session = await db.stopSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    await triggerPrivateGitBackup('session-stopped', 2000, true);
    res.json({ message: 'Session stopped', session });
  } catch (err) {
    safeServerError(res, err, 'Failed to stop session');
  }
});

app.post('/api/sessions/:id/end', requireAdmin, apiWriteLimiter, async (req, res) => {
  try {
    const session = await db.stopSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    await triggerPrivateGitBackup('session-ended', 2000, true);
    res.json({ message: 'Session ended', session });
  } catch (err) {
    safeServerError(res, err, 'Failed to end session');
  }
});

app.delete('/api/sessions/:id', requireAdmin, apiWriteLimiter, async (req, res) => {
  try {
    await db.deleteSession(req.params.id);
    await triggerPrivateGitBackup('session-deleted', 15000, true);
    res.json({ success: true, message: `Session ${req.params.id} deleted` });
  } catch (err) {
    safeServerError(res, err, 'Failed to delete session');
  }
});

// Quick Test Annotation Generator (Admin only)
app.post('/api/test/generate-annotation', requireAdmin, apiWriteLimiter, async (req, res) => {
  try {
    const { session_id, participant, location_id, activity_id, interaction, other_person } = req.body || {};
    const sId = typeof session_id === 'string' && session_id.trim() ? session_id.trim() : '';
    if (!sId) return res.status(400).json({ error: 'session_id is required' });
    const session = await db.getSession(sId);
    if (!session) return res.status(404).json({ error: `Session "${sId}" not found` });

    const snap = parseSessionSnapshot(session);
    const roles = snap.roles || ['Person_A', 'Person_B', 'Person_C'];
    const part = roles.includes(participant) ? participant : roles[0];

    const loc = snap.locations.find(l => l.id === (location_id ?? 2)) || snap.locations[0];
    const validActs = snap.locationActivitiesMap[loc.id] || snap.activities;
    const act = validActs.find(a => a.id === (activity_id ?? validActs[0]?.id)) || validActs[0];
    const allowedInterKeys = Array.isArray(act?.allowedInteractions) && act.allowedInteractions.length > 0
      ? act.allowedInteractions
      : (act?.canDoTogether === false ? ['solo'] : ['solo', 'collaborative', 'assistive']);
    const requestedInter = interaction || 'solo';
    const resolvedInteraction = allowedInterKeys.includes(requestedInter) ? requestedInter : allowedInterKeys[0];

    const now = new Date();
    const started = new Date(now.getTime() - 8000).toISOString();
    const submitted = now.toISOString();

    const validation = validateAnnotationPayload({
      client_uuid: crypto.randomUUID(),
      session_id: sId,
      participant: part,
      timestamp_started: started,
      timestamp_submitted: submitted,
      location_id: loc.id,
      activity_id: act.id,
      interaction: resolvedInteraction,
      other_person: resolvedInteraction === 'solo' ? '' : (other_person || ''),
      edited: false
    }, snap);

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const result = await db.saveAnnotation({
      ...validation.data,
      config_version: session.config_hash || cachedConfig.hash
    });

    if (!result.isDuplicate) {
      await triggerPrivateGitBackup('test-annotation-generated', 30000, false);
    }

    res.status(201).json(result);
  } catch (err) {
    safeServerError(res, err, 'Failed to generate test annotation');
  }
});

// Collaborator Locks API
app.get('/api/sessions/:id/locks', requireAdminOrParticipant, async (req, res) => {
  try {
    if (req.participantAuth && req.participantAuth.session_id !== req.params.id) {
      return res.status(403).json({ error: 'Access denied to this session' });
    }
    const session = await db.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const locks = await db.getSessionLocks(req.params.id);
    res.json({
      session_id: req.params.id,
      strictSessionLock: Boolean(session.strict_session_lock),
      locks
    });
  } catch (err) {
    safeServerError(res, err, 'Failed to fetch collaborator locks');
  }
});

app.post('/api/sessions/:id/locks/release', requireAdmin, apiWriteLimiter, async (req, res) => {
  try {
    const { taken_person } = req.body || {};
    const locks = taken_person
      ? await db.releaseLock(req.params.id, String(taken_person).trim())
      : await db.releaseAllLocks(req.params.id);
    res.json({ success: true, locks });
  } catch (err) {
    safeServerError(res, err, 'Failed to release lock');
  }
});

app.post('/api/sessions/:id/lock-policy', requireAdmin, apiWriteLimiter, async (req, res) => {
  try {
    const session = await db.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const strict = await db.setSessionLockPolicy(req.params.id, Boolean(req.body?.strictSessionLock));
    res.json({
      session_id: req.params.id,
      strictSessionLock: strict
    });
  } catch (err) {
    safeServerError(res, err, 'Failed to update lock policy');
  }
});

// ==========================================================================
// 4. ANNOTATIONS INGESTION (Authenticated & Strictly Validated)
// ==========================================================================

app.get('/api/annotations', requireAdmin, async (req, res) => {
  try {
    const { session_id, participant } = req.query;
    if (!session_id) return res.status(400).json({ error: 'session_id query param is required' });
    const rows = await db.getAnnotations(String(session_id), participant ? String(participant) : null);
    res.json(rows);
  } catch (err) {
    safeServerError(res, err, 'Failed to load annotations');
  }
});

app.post('/api/annotations', requireAdminOrParticipant, apiWriteLimiter, async (req, res) => {
  try {
    const rawBody = { ...(req.body || {}) };
    let verifiedParticipant = null;

    if (req.participantAuth) {
      if (rawBody.session_id && rawBody.session_id !== req.participantAuth.session_id) {
        return res.status(403).json({ error: 'Participant token is not valid for this session' });
      }
      rawBody.session_id = req.participantAuth.session_id;
      verifiedParticipant = req.participantAuth.participant;
    }

    const sessCheck = validateSessionId(rawBody.session_id);
    if (!sessCheck.valid) {
      return res.status(400).json({ error: sessCheck.error });
    }

    const session = await db.getSession(sessCheck.value);
    if (!session) {
      return res.status(404).json({ error: `Session "${sessCheck.value}" not found` });
    }

    let snap = cachedConfig.snapshot;
    try {
      snap = JSON.parse(session.config_snapshot);
    } catch {
      // fallback
    }

    const validation = validateAnnotationPayload(rawBody, snap, verifiedParticipant);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const { row, isDuplicate } = await db.saveAnnotation({
      ...validation.data,
      config_version: session.config_hash || cachedConfig.hash,
      keep_session_lock: Boolean(session.strict_session_lock)
    });

    if (!isDuplicate) {
      await triggerPrivateGitBackup('annotation-saved', 30000, false);
    }

    res.status(201).json({
      success: true,
      isDuplicate,
      annotation: row,
      locks: await db.getSessionLocks(session.id)
    });
  } catch (err) {
    safeServerError(res, err, 'Failed to save annotation');
  }
});

// ==========================================================================
// 5. CSV EXPORT (Admin only, single participant or entire session)
// ==========================================================================

app.get('/api/sessions/:id/export.csv', requireAdmin, async (req, res) => {
  try {
    const sessCheck = validateSessionId(req.params.id);
    if (!sessCheck.valid) return res.status(400).json({ error: sessCheck.error });

    const sessionId = sessCheck.value;
    const participant = req.query.participant ? String(req.query.participant).trim() : null;
    if (participant && !/^[A-Za-z0-9_-]{1,64}$/.test(participant)) {
      return res.status(400).json({ error: 'Invalid participant filter' });
    }

    const session = await db.getSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const timeZone = session.timezone || 'Europe/Paris';
    const rows = await db.getAnnotations(sessionId, participant);
    const csvContent = generateAnnotationsCsv(rows, timeZone);

    const filename = participant
      ? `${sessionId}_${participant}.csv`
      : `${sessionId}_all.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (err) {
    safeServerError(res, err, 'Error generating CSV export');
  }
});

// ==========================================================================
// 6. FULL DATABASE BACKUP EXPORT, RESTORE & PRIVATE GITHUB CRON (Admin/Cron)
// ==========================================================================

app.get('/api/backup/export.json', requireAdmin, async (_req, res) => {
  try {
    const backup = await db.exportBackup();
    const dateStamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="smarthouse-backup-${dateStamp}.json"`);
    res.status(200).send(JSON.stringify(backup, null, 2));
  } catch (err) {
    safeServerError(res, err, 'Failed to export database backup');
  }
});

app.post('/api/backup/restore', requireAdmin, apiWriteLimiter, async (req, res) => {
  try {
    const sessions = Array.isArray(req.body?.data?.sessions) ? req.body.data.sessions : [];
    for (const s of sessions) {
      const check = validateSessionId(s?.id);
      if (!check.valid) {
        return res.status(400).json({ error: `Invalid session ID in backup: ${check.error}` });
      }
    }
    const summary = await db.restoreBackup(req.body);
    await triggerPrivateGitBackup('backup-restored', 5000, true);
    res.status(200).json({ success: true, summary });
  } catch (err) {
    safeServerError(res, err, 'Failed to restore database backup');
  }
});

app.get('/api/backup/github/status', requireAdmin, (_req, res) => {
  res.json(gitBackup.getStatus());
});

app.post('/api/backup/github', requireAdmin, apiWriteLimiter, async (_req, res) => {
  try {
    const result = await gitBackup.runBackupNow({
      reason: 'manual',
      force: true,
      exportBackupFn: () => db.exportBackup()
    });
    res.status(200).json(result);
  } catch (err) {
    safeServerError(res, err, 'Failed to push backup to private GitHub repository');
  }
});

// Vercel Cron endpoint (daily scheduled backup using CRON_SECRET header)
app.get('/api/backup/cron', async (req, res) => {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized cron trigger' });
    }
    if (!gitBackup.getConfig().configured) {
      return res.status(200).json({ skipped: true, reason: 'Private GitHub backup not configured' });
    }
    const result = await gitBackup.runBackupNow({
      reason: 'vercel-cron',
      exportBackupFn: () => db.exportBackup()
    });
    res.status(200).json(result);
  } catch (err) {
    safeServerError(res, err, 'Scheduled cron backup failed');
  }
});

// Serve frontend static build when running locally (Vercel serves client/dist via CDN)
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (!IS_VERCEL && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Express error handler
app.use((err, _req, res, _next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request payload exceeds allowed size limit' });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON request body' });
  }
  if (err && err.message && err.message.startsWith('CORS policy:')) {
    return res.status(403).json({ error: 'Cross-origin request rejected' });
  }
  return safeServerError(res, err);
});

async function startServer() {
  await ensureAppReady();
  const gitCfg = gitBackup.getConfig();
  if (gitCfg.configured) {
    gitBackup.startPeriodicBackup(() => db.exportBackup());
    console.log(`[GitBackup] Auto-backup enabled for private repo "${gitCfg.slug}"`);
  }

  const certPath = process.env.SSL_CERT_PATH;
  const keyPath = process.env.SSL_KEY_PATH;

  if (certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    const tlsOpts = {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath)
    };
    return new Promise(resolve => {
      const server = https.createServer(tlsOpts, app).listen(PORT, '0.0.0.0', () => {
        console.log(`[SmartHouse Annotator] HTTPS API running on https://localhost:${PORT}`);
        resolve(server);
      });
    });
  }

  return new Promise(resolve => {
    const server = http.createServer(app).listen(PORT, '0.0.0.0', () => {
      console.log(`[SmartHouse Annotator] API running on http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

if (require.main === module && !IS_VERCEL) {
  startServer().catch(err => {
    console.error('[SmartHouse Annotator] Fatal startup failure:', err);
    process.exit(1);
  });
}

module.exports = app;
```

---
## 6. Frontend Source Files (`client/src/`)

### File 13: `client/src/types.ts`
```ts
export interface LocationItem {
  id: number;
  name: string;
  normalizedName: string;
  shortLabel: string;
  description?: string;
}

export type InteractionKey = 'solo' | 'collaborative' | 'assistive';

export interface ActivityItem {
  id: number;
  name: string;
  shortLabel: string;
  allowedInteractions?: InteractionKey[];
  canDoTogether?: boolean;
}

export interface InteractionItem {
  key: string;
  label: string;
  shortLabel: string;
  requiresPerson: boolean;
}

export interface ConfigSnapshot {
  schemaVersion: number;
  loadedAt: string;
  residentNumber: number;
  roles: string[];
  locations: LocationItem[];
  activities: ActivityItem[];
  locationActivitiesMap: Record<number, ActivityItem[]>;
  interactions: InteractionItem[];
  hash: string;
}

export interface SessionItem {
  id: string;
  config_hash: string;
  status: 'active' | 'ended';
  timezone: string;
  started_at: string;
  ended_at?: string;
  environment_id?: string;
  environment_name?: string;
}

export interface EnvironmentActivityDraft {
  name: string;
  shortLabel?: string;
  allowedInteractions?: InteractionKey[];
  canDoTogether?: boolean;
}

export interface EnvironmentLocationDraft {
  name: string;
  shortLabel?: string;
  activities: Array<string | EnvironmentActivityDraft>;
}

export interface EnvironmentDraftInput {
  name: string;
  description?: string;
  roles: string[];
  locations: EnvironmentLocationDraft[];
}

export interface EnvironmentItem {
  id: string;
  name: string;
  description: string;
  config_hash: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  snapshot: ConfigSnapshot;
}

export interface SessionSummaryItem extends SessionItem {
  annotation_count: number;
  active_participants?: string;
}

export interface AnnotationPayload {
  client_uuid: string;
  session_id: string;
  participant: string;
  timestamp_started: string;
  timestamp_submitted: string;
  location_id: number;
  location: string;
  activity_id: number;
  activity: string;
  interaction: string;
  other_person: string;
  edited: boolean;
  config_version: string;
}

export interface StoredAnnotation extends AnnotationPayload {
  id?: number;
  seq?: number;
  timestamp_received?: string;
  sync_status?: 'synced' | 'pending';
}

export interface CollaboratorLock {
  session_id: string;
  taken_person: string;
  taken_by: string;
  activity?: string;
  locked_at: string;
}
```

### File 14: `client/src/services/outbox.ts`
```ts
import type { AnnotationPayload } from '../types';
import { postAnnotation } from './api';

// Separate IndexedDB database name so offline queues never collide with the Render app
const DB_NAME = 'SmartHouseAnnotatorDB';
const DB_VERSION = 1;
const STORE_NAME = 'annotation_outbox';

export interface OutboxEntry extends AnnotationPayload {
  queuedAt?: string;
  lastError?: string;
  lastStatus?: number;
}

type Listener = (count: number) => void;
const listeners: Set<Listener> = new Set();

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'client_uuid' });
      }
    };
  });
}

export function subscribeOutbox(listener: Listener) {
  listeners.add(listener);
  notifyListeners();
  return () => {
    listeners.delete(listener);
  };
}

async function notifyListeners() {
  const count = await getPendingCount();
  listeners.forEach(fn => fn(count));
}

export async function getPendingAnnotations(): Promise<OutboxEntry[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[Outbox] Error reading pending annotations:', err);
    return [];
  }
}

export async function getPendingCount(): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

export async function enqueueAnnotation(payload: AnnotationPayload): Promise<void> {
  try {
    const db = await openDB();
    const record: OutboxEntry = {
      ...payload,
      queuedAt: new Date().toISOString()
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    notifyListeners();
  } catch (err) {
    console.error('[Outbox] Failed to enqueue:', err);
  }
}

async function markOutboxEntryError(clientUuid: string, message: string, status?: number): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(clientUuid);
      getReq.onsuccess = () => {
        const current = getReq.result;
        if (!current) {
          resolve();
          return;
        }
        const putReq = store.put({ ...current, lastError: message, lastStatus: status });
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch {
    // Ignore IDB update errors
  }
}

export async function removeAnnotationFromOutbox(clientUuid: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(clientUuid);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    notifyListeners();
  } catch (err) {
    console.error('[Outbox] Failed to remove item:', err);
  }
}

export async function clearOutbox(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    notifyListeners();
  } catch (err) {
    console.error('[Outbox] Failed to clear outbox:', err);
  }
}

function toAnnotationPayload(entry: OutboxEntry): AnnotationPayload {
  const { queuedAt: _q, lastError: _e, lastStatus: _s, ...payload } = entry;
  return payload;
}

export async function flushOutbox(): Promise<{ synced: number; dropped: number; failed: number }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const count = await getPendingCount();
    return { synced: 0, dropped: 0, failed: count };
  }

  const pending = await getPendingAnnotations();
  if (pending.length === 0) return { synced: 0, dropped: 0, failed: 0 };

  let synced = 0;
  let dropped = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await postAnnotation(toAnnotationPayload(item));
      await removeAnnotationFromOutbox(item.client_uuid);
      synced++;
    } catch (err: any) {
      const status = err?.status;
      if (status === 400 || status === 404) {
        console.warn(`[Outbox] Dropping unrecoverable queued item ${item.client_uuid} (${status}):`, err?.message);
        await removeAnnotationFromOutbox(item.client_uuid);
        dropped++;
      } else {
        console.warn(`[Outbox] Retry deferred for ${item.client_uuid}:`, err?.message || err);
        await markOutboxEntryError(item.client_uuid, err?.message || 'Network or session error', status);
        failed++;
      }
    }
  }

  notifyListeners();
  return { synced, dropped, failed };
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Outbox] Network restored, flushing outbox...');
    flushOutbox();
  });

  setInterval(() => {
    flushOutbox();
  }, 10000);
}
```

### File 15: `client/src/services/api.ts`
```ts
import type {
  ConfigSnapshot,
  SessionItem,
  SessionSummaryItem,
  AnnotationPayload,
  StoredAnnotation,
  CollaboratorLock,
  EnvironmentItem,
  EnvironmentDraftInput
} from '../types';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:3001/api'
    : '/api');

let participantToken: string | null = null;

export function setParticipantToken(token: string | null): void {
  participantToken = token && token.trim() ? token.trim() : null;
}

export function getParticipantToken(): string | null {
  return participantToken;
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (participantToken && !headers.has('X-Participant-Token')) {
    headers.set('X-Participant-Token', participantToken);
  }
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  });
}

async function parseError(res: Response, fallbackMsg: string): Promise<Error & { status?: number }> {
  const body = await res.json().catch(() => ({}));
  const err: Error & { status?: number } = new Error(body.error || fallbackMsg);
  err.status = res.status;
  return err;
}

export interface AuthState {
  authenticated: boolean;
  role?: 'admin' | 'participant';
  username?: string;
  mustChangePassword?: boolean;
  session_id?: string;
  participant?: string;
}

export async function fetchAuthMe(): Promise<AuthState> {
  const res = await apiFetch('/auth/me');
  if (!res.ok) throw await parseError(res, 'Failed to check auth state');
  return res.json();
}

export async function loginAdmin(username: string, password: string): Promise<AuthState> {
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw await parseError(res, 'Login failed');
  return res.json();
}

export async function logoutAdmin(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' });
}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; mustChangePassword: boolean }> {
  const res = await apiFetch('/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword })
  });
  if (!res.ok) throw await parseError(res, 'Failed to update password');
  return res.json();
}

export async function fetchServerTime(): Promise<{ serverTime: number; iso: string; rtt: number }> {
  const t0 = Date.now();
  const res = await apiFetch('/time');
  const t1 = Date.now();
  if (!res.ok) throw new Error('Failed to fetch server time');
  const data = await res.json();
  return {
    serverTime: data.serverTime,
    iso: data.iso,
    rtt: t1 - t0
  };
}

export async function fetchNetworkInfo(): Promise<{
  port: number;
  hostIp: string;
  protocol?: string;
  localUrl: string;
  networkUrl: string;
}> {
  const res = await apiFetch('/network-info');
  if (!res.ok) throw await parseError(res, 'Failed to fetch network info');
  return res.json();
}

export async function fetchConfig(sessionId?: string): Promise<{
  valid: boolean;
  hash: string;
  environment_id?: string;
  environment_name?: string;
  snapshot: ConfigSnapshot;
  warnings: string[];
  errors: string[];
}> {
  const query = sessionId ? `?session=${encodeURIComponent(sessionId)}` : '';
  const res = await apiFetch(`/config${query}`);
  if (!res.ok) throw await parseError(res, 'Failed to fetch config');
  return res.json();
}

export async function fetchEnvironments(): Promise<EnvironmentItem[]> {
  const res = await apiFetch('/environments');
  if (!res.ok) throw await parseError(res, 'Failed to fetch environments');
  return res.json();
}

export async function createEnvironment(draft: EnvironmentDraftInput): Promise<EnvironmentItem> {
  const res = await apiFetch('/environments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft)
  });
  if (!res.ok) throw await parseError(res, 'Failed to create environment');
  return res.json();
}

export async function importEnvironmentJson(payload: unknown): Promise<EnvironmentItem> {
  const res = await apiFetch('/environments/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw await parseError(res, 'Failed to import environment JSON');
  return res.json();
}

function triggerBlobDownload(blob: Blob, filename: string): string {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}

export async function downloadEnvironmentJson(id: string, envName?: string): Promise<string> {
  const res = await apiFetch(`/environments/${encodeURIComponent(id)}/export.json`);
  if (!res.ok) throw await parseError(res, 'Failed to download environment JSON');
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const fallbackSlug = (envName || id || 'environment')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'environment';
  const filename = match?.[1] || `${fallbackSlug}.environment.json`;
  return triggerBlobDownload(blob, filename);
}

export async function fetchStorageHealth(): Promise<{
  ok: boolean;
  engine: string;
  persistent: boolean;
  schema?: string;
}> {
  const res = await apiFetch('/health');
  if (!res.ok) throw await parseError(res, 'Failed to check database health');
  return res.json();
}

export async function downloadFullBackupJson(): Promise<string> {
  const res = await apiFetch('/backup/export.json');
  if (!res.ok) throw await parseError(res, 'Failed to export database backup');
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] || `smarthouse-backup-${new Date().toISOString().slice(0, 10)}.json`;
  return triggerBlobDownload(blob, filename);
}

export interface GitBackupStatus {
  configured: boolean;
  repo: string | null;
  branch: string;
  tokenSet: boolean;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastStatus: 'idle' | 'ok' | 'skipped' | 'error';
  lastError: string | null;
  lastReason: string | null;
  lastCommitUrl: string | null;
}

export async function fetchGitBackupStatus(): Promise<GitBackupStatus> {
  const res = await apiFetch('/backup/github/status');
  if (!res.ok) throw await parseError(res, 'Failed to check private Git backup status');
  return res.json();
}

export async function triggerGitBackupNow(): Promise<{
  success: boolean;
  skipped?: boolean;
  repo: string;
  branch: string;
  commitUrl?: string | null;
  counts?: { sessions: number; annotations: number; environments: number };
}> {
  const res = await apiFetch('/backup/github', { method: 'POST' });
  if (!res.ok) throw await parseError(res, 'Failed to push backup to private GitHub repository');
  return res.json();
}

export async function restoreFullBackupJson(payload: unknown): Promise<{
  success: boolean;
  summary: {
    environmentsAdded: number;
    sessionsAdded: number;
    tokensAdded: number;
    annotationsAdded: number;
  };
}> {
  const res = await apiFetch('/backup/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw await parseError(res, 'Failed to restore backup file');
  return res.json();
}

export async function deleteEnvironment(id: string): Promise<{ success: boolean; id: string }> {
  const res = await apiFetch(`/environments/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw await parseError(res, 'Failed to delete environment');
  return res.json();
}

export async function reloadConfig(): Promise<{
  valid: boolean;
  hash: string;
  snapshot: ConfigSnapshot;
}> {
  const res = await apiFetch('/config/reload', { method: 'POST' });
  if (!res.ok) throw await parseError(res, 'Failed to reload config');
  return res.json();
}

export async function fetchSessions(): Promise<SessionItem[]> {
  const res = await apiFetch('/sessions');
  if (!res.ok) throw await parseError(res, 'Failed to fetch sessions');
  return res.json();
}

export async function fetchSessionSummaries(): Promise<SessionSummaryItem[]> {
  const res = await apiFetch('/sessions/summary');
  if (!res.ok) throw await parseError(res, 'Failed to fetch session summaries');
  return res.json();
}

export async function fetchParticipantLinks(
  sessionId: string
): Promise<{ session_id: string; tokens: Record<string, string> }> {
  const res = await apiFetch(`/sessions/${encodeURIComponent(sessionId)}/participant-links`);
  if (!res.ok) throw await parseError(res, 'Failed to fetch participant links');
  return res.json();
}

export async function createSession(
  id: string,
  timezone = 'Europe/Paris',
  environmentId?: string
): Promise<SessionItem & { participantTokens?: Record<string, string> }> {
  const res = await apiFetch('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, timezone, environment_id: environmentId || undefined })
  });
  if (!res.ok) throw await parseError(res, 'Failed to create session');
  return res.json();
}

export async function startSession(id: string): Promise<SessionItem> {
  const res = await apiFetch(`/sessions/${encodeURIComponent(id)}/start`, { method: 'POST' });
  if (!res.ok) throw await parseError(res, 'Failed to start session');
  const data = await res.json();
  return data.session;
}

export async function stopSession(id: string): Promise<SessionItem> {
  const res = await apiFetch(`/sessions/${encodeURIComponent(id)}/stop`, { method: 'POST' });
  if (!res.ok) throw await parseError(res, 'Failed to stop session');
  const data = await res.json();
  return data.session;
}

export async function endSession(id: string): Promise<void> {
  await stopSession(id);
}

export async function deleteSession(id: string): Promise<void> {
  const res = await apiFetch(`/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw await parseError(res, 'Failed to delete session');
}

export async function generateTestAnnotation(params: {
  session_id: string;
  participant: string;
  location_id?: number;
  activity_id?: number;
  interaction?: string;
  other_person?: string;
}): Promise<any> {
  const res = await apiFetch('/test/generate-annotation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) throw await parseError(res, 'Failed to generate test annotation');
  return res.json();
}

export async function fetchSessionLocks(
  sessionId: string
): Promise<{ session_id: string; strictSessionLock: boolean; locks: CollaboratorLock[] }> {
  const res = await apiFetch(`/sessions/${encodeURIComponent(sessionId)}/locks`);
  if (!res.ok) throw await parseError(res, 'Failed to fetch session locks');
  return res.json();
}

export async function releaseSessionLock(
  sessionId: string,
  takenPerson?: string
): Promise<{ locks: CollaboratorLock[] }> {
  const res = await apiFetch(`/sessions/${encodeURIComponent(sessionId)}/locks/release`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(takenPerson ? { taken_person: takenPerson } : {})
  });
  if (!res.ok) throw await parseError(res, 'Failed to release lock');
  return res.json();
}

export async function setSessionLockPolicy(
  sessionId: string,
  strictSessionLock: boolean
): Promise<{ strictSessionLock: boolean }> {
  const res = await apiFetch(`/sessions/${encodeURIComponent(sessionId)}/lock-policy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strictSessionLock })
  });
  if (!res.ok) throw await parseError(res, 'Failed to set lock policy');
  return res.json();
}

export async function postAnnotation(payload: AnnotationPayload): Promise<{
  success: boolean;
  annotation: StoredAnnotation;
  isDuplicate: boolean;
  locks?: CollaboratorLock[];
}> {
  const res = await apiFetch('/annotations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw await parseError(res, `Failed to submit annotation (${res.status})`);
  return res.json();
}

export async function fetchAnnotations(
  sessionId: string,
  participant?: string
): Promise<StoredAnnotation[]> {
  let path = `/annotations?session_id=${encodeURIComponent(sessionId)}`;
  if (participant) {
    path += `&participant=${encodeURIComponent(participant)}`;
  }
  const res = await apiFetch(path);
  if (!res.ok) throw await parseError(res, 'Failed to fetch annotations');
  return res.json();
}

export function getExportCsvUrl(sessionId: string, participant?: string): string {
  let url = `${API_BASE}/sessions/${encodeURIComponent(sessionId)}/export.csv`;
  if (participant) {
    url += `?participant=${encodeURIComponent(participant)}`;
  }
  return url;
}
```

### File 16: `client/src/components/AppHeader.tsx`
```tsx
import React, { useState, useEffect } from 'react';
import { useSynchronizedClock } from '../services/clock';
import {
  clearOutbox,
  flushOutbox,
  getPendingAnnotations,
  removeAnnotationFromOutbox
} from '../services/outbox';
import type { OutboxEntry } from '../services/outbox';
import {
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  User,
  Sliders,
  FileSpreadsheet,
  Settings,
  Layers,
  ShieldCheck,
  Download,
  KeyRound,
  LogOut,
  Trash2,
  X
} from 'lucide-react';

export type MainTabType = 'participant' | 'sessions' | 'data' | 'config';

interface AppHeaderProps {
  isParticipantClient: boolean;
  sessionId: string;
  sessionStatus?: 'active' | 'stopped';
  participant: string;
  pendingCount: number;
  activeTab: MainTabType;
  onTabChange: (tab: MainTabType) => void;
  isOnline?: boolean;
  canInstall?: boolean;
  onInstallApp?: () => void;
  adminUsername?: string | null;
  onOpenPasswordModal?: () => void;
  onLogout?: () => void;
  onOutboxSynced?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  isParticipantClient,
  sessionId,
  sessionStatus = 'active',
  participant,
  pendingCount,
  activeTab,
  onTabChange,
  isOnline = true,
  canInstall = false,
  onInstallApp,
  adminUsername,
  onOpenPasswordModal,
  onLogout,
  onOutboxSynced
}) => {
  const { timeStr } = useSynchronizedClock();
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingEntries, setPendingEntries] = useState<OutboxEntry[]>([]);
  const [isFlushing, setIsFlushing] = useState(false);

  const loadPendingEntries = async () => {
    const items = await getPendingAnnotations();
    setPendingEntries(items);
    if (items.length === 0) {
      setShowPendingModal(false);
    }
  };

  useEffect(() => {
    if (showPendingModal) {
      loadPendingEntries();
    }
  }, [showPendingModal, pendingCount]);

  const handleRetryFlush = async () => {
    setIsFlushing(true);
    try {
      const result = await flushOutbox();
      await loadPendingEntries();
      if ((result.synced > 0 || result.dropped > 0) && onOutboxSynced) {
        onOutboxSynced();
      }
    } finally {
      setIsFlushing(false);
    }
  };

  const handleDeleteEntry = async (uuid: string) => {
    await removeAnnotationFromOutbox(uuid);
    await loadPendingEntries();
  };

  const handleClearAll = async () => {
    await clearOutbox();
    setPendingEntries([]);
    setShowPendingModal(false);
  };

  return (
    <header className="app-header-pro">
      {/* 1. Main Navigation Bar */}
      <div className="nav-main-bar">
        <div className="nav-brand">
          <div className="brand-logo-icon">
            <Layers size={20} />
          </div>
          <div className="brand-text-block">
            <span className="brand-title">
              SmartHouse<span className="brand-accent">Annotator</span>
            </span>
            <span className="brand-subtitle">
              {isParticipantClient ? 'Participant Activity Annotator' : 'Researcher Admin Console'}
            </span>
          </div>
        </div>

        {/* Admin Tab Navigation (Only visible in Admin Mode) */}
        {!isParticipantClient && (
          <nav className="nav-tabs-group" aria-label="Admin Navigation">
            <button
              className={`nav-tab-btn ${activeTab === 'sessions' ? 'tab-active' : ''}`}
              onClick={() => onTabChange('sessions')}
              title="Create Sessions, Start/Stop & Participant Live URLs"
            >
              <Sliders size={16} />
              <span>Sessions & Live URLs</span>
            </button>

            <button
              className={`nav-tab-btn ${activeTab === 'data' ? 'tab-active' : ''}`}
              onClick={() => onTabChange('data')}
              title="Live Annotation Stream & CSV Exports"
            >
              <FileSpreadsheet size={16} />
              <span>Live Data & CSV</span>
            </button>

            <button
              className={`nav-tab-btn ${activeTab === 'config' ? 'tab-active' : ''}`}
              onClick={() => onTabChange('config')}
              title="Environments, Storage Backups & System Integrity"
            >
              <Settings size={16} />
              <span>Environments</span>
            </button>
          </nav>
        )}

        {/* Live Clock on Right */}
        <div className="nav-clock-box" title="Server Synchronized NTP Time with Seconds">
          <Clock size={16} className="clock-pulse-icon" />
          <span className="clock-digits-pro">{timeStr}</span>
        </div>
      </div>

      {/* 2. Sub-Header Context Bar */}
      <div className="nav-context-bar">
        <div className="context-left-group">
          {!isParticipantClient && (
            <div className="context-pill admin-mode-pill">
              <ShieldCheck size={13} className="pill-icon" />
              <span>ADMIN CONSOLE</span>
            </div>
          )}

          {sessionId ? (
            <div className={`context-pill session-pill ${sessionStatus === 'active' ? 'session-pill-active' : 'session-pill-stopped'}`}>
              <span className="pill-dot" />
              <span className="pill-muted">SESSION:</span>
              <strong>{sessionId}</strong>
              <span className="pill-status-tag">{sessionStatus === 'active' ? 'ACTIVE' : 'STOPPED'}</span>
            </div>
          ) : (
            <div className="context-pill session-pill session-pill-stopped">
              <span className="pill-dot" />
              <span className="pill-muted">SESSION:</span>
              <strong>NONE</strong>
            </div>
          )}

          {isParticipantClient && (
            <div className="context-pill participant-pill">
              <User size={13} className="pill-icon" />
              <span className="pill-muted">PARTICIPANT:</span>
              <strong>{participant}</strong>
            </div>
          )}
        </div>

        <div className="context-right-group">
          {canInstall && onInstallApp && (
            <button
              type="button"
              className="context-pill install-app-pill"
              onClick={onInstallApp}
              title="Install SmartHouse Annotator on your device"
            >
              <Download size={13} className="pill-icon" />
              <span>Install App</span>
            </button>
          )}

          {pendingCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowPendingModal(true)}
              className={`context-pill outbox-pill outbox-pill-btn ${
                !isOnline ? 'outbox-pill-offline' : 'outbox-pill-pending'
              }`}
              title="Click to inspect, retry, or clear queued offline annotations"
            >
              {!isOnline ? (
                <>
                  <WifiOff size={12} className="pill-icon" />
                  <span>Offline ({pendingCount})</span>
                </>
              ) : (
                <>
                  <RefreshCw size={12} className="spin-icon pill-icon" />
                  <span>Pending: {pendingCount}</span>
                </>
              )}
            </button>
          ) : (
            <div className={`context-pill outbox-pill ${!isOnline ? 'outbox-pill-offline' : 'outbox-pill-synced'}`}>
              {!isOnline ? (
                <>
                  <WifiOff size={12} className="pill-icon" />
                  <span>Offline</span>
                </>
              ) : (
                <>
                  <Wifi size={12} className="pill-icon" />
                  <span>Synced</span>
                </>
              )}
            </div>
          )}

          {!isParticipantClient && adminUsername && (
            <>
              {onOpenPasswordModal && (
                <button
                  type="button"
                  className="context-pill btn-pw-pill"
                  onClick={onOpenPasswordModal}
                  title={`Change password for ${adminUsername}`}
                >
                  <KeyRound size={12} className="pill-icon" />
                  <span>Password</span>
                </button>
              )}
              {onLogout && (
                <button
                  type="button"
                  className="context-pill btn-logout-pill"
                  onClick={onLogout}
                  title="Sign out of Admin Console"
                >
                  <LogOut size={12} className="pill-icon" />
                  <span>Sign Out</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {showPendingModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="outbox-modal-title">
          <div className="modal-card outbox-modal-card">
            <div className="modal-card-head">
              <div className="modal-title-group">
                <RefreshCw size={18} />
                <div>
                  <h3 id="outbox-modal-title">Pending Sync Queue ({pendingEntries.length})</h3>
                  <p className="modal-subtitle">
                    Local browser outbox entries waiting to upload to the server
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowPendingModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="outbox-modal-body">
              {pendingEntries.length === 0 ? (
                <div className="empty-state-box">No pending items remain in local storage.</div>
              ) : (
                <div className="outbox-entries-list">
                  {pendingEntries.map(entry => (
                    <div key={entry.client_uuid} className="outbox-entry-row">
                      <div className="outbox-entry-main">
                        <div className="outbox-entry-title">
                          <strong>{entry.participant}</strong> • Session <code>{entry.session_id}</code>
                        </div>
                        <div className="outbox-entry-meta">
                          {entry.location} → {entry.activity} ({entry.interaction}
                          {entry.other_person ? ` with ${entry.other_person}` : ''})
                        </div>
                        <div className="outbox-entry-time">
                          Started: {entry.timestamp_started?.slice(11, 23)} · Stopped: {entry.timestamp_submitted?.slice(11, 23)}
                        </div>
                        {entry.lastError && (
                          <div className="outbox-entry-err">
                            Last sync error{entry.lastStatus ? ` (HTTP ${entry.lastStatus})` : ''}: {entry.lastError}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn-table btn-table-delete"
                        onClick={() => handleDeleteEntry(entry.client_uuid)}
                        title="Discard this queued entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-ui btn-ui-danger"
                  onClick={handleClearAll}
                  disabled={pendingEntries.length === 0 || isFlushing}
                >
                  <Trash2 size={14} /> Clear All
                </button>
                <div className="modal-actions-btns">
                  <button
                    type="button"
                    className="btn-ui btn-ui-secondary"
                    onClick={() => setShowPendingModal(false)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn-ui btn-ui-primary"
                    onClick={handleRetryFlush}
                    disabled={pendingEntries.length === 0 || isFlushing}
                  >
                    <RefreshCw size={14} />
                    <span>{isFlushing ? 'Syncing...' : 'Retry Sync Now'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
```

### File 17: `client/src/components/Screen5Review.tsx`
```tsx
import React from 'react';
import type { LocationItem, ActivityItem, InteractionItem } from '../types';
import { Play, Square, Edit2, ArrowLeft, RotateCcw } from 'lucide-react';
import { formatTimeWithSeconds, useSynchronizedClock } from '../services/clock';

interface Screen5ReviewProps {
  location: LocationItem;
  activity: ActivityItem;
  interaction: InteractionItem;
  person: string | null;
  isSoloOnly?: boolean;
  activityStartedAt: string | null;
  onEditStep: (step: number) => void;
  onStartActivity: () => void;
  onStopAndSubmit: () => Promise<void>;
  onCancelActivity: () => void;
  isSubmitting: boolean;
}

function formatElapsedHms(elapsedMs: number): string {
  const totalSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const Screen5Review: React.FC<Screen5ReviewProps> = ({
  location,
  activity,
  interaction,
  person,
  isSoloOnly = false,
  activityStartedAt,
  onEditStep,
  onStartActivity,
  onStopAndSubmit,
  onCancelActivity,
  isSubmitting
}) => {
  const { timestamp } = useSynchronizedClock();

  const isRunning = Boolean(activityStartedAt);
  const startedMs = activityStartedAt ? Date.parse(activityStartedAt) : null;
  const elapsedMs = startedMs && !Number.isNaN(startedMs) ? Math.max(0, timestamp - startedMs) : 0;

  return (
    <div className="screen-container review-screen">
      <div className="section-instruction">
        {isRunning ? 'Activity In Progress' : 'Ready to Start Activity'}
      </div>

      {/* Live Timer Banner when activity is started */}
      {isRunning && startedMs && (
        <div className="activity-timer-card" role="status" aria-live="polite">
          <div className="timer-card-top">
            <span className="timer-live-pill">
              <span className="timer-pulse-dot" />
              RUNNING
            </span>
            <span className="timer-started-meta">
              Started at <strong>{formatTimeWithSeconds(startedMs)}</strong>
            </span>
          </div>
          <div className="timer-elapsed-digits">{formatElapsedHms(elapsedMs)}</div>
          <p className="timer-help-text">
            Perform this activity, then tap <strong>Stop &amp; Save</strong> when finished.
          </p>
        </div>
      )}

      <div className="review-cards-list">
        {/* Location Row */}
        <div
          className={`review-card ${isRunning ? 'review-card-static' : ''}`}
          onClick={() => !isRunning && onEditStep(1)}
        >
          <div className="review-card-info">
            <span className="review-card-label">LOCATION</span>
            <span className="review-card-value">{location.shortLabel || location.name}</span>
          </div>
          {!isRunning && (
            <button type="button" className="review-edit-btn" aria-label="Edit location">
              <Edit2 size={16} />
              <span>Edit</span>
            </button>
          )}
        </div>

        {/* Activity Row */}
        <div
          className={`review-card ${isRunning ? 'review-card-static' : ''}`}
          onClick={() => !isRunning && onEditStep(2)}
        >
          <div className="review-card-info">
            <span className="review-card-label">ACTIVITY</span>
            <span className="review-card-value">{activity.shortLabel || activity.name}</span>
          </div>
          {!isRunning && (
            <button type="button" className="review-edit-btn" aria-label="Edit activity">
              <Edit2 size={16} />
              <span>Edit</span>
            </button>
          )}
        </div>

        {/* Interaction Row */}
        {isRunning || isSoloOnly ? (
          <div className="review-card review-card-static">
            <div className="review-card-info">
              <span className="review-card-label">INTERACTION</span>
              <span className="review-card-value">
                {interaction.shortLabel || interaction.label}
                {isSoloOnly ? ' (Solo-only activity)' : ''}
              </span>
            </div>
          </div>
        ) : (
          <div className="review-card" onClick={() => onEditStep(3)}>
            <div className="review-card-info">
              <span className="review-card-label">INTERACTION</span>
              <span className="review-card-value">{interaction.shortLabel || interaction.label}</span>
            </div>
            <button type="button" className="review-edit-btn" aria-label="Edit interaction">
              <Edit2 size={16} />
              <span>Edit</span>
            </button>
          </div>
        )}

        {/* Person Row (if not solo) */}
        {interaction.requiresPerson && (
          <div
            className={`review-card ${isRunning ? 'review-card-static' : ''}`}
            onClick={() => !isRunning && onEditStep(4)}
          >
            <div className="review-card-info">
              <span className="review-card-label">COLLABORATOR</span>
              <span className="review-card-value">{person || 'Not selected'}</span>
            </div>
            {!isRunning && (
              <button type="button" className="review-edit-btn" aria-label="Edit person">
                <Edit2 size={16} />
                <span>Edit</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons: Start Activity -> Stop & Save Activity */}
      <div className="review-actions">
        {!isRunning ? (
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onEditStep(isSoloOnly ? 2 : (interaction.requiresPerson ? 4 : 3))}
              disabled={isSubmitting}
            >
              <ArrowLeft size={18} style={{ marginRight: 6 }} />
              Back
            </button>

            <button
              type="button"
              className="btn-submit btn-start-activity"
              onClick={onStartActivity}
              disabled={isSubmitting}
            >
              <Play size={22} style={{ marginRight: 8 }} />
              <span>Start Activity</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn-secondary btn-discard-activity"
              onClick={onCancelActivity}
              disabled={isSubmitting}
              title="Cancel without logging"
            >
              <RotateCcw size={17} style={{ marginRight: 6 }} />
              Cancel
            </button>

            <button
              type="button"
              className="btn-submit btn-stop-activity"
              onClick={onStopAndSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Square size={20} style={{ marginRight: 8 }} />
                  <span>Stop &amp; Save</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
```

### File 18: `client/src/App.tsx`
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import type { LocationItem, ActivityItem, InteractionItem, ConfigSnapshot, SessionItem, StoredAnnotation } from './types';
import {
  fetchConfig,
  fetchSessions,
  postAnnotation,
  fetchAnnotations,
  fetchAuthMe,
  logoutAdmin,
  setParticipantToken
} from './services/api';
import type { AuthState } from './services/api';
import { startClockSyncInterval, getSynchronizedIso } from './services/clock';
import { subscribeOutbox, enqueueAnnotation, flushOutbox, removeAnnotationFromOutbox } from './services/outbox';

import { AppHeader } from './components/AppHeader';
import type { MainTabType } from './components/AppHeader';
import { BreadcrumbStack } from './components/BreadcrumbStack';
import { Screen1Location } from './components/Screen1Location';
import { Screen2Activity } from './components/Screen2Activity';
import { Screen3Interaction } from './components/Screen3Interaction';
import { Screen4Person } from './components/Screen4Person';
import { Screen5Review } from './components/Screen5Review';
import { AdminConsole } from './components/AdminConsole';
import { AdminLogin, ChangePasswordModal } from './components/AdminLogin';
import { useNotify } from './components/InAppNotifications';
import { getAllowedInteractionsForActivity, isActivitySoloOnly } from './utils/interactions';
import { CheckCircle, Lock, ShieldAlert } from 'lucide-react';

export const App: React.FC = () => {
  const { notify } = useNotify();
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const roleParam = urlParams.get('role');
  const tokenParam = urlParams.get('token');
  setParticipantToken(tokenParam);
  const isParticipantClient = Boolean(roleParam);
  const initialRole = roleParam || 'Person_A';
  const initialSession = urlParams.get('session');

  const [authChecked, setAuthChecked] = useState(false);
  const [adminAuth, setAdminAuth] = useState<AuthState | null>(null);
  const [participantAccessDenied, setParticipantAccessDenied] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  let initialTab: MainTabType = isParticipantClient ? 'participant' : 'sessions';
  const paramTab = urlParams.get('tab') as MainTabType;
  if (!isParticipantClient && paramTab && ['sessions', 'data', 'config'].includes(paramTab)) {
    initialTab = paramTab;
  }

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<MainTabType>(initialTab);

  // Config & Session state
  const [config, setConfig] = useState<ConfigSnapshot | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionItem | null>(null);
  const [participant, setParticipant] = useState<string>(initialRole);

  // Outbox state
  const [pendingCount, setPendingCount] = useState<number>(0);

  // 5-Screen Flow Navigation State (for Participant URL)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [chosenLocation, setChosenLocation] = useState<LocationItem | null>(null);
  const [chosenActivity, setChosenActivity] = useState<ActivityItem | null>(null);
  const [chosenInteraction, setChosenInteraction] = useState<InteractionItem | null>(null);
  const [chosenPerson, setChosenPerson] = useState<string | null>(null);
  const [activityStartedAt, setActivityStartedAt] = useState<string | null>(null);
  const [hasEdited, setHasEdited] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Success Feedback
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);

  // Progressive Connectivity & PWA Install State
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [installPromptEvent, setInstallPromptEvent] = useState<(Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }) | null>(null);

  // Live session annotations (for admin console)
  const [annotations, setAnnotations] = useState<StoredAnnotation[]>([]);

  // 1. Initial Data Loading & Subscriptions
  const loadInitialData = useCallback(async () => {
    try {
      const me = await fetchAuthMe();
      setAuthChecked(true);

      if (!isParticipantClient) {
        if (!me.authenticated || me.role !== 'admin') {
          setAdminAuth(null);
          return;
        }
        setAdminAuth(me);
      } else {
        if (!me.authenticated) {
          setParticipantAccessDenied(true);
          return;
        }
        setParticipantAccessDenied(false);
        if (me.role === 'participant' && me.participant) {
          setParticipant(me.participant);
        }
      }

      const sessionList = await fetchSessions();
      setSessions(sessionList);
      let targetSessionId: string | undefined = initialSession || undefined;
      if (sessionList.length > 0) {
        let target = sessionList[0];
        if (me.role === 'participant' && me.session_id) {
          target = sessionList.find(s => s.id === me.session_id) || sessionList[0];
        } else if (initialSession) {
          target = sessionList.find(s => s.id === initialSession) || sessionList[0];
        } else if (currentSession) {
          target = sessionList.find(s => s.id === currentSession.id) || sessionList[0];
        } else {
          target = sessionList.find(s => s.status === 'active') || sessionList[0];
        }
        targetSessionId = target.id;
        setCurrentSession(target);
      } else {
        setCurrentSession(null);
        setAnnotations([]);
      }

      const cfgRes = await fetchConfig(targetSessionId);
      if (cfgRes.snapshot) {
        setConfig(cfgRes.snapshot);
        if (!roleParam && cfgRes.snapshot.roles?.length && !cfgRes.snapshot.roles.includes(participant)) {
          setParticipant(cfgRes.snapshot.roles[0]);
        }
      }

      flushOutbox()
        .then(res => {
          if (res.synced > 0) refreshLiveState();
        })
        .catch(() => {});
    } catch (err: any) {
      setAuthChecked(true);
      if (err?.status === 401 || err?.status === 403) {
        if (isParticipantClient) setParticipantAccessDenied(true);
        else setAdminAuth(null);
      }
      console.warn('Initial data load warning:', err);
    }
  }, [participant, initialSession, roleParam, isParticipantClient]);

  const refreshLiveState = useCallback(async () => {
    if (!isParticipantClient && !adminAuth?.authenticated) return;
    if (isParticipantClient && (!currentSession || participantAccessDenied)) return;
    try {
      const sessionList = await fetchSessions();
      setSessions(sessionList);
      const nextCurr = currentSession
        ? sessionList.find(s => s.id === currentSession.id) || sessionList[0] || null
        : sessionList[0] || null;
      setCurrentSession(nextCurr);

      if (!isParticipantClient) {
        if (nextCurr) {
          const list = await fetchAnnotations(nextCurr.id);
          setAnnotations(list);
        } else {
          setAnnotations([]);
        }
      }
    } catch (e: any) {
      if (e?.status === 401) {
        setAdminAuth(null);
      } else {
        console.warn('Failed to refresh live state:', e);
      }
    }
  }, [currentSession, isParticipantClient, adminAuth, participantAccessDenied]);

  useEffect(() => {
    startClockSyncInterval();
    loadInitialData();

    const unsubOutbox = subscribeOutbox(count => setPendingCount(count));

    const handleOnline = () => {
      setIsOnline(true);
      notify('Connection restored — syncing any queued data.', 'success', 'Back Online');
      flushOutbox();
      refreshLiveState();
    };
    const handleOffline = () => {
      setIsOnline(false);
      notify('You are offline. Entries will queue locally and sync automatically.', 'warning', 'Offline Mode');
    };
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
      });
    };
    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      notify('SmartHouse Annotator has been installed on your device.', 'success', 'App Installed');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      unsubOutbox();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [loadInitialData]);

  useEffect(() => {
    if (currentSession) {
      refreshLiveState();
    }
  }, [currentSession?.id, participant]);

  // Real-time Poller (every 2 seconds) for live session status and incoming annotations
  useEffect(() => {
    const poller = setInterval(() => {
      refreshLiveState();
    }, 2000);
    return () => clearInterval(poller);
  }, [refreshLiveState]);

  const timerStorageKey = currentSession?.id
    ? `smarthouse_annotator_timer:${currentSession.id}:${participant}`
    : null;

  // Restore any running activity timer if the participant page refreshes or sleeps
  useEffect(() => {
    if (!isParticipantClient || !timerStorageKey || !config) return;
    try {
      const raw = localStorage.getItem(timerStorageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const loc = config.locations.find(l => l.id === saved.locationId);
      const validActs = loc ? (config.locationActivitiesMap[loc.id] || []) : [];
      const act = validActs.find(a => a.id === saved.activityId);
      const inter = config.interactions.find(i => i.key === saved.interactionKey);
      if (!loc || !act || !inter || typeof saved.startedAt !== 'string') {
        localStorage.removeItem(timerStorageKey);
        return;
      }
      setChosenLocation(loc);
      setChosenActivity(act);
      setChosenInteraction(inter);
      setChosenPerson(typeof saved.person === 'string' && saved.person ? saved.person : null);
      setHasEdited(Boolean(saved.edited));
      setActivityStartedAt(saved.startedAt);
      setCurrentStep(5);
    } catch {
      // Ignore malformed stored timer state
    }
  }, [isParticipantClient, timerStorageKey, config]);

  // 2. Step Selection Handlers
  const handleLocationSelect = (loc: LocationItem) => {
    setChosenLocation(loc);
    if (chosenActivity && config) {
      const validActs = config.locationActivitiesMap[loc.id] || [];
      if (!validActs.some(a => a.id === chosenActivity.id)) {
        setChosenActivity(null);
        setChosenInteraction(null);
        setChosenPerson(null);
      }
    }
    setCurrentStep(2);
  };

  const handleActivitySelect = (act: ActivityItem) => {
    setChosenActivity(act);
    const configInteractions = config?.interactions || [];
    const allowedInters = getAllowedInteractionsForActivity(act, configInteractions);
    if (isActivitySoloOnly(act, configInteractions)) {
      const soloInter = allowedInters.find(i => !i.requiresPerson) || {
        key: 'solo',
        label: 'Solo',
        shortLabel: 'Solo',
        requiresPerson: false
      };
      setChosenInteraction(soloInter);
      setChosenPerson(null);
      setCurrentStep(5);
      return;
    }
    if (chosenInteraction && !allowedInters.some(i => i.key === chosenInteraction.key)) {
      setChosenInteraction(null);
      setChosenPerson(null);
    }
    setCurrentStep(3);
  };

  const handleInteractionSelect = (interaction: InteractionItem) => {
    setChosenInteraction(interaction);
    if (!interaction.requiresPerson) {
      setChosenPerson(null);
      setCurrentStep(5);
    } else {
      setCurrentStep(4);
    }
  };

  const handlePersonSelect = (person: string) => {
    setChosenPerson(person);
    setCurrentStep(5);
  };

  const handleEditStep = (targetStep: number) => {
    if (activityStartedAt) return;
    setHasEdited(true);
    setCurrentStep(targetStep);
  };

  const handleStartActivity = () => {
    if (!chosenLocation || !chosenActivity || !chosenInteraction || !currentSession) {
      return;
    }
    if (currentSession.status !== 'active') {
      notify(
        `Session "${currentSession.id}" is currently stopped by the researcher. Activities cannot be started until the session is active.`,
        'warning',
        'Session Stopped'
      );
      return;
    }
    const startedIso = getSynchronizedIso();
    setActivityStartedAt(startedIso);
    if (timerStorageKey) {
      try {
        localStorage.setItem(
          timerStorageKey,
          JSON.stringify({
            locationId: chosenLocation.id,
            activityId: chosenActivity.id,
            interactionKey: chosenInteraction.key,
            person: chosenPerson || '',
            edited: hasEdited,
            startedAt: startedIso
          })
        );
      } catch {
        // Ignore storage quota errors
      }
    }
  };

  const handleCancelActivity = () => {
    setActivityStartedAt(null);
    if (timerStorageKey) {
      try {
        localStorage.removeItem(timerStorageKey);
      } catch {
        // Ignore storage errors
      }
    }
  };

  // 3. Stop Activity & Submit Handler
  const handleSubmitAnnotation = async () => {
    if (!chosenLocation || !chosenActivity || !chosenInteraction || !currentSession || !config || !activityStartedAt) {
      return;
    }

    if (currentSession.status !== 'active') {
      notify(
        `Session "${currentSession.id}" is currently stopped by the researcher. Annotations cannot be submitted until the session is started.`,
        'warning',
        'Session Stopped'
      );
      return;
    }

    setIsSubmitting(true);
    const clientUuid = crypto.randomUUID();
    const tsStopped = getSynchronizedIso();

    const payload = {
      client_uuid: clientUuid,
      session_id: currentSession.id,
      participant,
      timestamp_started: activityStartedAt,
      timestamp_submitted: tsStopped,
      location_id: chosenLocation.id,
      location: chosenLocation.name,
      activity_id: chosenActivity.id,
      activity: chosenActivity.name,
      interaction: chosenInteraction.key,
      other_person: chosenPerson || '',
      edited: hasEdited,
      config_version: config.hash
    };

    try {
      await enqueueAnnotation(payload);

      try {
        await postAnnotation(payload);
        await removeAnnotationFromOutbox(clientUuid);
      } catch (postErr: any) {
        if (postErr.status === 400 || postErr.status === 403 || postErr.status === 404 || postErr.status === 409) {
          await removeAnnotationFromOutbox(clientUuid);
          await refreshLiveState();
          notify(postErr.message, 'warning', postErr.status === 409 ? 'Session Stopped' : 'Not Saved');
          setIsSubmitting(false);
          return;
        }
        notify('Offline or network issue — saved locally and queued for automatic sync.', 'info', 'Queued Offline');
      }

      if (timerStorageKey) {
        try {
          localStorage.removeItem(timerStorageKey);
        } catch {
          // Ignore storage errors
        }
      }

      const startMs = Date.parse(activityStartedAt);
      const stopMs = Date.parse(tsStopped);
      const durationSec = !Number.isNaN(startMs) && !Number.isNaN(stopMs)
        ? Math.max(0, (stopMs - startMs) / 1000).toFixed(1)
        : null;

      setSubmitSuccessMsg(
        `Saved: ${chosenLocation.shortLabel || chosenLocation.name} - ${chosenActivity.shortLabel || chosenActivity.name}${durationSec ? ` (${durationSec}s)` : ''}`
      );

      setTimeout(() => {
        setSubmitSuccessMsg(null);
        setCurrentStep(1);
        setChosenLocation(null);
        setChosenActivity(null);
        setChosenInteraction(null);
        setChosenPerson(null);
        setHasEdited(false);
        setActivityStartedAt(null);
        setIsSubmitting(false);
        refreshLiveState();
      }, 1100);
    } catch (err: any) {
      notify(`Submission error: ${err.message}`, 'error', 'Submission Failed');
      setIsSubmitting(false);
    }
  };

  const handleInstallApp = async () => {
    if (!installPromptEvent) return;
    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPromptEvent(null);
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setAdminAuth(null);
    setConfig(null);
    setSessions([]);
    setCurrentSession(null);
    setAnnotations([]);
    notify('Signed out of Researcher Admin Console.', 'info', 'Signed Out');
  };

  // Gate root URL (/) behind Researcher Admin Login Page until authenticated
  if (!isParticipantClient) {
    if (!authChecked) {
      return (
        <div className="admin-login-page">
          <div className="admin-login-card">
            <div className="skeleton-bar skeleton-title" />
            <div className="skeleton-tile" />
          </div>
        </div>
      );
    }
    if (!adminAuth?.authenticated) {
      return (
        <AdminLogin
          onLoginSuccess={auth => {
            setAdminAuth(auth);
            loadInitialData();
          }}
        />
      );
    }
  }

  return (
    <div className="app-shell-pro">
      <AppHeader
        isParticipantClient={isParticipantClient}
        sessionId={currentSession?.id || initialSession || ''}
        sessionStatus={currentSession?.status === 'active' ? 'active' : 'stopped'}
        participant={participant}
        pendingCount={pendingCount}
        activeTab={activeTab}
        onTabChange={tab => setActiveTab(tab)}
        isOnline={isOnline}
        canInstall={Boolean(installPromptEvent)}
        onInstallApp={handleInstallApp}
        adminUsername={adminAuth?.username || null}
        onOpenPasswordModal={() => setShowPasswordModal(true)}
        onLogout={handleLogout}
        onOutboxSynced={() => refreshLiveState()}
      />

      {showPasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => {
            setShowPasswordModal(false);
            setAdminAuth(prev => (prev ? { ...prev, mustChangePassword: false } : prev));
          }}
        />
      )}

      <main className="main-content-pro">
        {!isParticipantClient ? (
          <div className="admin-view-wrapper">
            <AdminConsole
              currentSessionId={currentSession?.id || ''}
              activeTab={activeTab}
              onSelectSession={async sId => {
                if (!sId) {
                  setCurrentSession(null);
                  setAnnotations([]);
                  try {
                    const cfgRes = await fetchConfig();
                    if (cfgRes.snapshot) setConfig(cfgRes.snapshot);
                  } catch {
                    // ignore
                  }
                  return;
                }
                const target = sessions.find(s => s.id === sId) || {
                  id: sId,
                  config_hash: config?.hash || '',
                  status: 'active',
                  timezone: 'Europe/Paris',
                  started_at: new Date().toISOString()
                };
                setCurrentSession(target);
                try {
                  const cfgRes = await fetchConfig(sId);
                  if (cfgRes.snapshot) {
                    setConfig(cfgRes.snapshot);
                    const nextRoles = cfgRes.snapshot.roles || [];
                    const nextPart = nextRoles.includes(participant) ? participant : (nextRoles[0] || 'Person_A');
                    if (nextPart !== participant) setParticipant(nextPart);
                  }
                } catch {
                  // fallback
                }
              }}
              onTabChange={tab => setActiveTab(tab)}
              currentParticipant={participant}
              onParticipantChange={p => setParticipant(p)}
              config={config}
              annotations={annotations}
              mustChangePassword={Boolean(adminAuth?.mustChangePassword)}
              onOpenPasswordModal={() => setShowPasswordModal(true)}
              onRefreshData={() => {
                loadInitialData();
                refreshLiveState();
                flushOutbox();
              }}
            />
          </div>
        ) : participantAccessDenied ? (
          <div className="participant-view-wrapper">
            <div className="session-locked-banner">
              <ShieldAlert size={30} className="lock-icon" />
              <div>
                <strong>Participant Invite Link Required</strong>
                <p>This participant URL is missing a valid access token. Please open the tokenized live URL generated inside the Researcher Admin Console.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="participant-view-wrapper">
            <div className="mobile-frame-card">
              <div className="mobile-frame-header">
                <span className="mobile-frame-title">Activity Annotator</span>
                <span className="mobile-frame-role">Role: <strong>{participant}</strong></span>
              </div>

              {currentSession && currentSession.status !== 'active' ? (
                <div className="session-locked-banner">
                  <Lock size={26} className="lock-icon" />
                  <div>
                    <strong>Session "{currentSession.id}" is Stopped</strong>
                    <p>Recording is currently paused by the researcher. Your screen will unlock automatically as soon as the admin starts the session.</p>
                  </div>
                </div>
              ) : !config ? (
                <div className="skeleton-panel" aria-busy="true" aria-label="Loading activity configuration">
                  <div className="skeleton-bar skeleton-title" />
                  <div className="skeleton-grid">
                    <div className="skeleton-tile" />
                    <div className="skeleton-tile" />
                    <div className="skeleton-tile" />
                    <div className="skeleton-tile" />
                  </div>
                </div>
              ) : (
                <>
                  {(() => {
                    const soloOnlyActivity = isActivitySoloOnly(chosenActivity, config.interactions);
                    const needsPerson = !soloOnlyActivity && chosenInteraction?.requiresPerson !== false;
                    const displayTotal = soloOnlyActivity ? 3 : (needsPerson ? 5 : 4);
                    const displayStep = soloOnlyActivity && currentStep === 5
                      ? 3
                      : (!needsPerson && currentStep === 5 ? 4 : currentStep);
                    const pct = Math.round((displayStep / displayTotal) * 100);
                    const stepNames: Record<number, string> = {
                      1: 'Location',
                      2: 'Activity',
                      3: 'Interaction',
                      4: 'Collaborator',
                      5: activityStartedAt ? 'Running' : 'Start / Stop'
                    };
                    return (
                      <div className="step-progress-wrap" aria-label={`Step ${displayStep} of ${displayTotal}`}>
                        <div className="step-progress-meta">
                          <span className="step-progress-count">Step {displayStep} of {displayTotal}</span>
                          <span className="step-progress-label">{stepNames[currentStep] || 'Step'}</span>
                        </div>
                        <div className="step-progress-track">
                          <div className="step-progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })()}

                  <BreadcrumbStack
                    currentStep={currentStep}
                    chosenLocation={chosenLocation}
                    chosenActivity={chosenActivity}
                    chosenInteraction={chosenInteraction}
                    chosenPerson={chosenPerson}
                    isSoloOnly={isActivitySoloOnly(chosenActivity, config.interactions)}
                    isRunning={Boolean(activityStartedAt)}
                    onEditStep={handleEditStep}
                  />

                  <div key={currentStep} className="step-stage-transition">
                    {currentStep === 1 && (
                      <Screen1Location
                        locations={config.locations}
                        onSelect={handleLocationSelect}
                        selectedId={chosenLocation?.id}
                      />
                    )}

                    {currentStep === 2 && chosenLocation && (
                      <Screen2Activity
                        location={chosenLocation}
                        activities={config.locationActivitiesMap[chosenLocation.id] || []}
                        onSelect={handleActivitySelect}
                        selectedId={chosenActivity?.id}
                      />
                    )}

                    {currentStep === 3 && (
                      <Screen3Interaction
                        interactions={getAllowedInteractionsForActivity(chosenActivity, config.interactions)}
                        onSelect={handleInteractionSelect}
                        selectedKey={chosenInteraction?.key}
                      />
                    )}

                    {currentStep === 4 && (
                      <Screen4Person
                        currentParticipant={participant}
                        allRoles={config.roles}
                        onSelect={handlePersonSelect}
                        selectedPerson={chosenPerson}
                      />
                    )}

                    {currentStep === 5 && chosenLocation && chosenActivity && chosenInteraction && (
                      <Screen5Review
                        location={chosenLocation}
                        activity={chosenActivity}
                        interaction={chosenInteraction}
                        person={chosenPerson}
                        isSoloOnly={isActivitySoloOnly(chosenActivity, config.interactions)}
                        activityStartedAt={activityStartedAt}
                        onEditStep={handleEditStep}
                        onStartActivity={handleStartActivity}
                        onStopAndSubmit={handleSubmitAnnotation}
                        onCancelActivity={handleCancelActivity}
                        isSubmitting={isSubmitting}
                      />
                    )}
                  </div>
                </>
              )}

              {submitSuccessMsg && (
                <div className="success-overlay">
                  <div className="success-modal">
                    <CheckCircle size={56} className="success-check-icon" />
                    <h3>Annotation Recorded!</h3>
                    <p>{submitSuccessMsg}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
```

---
### File 19: `client/src/components/AdminConsole.tsx`
```tsx
import React, { useState, useEffect, useRef } from 'react';
import type {
  SessionSummaryItem,
  ConfigSnapshot,
  StoredAnnotation,
  EnvironmentItem,
  EnvironmentDraftInput
} from '../types';
import type { MainTabType } from './AppHeader';
import { EnvironmentBuilderModal, snapshotToDraft } from './EnvironmentBuilderModal';
import { parseUploadedEnvironmentFiles } from '../utils/environmentJson';
import { resolveAllowedInteractionKeys } from '../utils/interactions';
import { useNotify } from './InAppNotifications';
import {
  getExportCsvUrl,
  createSession,
  startSession,
  stopSession,
  deleteSession,
  reloadConfig,
  generateTestAnnotation,
  fetchSessionSummaries,
  fetchNetworkInfo,
  fetchParticipantLinks,
  fetchEnvironments,
  importEnvironmentJson,
  downloadEnvironmentJson,
  deleteEnvironment,
  fetchStorageHealth,
  downloadFullBackupJson,
  restoreFullBackupJson,
  fetchGitBackupStatus,
  triggerGitBackupNow
} from '../services/api';
import type { GitBackupStatus } from '../services/api';
import {
  Download,
  Upload,
  Play,
  Square,
  RefreshCw,
  PlusCircle,
  Trash2,
  ExternalLink,
  Copy,
  Radio,
  CheckCircle2,
  FileText,
  Layers,
  CopyPlus,
  Database
} from 'lucide-react';

interface AdminConsoleProps {
  currentSessionId: string;
  activeTab: MainTabType;
  onSelectSession: (sId: string) => void;
  onTabChange?: (tab: MainTabType) => void;
  currentParticipant: string;
  onParticipantChange: (p: string) => void;
  config: ConfigSnapshot | null;
  annotations: StoredAnnotation[];
  onRefreshData: () => void;
  mustChangePassword?: boolean;
  onOpenPasswordModal?: () => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  currentSessionId,
  activeTab,
  onSelectSession,
  onTabChange,
  currentParticipant,
  onParticipantChange,
  config,
  annotations,
  onRefreshData,
  mustChangePassword = false,
  onOpenPasswordModal
}) => {
  const { notify, confirmDialog } = useNotify();
  const [sessions, setSessions] = useState<SessionSummaryItem[]>([]);
  const [environments, setEnvironments] = useState<EnvironmentItem[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string>('default-smart-house');
  const [showEnvBuilder, setShowEnvBuilder] = useState<boolean>(false);
  const [envBuilderDraft, setEnvBuilderDraft] = useState<EnvironmentDraftInput | null>(null);
  const [newSessionId, setNewSessionId] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [filterParticipant, setFilterParticipant] = useState<string>('ALL');
  const [netInfo, setNetInfo] = useState<{ hostIp: string; protocol?: string; localUrl: string; networkUrl: string } | null>(null);
  const [participantTokens, setParticipantTokens] = useState<Record<string, string>>({});
  const [storageHealth, setStorageHealth] = useState<{ engine: string; persistent: boolean; schema?: string } | null>(null);
  const [gitBackupStatus, setGitBackupStatus] = useState<GitBackupStatus | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [isPushingGitBackup, setIsPushingGitBackup] = useState(false);
  const directJsonInputRef = useRef<HTMLInputElement | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  const showFeedback = (msg: string, variant: 'success' | 'error' | 'warning' | 'info' = 'success', title?: string) => {
    notify(msg, variant, title);
  };

  const loadSessions = async () => {
    try {
      const list = await fetchSessionSummaries();
      setSessions(list);
    } catch (e) {
      console.warn('Failed to load session summaries:', e);
    }
  };

  const loadEnvironments = async () => {
    try {
      const envs = await fetchEnvironments();
      setEnvironments(envs);
      if (envs.length > 0 && !envs.some(e => e.id === selectedEnvId)) {
        setSelectedEnvId(envs[0].id);
      }
    } catch (e) {
      console.warn('Failed to load environments:', e);
    }
  };

  useEffect(() => {
    loadSessions();
    loadEnvironments();
    fetchNetworkInfo().then(setNetInfo).catch(() => {});
    fetchStorageHealth()
      .then(h => setStorageHealth({ engine: h.engine, persistent: h.persistent, schema: h.schema }))
      .catch(() => {});
    fetchGitBackupStatus().then(setGitBackupStatus).catch(() => {});
  }, []);

  useEffect(() => {
    if (!currentSessionId) {
      setParticipantTokens({});
      return;
    }
    fetchParticipantLinks(currentSessionId)
      .then(res => setParticipantTokens(res.tokens || {}))
      .catch(() => setParticipantTokens({}));
  }, [currentSessionId]);

  useEffect(() => {
    const t = setInterval(() => {
      loadSessions();
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionId.trim()) return;
    try {
      setIsCreatingSession(true);
      const created = await createSession(newSessionId.trim(), 'Europe/Paris', selectedEnvId);
      setNewSessionId('');
      showFeedback(
        `Session "${created.id}" created using "${created.environment_name || 'Default Smart House'}"!`,
        'success',
        'Session Created'
      );
      await loadSessions();
      onSelectSession(created.id);
      onRefreshData();
    } catch (err: any) {
      showFeedback(`Error creating session: ${err.message}`, 'error', 'Create Session Failed');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleDeleteEnvironment = async (env: EnvironmentItem) => {
    const confirmed = await confirmDialog({
      title: `Delete Environment "${env.name}"?`,
      message: `Existing sessions already using this environment keep their frozen configuration snapshot, but "${env.name}" will be removed from the environment selector.`,
      confirmLabel: 'Delete Environment',
      cancelLabel: 'Cancel',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await deleteEnvironment(env.id);
      showFeedback(`Environment "${env.name}" deleted.`, 'info', 'Environment Deleted');
      if (selectedEnvId === env.id) {
        setSelectedEnvId('default-smart-house');
      }
      await loadEnvironments();
    } catch (err: any) {
      showFeedback(`Error deleting environment: ${err.message}`, 'error', 'Delete Failed');
    }
  };

  const handleDownloadEnvironmentJson = async (envId: string, envName?: string) => {
    try {
      const filename = await downloadEnvironmentJson(envId, envName);
      showFeedback(`Downloaded ${filename}`, 'success', 'Environment JSON Exported');
    } catch (err: any) {
      showFeedback(`Failed to download environment JSON: ${err.message}`, 'error', 'Export Failed');
    }
  };

  const handleDirectImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const { draft, sourceLabel } = await parseUploadedEnvironmentFiles(files);
      const created = await importEnvironmentJson(draft);
      await loadEnvironments();
      setSelectedEnvId(created.id);
      showFeedback(
        `Environment "${created.name}" created from ${sourceLabel} and selected!`,
        'success',
        'Environment Imported'
      );
    } catch (err: any) {
      showFeedback(`Import failed: ${err.message}`, 'error', 'JSON Import Failed');
    } finally {
      e.target.value = '';
    }
  };

  const handleStartSession = async (sId: string) => {
    try {
      await startSession(sId);
      showFeedback(`Session "${sId}" started! Recording is now active.`, 'success', 'Session Started');
      await loadSessions();
      onRefreshData();
    } catch (err: any) {
      showFeedback(`Error starting session: ${err.message}`, 'error', 'Start Failed');
    }
  };

  const handleStopSession = async (sId: string) => {
    try {
      await stopSession(sId);
      showFeedback(`Session "${sId}" stopped! Participant screens locked.`, 'warning', 'Session Stopped');
      await loadSessions();
      onRefreshData();
    } catch (err: any) {
      showFeedback(`Error stopping session: ${err.message}`, 'error', 'Stop Failed');
    }
  };

  const handleDownloadFullBackup = async () => {
    try {
      setIsBackingUp(true);
      const filename = await downloadFullBackupJson();
      showFeedback(`Downloaded complete database backup "${filename}"!`, 'success', 'Backup Downloaded');
    } catch (err: any) {
      showFeedback(`Backup failed: ${err.message}`, 'error', 'Backup Failed');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsRestoringBackup(true);
      const raw = JSON.parse(await file.text());
      const res = await restoreFullBackupJson(raw);
      const s = res.summary;
      showFeedback(
        `Restored ${s.sessionsAdded} session(s), ${s.annotationsAdded} annotation(s), ${s.environmentsAdded} environment(s).`,
        'success',
        'Backup Restored'
      );
      await loadEnvironments();
      await loadSessions();
      onRefreshData();
    } catch (err: any) {
      showFeedback(`Restore failed: ${err.message}`, 'error', 'Restore Failed');
    } finally {
      setIsRestoringBackup(false);
      e.target.value = '';
    }
  };

  const handlePushGitBackupNow = async () => {
    try {
      setIsPushingGitBackup(true);
      const res = await triggerGitBackupNow();
      showFeedback(
        res.skipped
          ? `Private Git repo "${res.repo}" is already up to date.`
          : `Backed up ${res.counts?.sessions ?? 0} sessions and ${res.counts?.annotations ?? 0} annotations to "${res.repo}".`,
        'success',
        'Private Git Backup Saved'
      );
      fetchGitBackupStatus().then(setGitBackupStatus).catch(() => {});
    } catch (err: any) {
      showFeedback(`Private Git backup error: ${err.message}`, 'error', 'Backup Failed');
      fetchGitBackupStatus().then(setGitBackupStatus).catch(() => {});
    } finally {
      setIsPushingGitBackup(false);
    }
  };

  const handleDeleteSession = async (sId: string) => {
    const confirmed = await confirmDialog({
      title: `Delete Session "${sId}"?`,
      message: `This will permanently delete session "${sId}" and all of its stored annotations and participant invite links.`,
      confirmLabel: 'Delete Session',
      cancelLabel: 'Cancel',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await deleteSession(sId);
      showFeedback(`Session "${sId}" deleted.`, 'info', 'Session Deleted');
      await loadSessions();
      const remaining = sessions.filter(s => s.id !== sId);
      if (currentSessionId === sId) {
        onSelectSession(remaining.length > 0 ? remaining[0].id : '');
      }
      onRefreshData();
    } catch (err: any) {
      showFeedback(`Error deleting session: ${err.message}`, 'error', 'Delete Failed');
    }
  };

  const handleReloadConfig = async () => {
    try {
      const res = await reloadConfig();
      showFeedback(`Config reloaded (Hash: ${res.hash.substring(0, 8)})`, 'success', 'Config Reloaded');
      await loadEnvironments();
      onRefreshData();
    } catch (err: any) {
      showFeedback(`Error reloading config: ${err.message}`, 'error', 'Reload Failed');
    }
  };

  const handleQuickInjectAnnotation = async (locId: number, actId: number, interaction = 'solo') => {
    if (!config) return;
    try {
      const loc = config.locations.find(l => l.id === locId) || config.locations[0];
      const validActs = config.locationActivitiesMap[loc.id] || config.activities;
      const act = validActs.find(a => a.id === actId) || validActs[0];
      const otherPerson = interaction !== 'solo' ? (config.roles.find(r => r !== currentParticipant) || '') : '';
      const resolvedInteraction = otherPerson ? interaction : 'solo';

      await generateTestAnnotation({
        session_id: currentSessionId,
        participant: currentParticipant,
        location_id: loc.id,
        activity_id: act.id,
        interaction: resolvedInteraction,
        other_person: otherPerson
      });

      showFeedback(`Injected test: ${loc.shortLabel} / ${act.shortLabel} (${currentParticipant})`, 'success', 'Test Annotation Saved');
      onRefreshData();
      await loadSessions();
    } catch (err: any) {
      showFeedback(`Error generating test annotation: ${err.message}`, 'error', 'Injection Failed');
    }
  };

  const buildParticipantQuery = (role: string) => {
    const tok = participantTokens[role];
    const base = `/?role=${encodeURIComponent(role)}&session=${encodeURIComponent(currentSessionId)}`;
    return tok ? `${base}&token=${encodeURIComponent(tok)}` : base;
  };

  const openParticipantTab = (role: string) => {
    window.open(buildParticipantQuery(role), '_blank');
  };

  const openAllParticipantTabs = () => {
    (config?.roles || ['Person_A', 'Person_B', 'Person_C']).forEach(r => openParticipantTab(r));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showFeedback(`Copied ${label} link to clipboard!`);
  };

  const roles = config?.roles || ['Person_A', 'Person_B', 'Person_C'];
  const activeSessionObj = sessions.find(s => s.id === currentSessionId);
  const isSessionActive = activeSessionObj?.status === 'active';

  const filteredAnnotations = filterParticipant === 'ALL'
    ? annotations
    : annotations.filter(a => a.participant === filterParticipant);

  return (
    <div className="admin-console-pro">
      <input
        ref={directJsonInputRef}
        type="file"
        accept=".json,application/json"
        multiple
        className="hidden-file-input"
        onChange={handleDirectImportJson}
      />
      <input
        ref={backupInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden-file-input"
        onChange={handleRestoreBackupFile}
      />
      {mustChangePassword && (
        <div className="default-pw-banner" role="alert">
          <div>
            <strong>Security Notice:</strong> Default admin password is still active. Please set a custom password for your deployment.
          </div>
          {onOpenPasswordModal && (
            <button type="button" className="btn-ui btn-ui-amber" onClick={onOpenPasswordModal}>
              Change Password Now
            </button>
          )}
        </div>
      )}

      {/* Top Hero Banner */}
      <div className="admin-hero-card">
        <div className="hero-left-col">
          <div className="hero-tag-row">
            <span className="hero-eyebrow">ACTIVE EXPERIMENT SESSION</span>
            <span className={`status-pill ${isSessionActive ? 'pill-active' : 'pill-ended'}`}>
              {!activeSessionObj ? '○ NO SESSION' : isSessionActive ? '● RUNNING' : '■ STOPPED'}
            </span>
            <span className="env-pill-badge">
              <Layers size={12} /> {activeSessionObj?.environment_name || 'Default Smart House'}
            </span>
            <span className="live-poll-badge">
              <Radio size={12} className="live-pulse-icon" /> Live Sync Active
            </span>
          </div>
          <h2 className="hero-session-name">{activeSessionObj ? currentSessionId : 'No Active Session'}</h2>
          <div className="hero-meta-row">
            <span>Started: <strong>{activeSessionObj ? new Date(activeSessionObj.started_at).toLocaleTimeString() : '—'}</strong></span>
            <span>•</span>
            <span>Environment: <strong>{activeSessionObj?.environment_name || 'Default Smart House'}</strong></span>
            <span>•</span>
            <span>Annotations: <strong>{activeSessionObj ? (activeSessionObj.annotation_count ?? annotations.length) : 0}</strong></span>
          </div>
        </div>

        <div className="hero-right-col">
          {activeSessionObj && (isSessionActive ? (
            <button
              className="btn-hero btn-hero-stop"
              onClick={() => handleStopSession(currentSessionId)}
              title="Stop and lock session recording"
            >
              <Square size={18} />
              <span>Stop Session</span>
            </button>
          ) : (
            <button
              className="btn-hero btn-hero-start"
              onClick={() => handleStartSession(currentSessionId)}
              title="Start / Resume session recording"
            >
              <Play size={18} />
              <span>Start Session</span>
            </button>
          ))}
        </div>
      </div>

      {/* MODULE 1: SESSIONS & LIVE PARTICIPANT URLS */}
      {activeTab === 'sessions' && (
        <div className="tab-module-content">
          <section className="pro-section">
            <div className="section-head-pro">
              <div>
                <h3>1. Create &amp; Manage Experiment Sessions</h3>
                <p>Pick an environment (or create a new one), launch a session, and share the generated participant URLs below</p>
              </div>
              <div className="section-head-actions">
                <button
                  type="button"
                  className="btn-ui btn-ui-soft-blue"
                  onClick={() => {
                    setEnvBuilderDraft(null);
                    setShowEnvBuilder(true);
                  }}
                >
                  <Layers size={14} />
                  <span>New Environment</span>
                </button>
                <button
                  type="button"
                  className="btn-ui btn-ui-secondary"
                  onClick={() => directJsonInputRef.current?.click()}
                  title="Upload an exported .json file to create a new environment right away"
                >
                  <Upload size={14} />
                  <span>Import JSON</span>
                </button>
                <button className="btn-ui btn-ui-secondary" onClick={() => { loadSessions(); loadEnvironments(); onRefreshData(); }}>
                  <RefreshCw size={14} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateSession} className="session-create-bar">
              <input
                type="text"
                placeholder="Enter new Session ID (e.g. S002, PILOT_01)..."
                value={newSessionId}
                onChange={e => setNewSessionId(e.target.value)}
                className="ui-input"
              />
              <select
                className="ui-select env-select-input"
                value={selectedEnvId}
                onChange={e => setSelectedEnvId(e.target.value)}
                aria-label="Select environment for new session"
              >
                {environments.length === 0 ? (
                  <option value="default-smart-house">Default Smart House</option>
                ) : (
                  environments.map(env => (
                    <option key={env.id} value={env.id}>
                      {env.name} ({env.snapshot?.roles?.length || 0} roles, {env.snapshot?.locations?.length || 0} rooms)
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                className="btn-ui btn-ui-secondary"
                onClick={() => {
                  const chosen = environments.find(env => env.id === selectedEnvId);
                  handleDownloadEnvironmentJson(selectedEnvId, chosen?.name);
                }}
                title="Download JSON file for the selected environment"
              >
                <Download size={15} />
                <span>Download JSON</span>
              </button>
              <button type="submit" className="btn-ui btn-ui-primary" disabled={isCreatingSession}>
                <PlusCircle size={16} />
                <span>Create Session</span>
              </button>
            </form>

            <div className="table-responsive">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Session ID</th>
                    <th>Environment</th>
                    <th>Status</th>
                    <th>Started</th>
                    <th>Annotations</th>
                    <th>Active Residents</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty-state-box">
                          No experiment sessions created yet. Choose an environment above and click <strong>Create Session</strong> when you are ready.
                        </div>
                      </td>
                    </tr>
                  ) : sessions.map(s => {
                    const isSelected = s.id === currentSessionId;
                    return (
                      <tr key={s.id} className={isSelected ? 'row-selected' : ''}>
                        <td>
                          <div className="session-id-cell">
                            <strong>{s.id}</strong>
                            {isSelected && <span className="current-badge">ACTIVE TARGET</span>}
                          </div>
                        </td>
                        <td>
                          <span className="badge-env-cell">
                            <Layers size={12} /> {s.environment_name || 'Default Smart House'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${s.status === 'active' ? 'pill-active' : 'pill-ended'}`}>
                            {s.status === 'active' ? '● active' : '■ stopped'}
                          </span>
                        </td>
                        <td>{new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                        <td><strong>{s.annotation_count ?? 0}</strong></td>
                        <td>{s.active_participants || '—'}</td>
                        <td>
                          <div className="table-action-group">
                            {!isSelected && (
                              <button
                                className="btn-table btn-table-select"
                                onClick={() => {
                                  onSelectSession(s.id);
                                  showFeedback(`Switched target to session "${s.id}"`);
                                }}
                              >
                                Select
                              </button>
                            )}

                            {s.status === 'active' ? (
                              <button
                                className="btn-table btn-table-stop"
                                onClick={() => handleStopSession(s.id)}
                              >
                                <Square size={12} /> Stop
                              </button>
                            ) : (
                              <button
                                className="btn-table btn-table-start"
                                onClick={() => handleStartSession(s.id)}
                              >
                                <Play size={12} /> Start
                              </button>
                            )}

                            <a
                              href={getExportCsvUrl(s.id)}
                              download={`${s.id}_all.csv`}
                              className="btn-table btn-table-csv"
                            >
                              <Download size={12} /> CSV
                            </a>

                            <button
                              className="btn-table btn-table-delete"
                              onClick={() => handleDeleteSession(s.id)}
                              title="Delete session"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="pro-section multi-user-hub">
            <div className="section-head-pro">
              <div>
                <h3>2. Live Participant URLs {activeSessionObj ? `for Session "${currentSessionId}"` : ''}</h3>
                <p>Share each participant's dedicated link below so they can join from any device or network (mobile data, Wi-Fi, tablet, or desktop)</p>
              </div>
              {activeSessionObj && (
                <button className="btn-ui btn-ui-accent" onClick={openAllParticipantTabs}>
                  <ExternalLink size={15} />
                  <span>Open All {roles.length} Participant Tabs</span>
                </button>
              )}
            </div>

            {!activeSessionObj ? (
              <div className="empty-state-box">
                Create or select a session in Section 1 above to generate tokenized participant invite links.
              </div>
            ) : (
              <div className="participant-launch-grid">
                {roles.map(role => {
                  const queryPath = buildParticipantQuery(role);
                  const liveBaseUrl = netInfo?.networkUrl || window.location.origin;
                  const participantUrl = `${liveBaseUrl}${queryPath}`;
                  return (
                    <div key={role} className="participant-launch-card">
                      <div className="launch-card-header">
                        <div className="launch-role-badge">{role}</div>
                        <button
                          className="btn-ui btn-ui-soft-blue"
                          onClick={() => openParticipantTab(role)}
                        >
                          <span>Open Tab</span>
                          <ExternalLink size={13} />
                        </button>
                      </div>

                      <div className="launch-url-group">
                        <span className="url-type-label">Participant Access URL:</span>
                        <div className="launch-url-box">
                          <span className="launch-url-text">{participantUrl}</span>
                          <button
                            className="btn-copy-icon"
                            onClick={() => copyToClipboard(participantUrl, role)}
                            title={`Copy ${role} URL`}
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* MODULE 2: LIVE DATA FEED & CSV EXPORTS */}
      {activeTab === 'data' && (
        <div className="tab-module-content">
          {!activeSessionObj ? (
            <section className="pro-section">
              <div className="empty-state-box">
                No session selected yet. Create a session in the <strong>Sessions &amp; Live URLs</strong> tab to view annotations, inject test records, or export CSV datasets.
              </div>
            </section>
          ) : (
            <>
              <section className="pro-section">
                <div className="section-head-pro">
                  <div>
                    <h3>Export PRD-Compliant CSV Datasets</h3>
                    <p>Download Excel-ready datasets (UTF-8 BOM, local Date, Start &amp; Submit Times, Duration, and PRD §8 columns)</p>
                  </div>
                </div>

                <div className="export-cards-row">
                  <a
                    href={getExportCsvUrl(currentSessionId)}
                    download={`${currentSessionId}_all.csv`}
                    className="export-box-card export-box-combined"
                  >
                    <div className="export-icon-circle combined-circle">
                      <Download size={22} />
                    </div>
                    <div>
                      <div className="export-box-title">{currentSessionId}_all.csv</div>
                      <div className="export-box-desc">All {roles.length} participants together sorted by timestamp</div>
                    </div>
                  </a>

                  {roles.map(role => (
                    <a
                      key={role}
                      href={getExportCsvUrl(currentSessionId, role)}
                      download={`${currentSessionId}_${role}.csv`}
                      className="export-box-card export-box-individual"
                    >
                      <div className="export-icon-circle individual-circle">
                        <Download size={18} />
                      </div>
                      <div>
                        <div className="export-box-title">{currentSessionId}_{role}.csv</div>
                        <div className="export-box-desc">Individual records only</div>
                      </div>
                    </a>
                  ))}
                </div>
              </section>

              <section className="pro-section">
                <div className="section-head-pro">
                  <div>
                    <h3>Quick Test Annotation Injector</h3>
                    <p>Instantly inject simulated annotations into session "{currentSessionId}" to verify data feeds &amp; exports</p>
                  </div>
                  <div className="participant-select-inline">
                    <span className="role-select-label">Inject As:</span>
                    {roles.map(r => (
                      <button
                        key={r}
                        className={`role-tab-btn ${currentParticipant === r ? 'active' : ''}`}
                        onClick={() => onParticipantChange(r)}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="quick-inject-buttons">
                  {(() => {
                    const samples: Array<{ locId: number; actId: number; label: string; interaction: string }> = [];
                    let firstCollabSample: { locId: number; actId: number; label: string } | null = null;
                    for (const loc of config?.locations || []) {
                      const acts = config?.locationActivitiesMap?.[loc.id] || [];
                      for (const act of acts) {
                        const baseLabel = `+ ${loc.shortLabel || loc.name}: ${act.shortLabel || act.name}`;
                        const allowedKeys = resolveAllowedInteractionKeys(act);
                        if (!firstCollabSample && allowedKeys.includes('collaborative')) {
                          firstCollabSample = { locId: loc.id, actId: act.id, label: baseLabel };
                        }
                        if (samples.length < 5) {
                          const sampleKey = allowedKeys.includes('solo') ? 'solo' : allowedKeys[0];
                          const shortTag = sampleKey === 'collaborative' ? 'Collab' : sampleKey === 'assistive' ? 'Assisted' : 'Solo';
                          samples.push({
                            locId: loc.id,
                            actId: act.id,
                            label: `${baseLabel} (${shortTag})`,
                            interaction: sampleKey
                          });
                        }
                      }
                      if (samples.length >= 5 && firstCollabSample) break;
                    }
                    if (firstCollabSample && roles.length >= 2) {
                      samples.push({
                        locId: firstCollabSample.locId,
                        actId: firstCollabSample.actId,
                        label: `${firstCollabSample.label} (Collab)`,
                        interaction: 'collaborative'
                      });
                    }
                    return samples.map((item, idx) => (
                      <button
                        key={`${item.locId}-${item.actId}-${item.interaction}-${idx}`}
                        className="btn-quick-inject"
                        onClick={() => handleQuickInjectAnnotation(item.locId, item.actId, item.interaction)}
                      >
                        {item.label}
                      </button>
                    ));
                  })()}
                </div>
              </section>

              <section className="pro-section">
                <div className="section-head-pro">
                  <div>
                    <h3>Real-Time Session Annotations Log ({filteredAnnotations.length})</h3>
                    <p>Live incoming participant records for session "{currentSessionId}"</p>
                  </div>

                  <div className="filter-pill-row">
                    <button
                      className={`filter-pill ${filterParticipant === 'ALL' ? 'active' : ''}`}
                      onClick={() => setFilterParticipant('ALL')}
                    >
                      All ({annotations.length})
                    </button>
                    {roles.map(r => (
                      <button
                        key={r}
                        className={`filter-pill ${filterParticipant === r ? 'active' : ''}`}
                        onClick={() => setFilterParticipant(r)}
                      >
                        {r} ({annotations.filter(a => a.participant === r).length})
                      </button>
                    ))}
                  </div>
                </div>

                {filteredAnnotations.length === 0 ? (
                  <div className="empty-state-box">No annotations recorded for this filter in session "{currentSessionId}".</div>
                ) : (
                  <div className="table-responsive">
                    <table className="ui-table">
                      <thead>
                        <tr>
                          <th>Seq #</th>
                          <th>Participant</th>
                          <th>Date</th>
                          <th>Started</th>
                          <th>Stopped</th>
                          <th>Duration</th>
                          <th>Location</th>
                          <th>Activity</th>
                          <th>Interaction</th>
                          <th>Other Person</th>
                          <th>Edited</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...filteredAnnotations].reverse().map((a, i) => {
                          const startMs = a.timestamp_started ? Date.parse(a.timestamp_started) : NaN;
                          const stopMs = a.timestamp_submitted ? Date.parse(a.timestamp_submitted) : NaN;
                          const durSec = !Number.isNaN(startMs) && !Number.isNaN(stopMs)
                            ? `${Math.max(0, (stopMs - startMs) / 1000).toFixed(1)}s`
                            : '—';
                          return (
                            <tr key={a.client_uuid || i}>
                              <td><strong>{a.seq || filteredAnnotations.length - i}</strong></td>
                              <td><span className="badge-participant">{a.participant}</span></td>
                              <td><span className="mono-time">{a.timestamp_submitted ? new Date(a.timestamp_submitted).toLocaleDateString() : '—'}</span></td>
                              <td><span className="mono-time">{a.timestamp_started ? new Date(a.timestamp_started).toLocaleTimeString() : '—'}</span></td>
                              <td><span className="mono-time">{a.timestamp_submitted ? new Date(a.timestamp_submitted).toLocaleTimeString() : '—'}</span></td>
                              <td><span className="mono-time">{durSec}</span></td>
                              <td>{a.location}</td>
                              <td><strong>{a.activity}</strong></td>
                              <td><span className="badge-interaction">{a.interaction}</span></td>
                              <td>{a.other_person ? <span className="badge-other-person">{a.other_person}</span> : '—'}</td>
                              <td>{a.edited ? 'Yes' : 'No'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {/* MODULE 3: ENVIRONMENTS, DATABASE BACKUPS & CONFIGURATION INTEGRITY */}
      {activeTab === 'config' && (
        <div className="tab-module-content">
          <section className="pro-section">
            <div className="section-head-pro">
              <div>
                <h3>
                  <Database size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                  Database Storage &amp; Full Backup
                </h3>
                <p>
                  Active storage:{' '}
                  <strong>
                    {storageHealth?.engine === 'postgresql'
                      ? `PostgreSQL (Isolated schema "${storageHealth.schema || 'public'}")`
                      : storageHealth?.engine === 'sqlite'
                        ? (storageHealth.persistent ? 'SQLite (Persistent Disk)' : 'Local SQLite')
                        : 'Checking...'}
                  </strong>{' '}
                  • Download a complete portable snapshot of all sessions, annotations, custom environments, and invite tokens, or restore anytime.
                </p>
              </div>
              <div className="section-head-actions">
                <button
                  type="button"
                  className="btn-ui btn-ui-secondary"
                  disabled={isRestoringBackup}
                  onClick={() => backupInputRef.current?.click()}
                  title="Restore sessions, environments, and annotations from a smarthouse-backup .json file"
                >
                  <Upload size={15} />
                  <span>{isRestoringBackup ? 'Restoring...' : 'Restore Backup (.json)'}</span>
                </button>
                <button
                  type="button"
                  className="btn-ui btn-ui-primary"
                  disabled={isBackingUp}
                  onClick={handleDownloadFullBackup}
                  title="Download full database backup JSON (all sessions, environments, annotations, invite tokens)"
                >
                  <Download size={15} />
                  <span>{isBackingUp ? 'Preparing...' : 'Download Full Backup (.json)'}</span>
                </button>
              </div>
            </div>

            <div className={`git-backup-panel ${gitBackupStatus?.configured ? 'is-configured' : 'is-unconfigured'}`}>
              <div className="git-backup-info">
                <div className="git-backup-title-row">
                  <strong>Automatic Private GitHub Backup:</strong>
                  <span className={`status-pill ${gitBackupStatus?.configured ? 'pill-active' : 'pill-ended'}`}>
                    {gitBackupStatus?.configured ? '● AUTO-BACKUP ACTIVE' : 'NOT CONFIGURED'}
                  </span>
                </div>
                {gitBackupStatus?.configured ? (
                  <p className="git-backup-desc">
                    Commits <code>backups/latest.json</code> and daily snapshots to private repository{' '}
                    <code>{gitBackupStatus.repo}</code> on session stop/environment updates and daily schedule.
                    {gitBackupStatus.lastSuccessAt && (
                      <> Last saved: <strong>{new Date(gitBackupStatus.lastSuccessAt).toLocaleString()}</strong>.</>
                    )}
                    {gitBackupStatus.lastStatus === 'error' && gitBackupStatus.lastError && (
                      <span className="git-backup-err"> Last error: {gitBackupStatus.lastError}</span>
                    )}
                  </p>
                ) : (
                  <p className="git-backup-desc">
                    Create a dedicated <strong>private</strong> GitHub repository (e.g. <code>ptech8000/smarthouse-annotator-backups</code>) and set{' '}
                    <code>GITHUB_BACKUP_REPO</code> + <code>GITHUB_BACKUP_TOKEN</code> in Vercel Project Settings → Environment Variables.
                  </p>
                )}
              </div>
              {gitBackupStatus?.configured && (
                <button
                  type="button"
                  className="btn-ui btn-ui-soft-blue"
                  disabled={isPushingGitBackup}
                  onClick={handlePushGitBackupNow}
                >
                  <RefreshCw size={14} />
                  <span>{isPushingGitBackup ? 'Pushing...' : 'Push to Private Git Now'}</span>
                </button>
              )}
            </div>
          </section>

          <section className="pro-section">
            <div className="section-head-pro">
              <div>
                <h3>Environments Library ({environments.length})</h3>
                <p>Create custom environments, download an environment's JSON file, or upload a JSON file to create a new environment</p>
              </div>
              <div className="section-head-actions">
                <button
                  type="button"
                  className="btn-ui btn-ui-secondary"
                  onClick={() => directJsonInputRef.current?.click()}
                  title="Upload a .json file to immediately create a new environment"
                >
                  <Upload size={15} />
                  <span>Create from JSON Upload</span>
                </button>
                <button
                  type="button"
                  className="btn-ui btn-ui-primary"
                  onClick={() => {
                    setEnvBuilderDraft(null);
                    setShowEnvBuilder(true);
                  }}
                >
                  <PlusCircle size={15} />
                  <span>Create New Environment</span>
                </button>
              </div>
            </div>

            <div className="env-cards-grid">
              {environments.map(env => (
                <div key={env.id} className={`env-library-card ${env.id === selectedEnvId ? 'env-selected' : ''}`}>
                  <div className="env-card-top">
                    <div>
                      <div className="env-card-badges">
                        <span className={`status-pill ${env.is_default ? 'pill-blue' : 'pill-active'}`}>
                          {env.is_default ? 'BUILT-IN' : 'CUSTOM'}
                        </span>
                      </div>
                      <h4 className="env-card-title">{env.name}</h4>
                    </div>
                    {!env.is_default && (
                      <button
                        type="button"
                        className="btn-table btn-table-delete"
                        onClick={() => handleDeleteEnvironment(env)}
                        title={`Delete environment ${env.name}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {env.description && <p className="env-card-desc">{env.description}</p>}

                  <div className="env-card-stats">
                    <span><strong>{env.snapshot?.roles?.length || 0}</strong> roles</span>
                    <span>•</span>
                    <span><strong>{env.snapshot?.locations?.length || 0}</strong> rooms</span>
                    <span>•</span>
                    <span><strong>{env.snapshot?.activities?.length || 0}</strong> activities</span>
                  </div>

                  <div className="env-card-roles">
                    {(env.snapshot?.roles || []).map(r => (
                      <span key={r} className="badge-participant">{r}</span>
                    ))}
                  </div>

                  <div className="env-card-actions">
                    <button
                      type="button"
                      className="btn-ui btn-ui-soft-blue"
                      onClick={() => {
                        setSelectedEnvId(env.id);
                        onTabChange?.('sessions');
                        showFeedback(`Selected "${env.name}" for your next session.`, 'info', 'Environment Selected');
                      }}
                    >
                      <Play size={13} />
                      <span>Use for New Session</span>
                    </button>
                    <button
                      type="button"
                      className="btn-ui btn-ui-secondary"
                      onClick={() => handleDownloadEnvironmentJson(env.id, env.name)}
                      title={`Download JSON file for ${env.name}`}
                    >
                      <Download size={13} />
                      <span>Download JSON</span>
                    </button>
                    {env.snapshot && (
                      <button
                        type="button"
                        className="btn-ui btn-ui-secondary"
                        onClick={() => {
                          setEnvBuilderDraft(snapshotToDraft(env.snapshot, `${env.name} Copy`));
                          setShowEnvBuilder(true);
                        }}
                      >
                        <CopyPlus size={13} />
                        <span>Clone &amp; Edit</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="pro-section">
            <div className="section-head-pro">
              <div>
                <h3>Active Configuration Snapshot &amp; Data Integrity {activeSessionObj ? `(${currentSessionId})` : '(Default Preset)'}</h3>
                <p>
                  {activeSessionObj
                    ? `Frozen configuration snapshot active in session "${currentSessionId}" (${activeSessionObj.environment_name || 'Default Smart House'})`
                    : 'Built-in Default Smart House configuration snapshot (no active session selected)'}
                </p>
              </div>
              <button className="btn-ui btn-ui-secondary" onClick={handleReloadConfig}>
                <RefreshCw size={14} />
                <span>Reload Default JSONs</span>
              </button>
            </div>

            <div className="config-summary-grid">
              <div className="config-metric">
                <span className="cfg-lbl">Config Version Hash</span>
                <code>{config?.hash?.substring(0, 24)}...</code>
              </div>
              <div className="config-metric">
                <span className="cfg-lbl">Rooms / Locations</span>
                <strong>{config?.locations?.length || 0} locations</strong>
              </div>
              <div className="config-metric">
                <span className="cfg-lbl">Activities Configured</span>
                <strong>{config?.activities?.length || 0} activities</strong>
              </div>
              <div className="config-metric">
                <span className="cfg-lbl">Residents</span>
                <strong>{config?.residentNumber || 0} ({config?.roles?.join(', ')})</strong>
              </div>
            </div>
          </section>

          <section className="pro-section">
            <div className="section-head-pro">
              <div>
                <h3>Default File Manifest (Built-In Smart House)</h3>
                <p>Base JSON templates loaded from the repository root</p>
              </div>
            </div>

            <div className="config-files-list">
              <div className="config-file-row">
                <FileText size={18} className="file-icon" />
                <div>
                  <strong>scenario.json</strong>
                  <p>Active session roles: {config?.roles.join(', ')} ({config?.residentNumber} total)</p>
                </div>
                <CheckCircle2 size={18} className="file-ok-icon" />
              </div>

              <div className="config-file-row">
                <FileText size={18} className="file-icon" />
                <div>
                  <strong>locations.json</strong>
                  <p>{config?.locations.length} rooms mapped with normalized zoning</p>
                </div>
                <CheckCircle2 size={18} className="file-ok-icon" />
              </div>

              <div className="config-file-row">
                <FileText size={18} className="file-icon" />
                <div>
                  <strong>activities.json &amp; activities_location.json</strong>
                  <p>{config?.activities.length} activities mapped to rooms</p>
                </div>
                <CheckCircle2 size={18} className="file-ok-icon" />
              </div>
            </div>
          </section>
        </div>
      )}

      <EnvironmentBuilderModal
        isOpen={showEnvBuilder}
        initialDraft={envBuilderDraft}
        currentConfig={config}
        onClose={() => setShowEnvBuilder(false)}
        onCreated={async createdEnv => {
          await loadEnvironments();
          setSelectedEnvId(createdEnv.id);
        }}
      />
    </div>
  );
};
```

---

## 7. Automated Test Suite

### File 20: `test_app.js`
```js
const assert = require('assert');
const {
  loadAndValidateConfig,
  buildEnvironmentConfig,
  buildEnvironmentExportPayload,
  parseEnvironmentImportPayload
} = require('./server/configPipeline');
const db = require('./server/database');
const gitBackup = require('./server/gitBackup');
const { generateAnnotationsCsv } = require('./server/csvExport');
const { hashPassword, verifyPassword, validateAnnotationPayload, validateSessionId } = require('./server/security');

async function runTests() {
  console.log('=== STARTING TEST SUITE ===');

  // Test 1: Config Pipeline (Annotation-Only, no sensors object)
  console.log('\n[1/10] Testing Config Pipeline...');
  const cfg = loadAndValidateConfig();
  assert.strictEqual(cfg.valid, true, 'Config must be valid');
  assert.ok(cfg.hash, 'Hash must be generated');
  assert.strictEqual(cfg.snapshot.roles.length, 3, 'Must have 3 roles');
  assert.strictEqual(cfg.snapshot.locations.length, 11, 'Must have 11 locations');
  assert.ok(cfg.snapshot.activities.length >= 19, 'Must have at least 19 activities');
  assert.strictEqual(cfg.snapshot.sensors, undefined, 'Snapshot must not contain smartwatch sensor configuration');

  const livingActs = cfg.snapshot.locationActivitiesMap[2];
  assert.ok(livingActs.some(a => a.id === 19), 'Living must include vacuuming (id 19)');
  const landingActs = cfg.snapshot.locationActivitiesMap[5];
  assert.ok(landingActs.length > 0, 'Landing area must have activities mapped');
  const bed1Acts = cfg.snapshot.locationActivitiesMap[6];
  assert.ok(bed1Acts.length > 0, 'Bedroom 1 must have activities mapped');
  console.log('✓ Config Pipeline passed all checks');

  // Test 2: Database Operations & Idempotency
  console.log('\n[2/10] Testing Database & Idempotency...');
  await db.init();
  assert.strictEqual(await db.ping(), true, 'Database ping must succeed');
  const testSessionId = 'TEST_' + Date.now();
  const session = await db.createSession(testSessionId, cfg.hash, cfg.snapshot, 'Europe/Paris');
  assert.strictEqual(session.id, testSessionId);
  assert.strictEqual(session.status, 'active');

  const clientUuid = 'uuid_' + Date.now();
  const annotationPayload = {
    client_uuid: clientUuid,
    session_id: testSessionId,
    participant: 'Person_A',
    timestamp_started: new Date(Date.now() - 5000).toISOString(),
    timestamp_submitted: new Date().toISOString(),
    location_id: 2,
    location: 'living',
    activity_id: 19,
    activity: 'vacuuming living',
    interaction: 'solo',
    other_person: '',
    edited: 0,
    config_version: cfg.hash
  };

  const firstSave = await db.saveAnnotation(annotationPayload);
  assert.strictEqual(firstSave.isDuplicate, false, 'First save must not be duplicate');
  assert.strictEqual(firstSave.row.seq, 1, 'First annotation seq must be 1');

  const secondSave = await db.saveAnnotation(annotationPayload);
  assert.strictEqual(secondSave.isDuplicate, true, 'Duplicate save must be detected');
  assert.strictEqual(secondSave.row.client_uuid, clientUuid);
  console.log('✓ Database & Idempotency passed all checks');

  // Test 3: PRD CSV Export Format
  console.log('\n[3/10] Testing CSV Export...');
  const annotations = await db.getAnnotations(testSessionId);
  assert.strictEqual(annotations.length, 1);
  const csv = generateAnnotationsCsv(annotations);
  assert.ok(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM');

  const lines = csv.replace('\uFEFF', '').split('\r\n');
  const expectedHeaders = 'session_id,participant,annotation_id,date,time_started,time_submitted,duration_sec,timezone,timestamp_submitted,timestamp_started,location_id,location,activity_id,activity,interaction,other_person,edited,config_version';
  assert.strictEqual(lines[0], expectedHeaders);
  assert.ok(lines[1].includes(testSessionId));
  assert.ok(/\d{4}-\d{2}-\d{2},\d{2}:\d{2}:\d{2}\.\d{3}Z,\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(lines[1]));
  assert.ok(lines[1].includes('Person_A'));
  assert.ok(lines[1].includes('vacuuming living'));
  console.log('✓ CSV Export strictly matches event date/time + PRD §8');

  // Test 4: Security Controls
  console.log('\n[4/10] Testing Security Controls...');
  const { hash, salt } = hashPassword('MySecurePass123!');
  assert.strictEqual(verifyPassword('MySecurePass123!', hash, salt), true, 'Valid password must verify');
  assert.strictEqual(verifyPassword('WrongPass', hash, salt), false, 'Wrong password must fail');

  assert.strictEqual(validateSessionId('valid_Session-01').valid, true);
  assert.strictEqual(validateSessionId('../bad!id').valid, false);

  const selfLockAttempt = validateAnnotationPayload({
    client_uuid: 'c-1',
    session_id: testSessionId,
    participant: 'Person_A',
    timestamp_started: new Date(Date.now() - 2000).toISOString(),
    timestamp_submitted: new Date().toISOString(),
    location_id: 2,
    activity_id: 19,
    interaction: 'collaborative',
    other_person: 'Person_A'
  }, cfg.snapshot);
  assert.strictEqual(selfLockAttempt.valid, false, 'Self-collaborator selection must be rejected');

  const formulaCsv = generateAnnotationsCsv([{
    ...annotations[0],
    session_id: '=HYPERLINK("http://example.com")',
    other_person: '+cmd|calc'
  }]);
  assert.ok(formulaCsv.includes("'=HYPERLINK"), 'CSV formula injection must be neutralized');

  await db.deleteSession(testSessionId);
  console.log('✓ Security controls passed all checks');

  // Test 5: Custom Environment Creation & Session Binding
  console.log('\n[5/10] Testing Custom Environment Creation...');
  const builtEnv = buildEnvironmentConfig({
    name: 'Rehab Kitchen Lab',
    description: '2-participant clinic environment',
    roles: ['Resident_1', 'Caregiver_1'],
    locations: [
      { name: 'Prep Station', shortLabel: 'Prep', activities: ['chopping vegetables', 'pouring tea'] },
      { name: 'Dining Desk', shortLabel: 'Desk', activities: ['eating meal', 'pouring tea'] }
    ]
  });
  assert.strictEqual(builtEnv.valid, true);
  assert.strictEqual(builtEnv.snapshot.roles.length, 2);
  assert.strictEqual(builtEnv.snapshot.locations.length, 2);
  assert.strictEqual(builtEnv.snapshot.activities.length, 3);

  const envId = 'env_test_' + Date.now();
  const savedEnv = await db.createEnvironment({
    id: envId,
    name: builtEnv.name,
    description: builtEnv.description,
    configHash: builtEnv.hash,
    configSnapshot: builtEnv.snapshot
  });
  assert.strictEqual(savedEnv.name, 'Rehab Kitchen Lab');

  const customSessionId = 'ENV_SESS_' + Date.now();
  const customSess = await db.createSession(
    customSessionId,
    savedEnv.config_hash,
    savedEnv.snapshot,
    'Europe/Paris',
    savedEnv.id,
    savedEnv.name
  );
  assert.strictEqual(customSess.environment_id, envId);

  const customAnnCheck = validateAnnotationPayload({
    client_uuid: 'env-uuid-' + Date.now(),
    session_id: customSessionId,
    participant: 'Resident_1',
    timestamp_started: new Date(Date.now() - 3000).toISOString(),
    timestamp_submitted: new Date().toISOString(),
    location_id: savedEnv.snapshot.locations[0].id,
    activity_id: savedEnv.snapshot.locationActivitiesMap[savedEnv.snapshot.locations[0].id][0].id,
    interaction: 'assistive',
    other_person: 'Caregiver_1'
  }, savedEnv.snapshot);
  assert.strictEqual(customAnnCheck.valid, true);

  await db.deleteSession(customSessionId);
  await db.deleteEnvironment(envId);
  console.log('✓ Custom Environment creation & session binding passed all checks');

  // Test 6: Unrestricted Multi-Person Pairing & Concurrent Sequence Safety
  console.log('\n[6/10] Testing Unrestricted Multi-Person Pairing...');
  const pairSessId = 'PAIR_TEST_' + Date.now();
  await db.createSession(pairSessId, cfg.hash, cfg.snapshot, 'Europe/Paris');

  const [pairAB, pairAC, pairCB] = await Promise.all([
    db.saveAnnotation({
      client_uuid: 'pair-ab-' + Date.now(),
      session_id: pairSessId,
      participant: 'Person_A',
      timestamp_started: new Date(Date.now() - 4000).toISOString(),
      timestamp_submitted: new Date().toISOString(),
      location_id: 2,
      location: 'living',
      activity_id: 19,
      activity: 'vacuuming living',
      interaction: 'collaborative',
      other_person: 'Person_B',
      edited: 0,
      config_version: cfg.hash
    }),
    db.saveAnnotation({
      client_uuid: 'pair-ac-' + Date.now(),
      session_id: pairSessId,
      participant: 'Person_A',
      timestamp_started: new Date(Date.now() - 3000).toISOString(),
      timestamp_submitted: new Date().toISOString(),
      location_id: 2,
      location: 'living',
      activity_id: 19,
      activity: 'vacuuming living',
      interaction: 'collaborative',
      other_person: 'Person_C',
      edited: 0,
      config_version: cfg.hash
    }),
    db.saveAnnotation({
      client_uuid: 'pair-cb-' + Date.now(),
      session_id: pairSessId,
      participant: 'Person_C',
      timestamp_started: new Date(Date.now() - 2000).toISOString(),
      timestamp_submitted: new Date().toISOString(),
      location_id: 2,
      location: 'living',
      activity_id: 19,
      activity: 'vacuuming living',
      interaction: 'collaborative',
      other_person: 'Person_B',
      edited: 0,
      config_version: cfg.hash
    })
  ]);
  assert.strictEqual(pairAB.row.other_person, 'Person_B');
  assert.strictEqual(pairAC.row.other_person, 'Person_C');
  assert.strictEqual(pairCB.row.other_person, 'Person_B');
  assert.notStrictEqual(pairAB.row.seq, pairAC.row.seq);
  assert.strictEqual((await db.getSessionLocks(pairSessId)).length, 0);

  const summaries = await db.getSessionSummaries();
  const pairSummary = summaries.find(s => s.id === pairSessId);
  assert.strictEqual(pairSummary.annotation_count, 3);
  assert.strictEqual(pairSummary.chunk_count, undefined);

  await db.deleteSession(pairSessId);
  console.log('✓ Unrestricted multi-person pairing passed all checks');

  // Test 7: Environment JSON Export & Upload/Import Round-Trip
  console.log('\n[7/10] Testing Environment JSON Export & Import Round-Trip...');
  const srcBuilt = buildEnvironmentConfig({
    name: 'Smart Loft 4A',
    description: 'Export/import verification layout',
    roles: ['Roommate_A', 'Roommate_B', 'Assistant_A'],
    locations: [
      { name: 'Kitchen', shortLabel: 'Kitchen', activities: ['Preparing hot drink', 'Preparing meals'] },
      { name: 'Living', shortLabel: 'Living', activities: ['Operating TV', 'Relaxing on couch'] }
    ]
  });
  assert.strictEqual(srcBuilt.valid, true);
  const exportedJson = buildEnvironmentExportPayload({
    id: 'env_src',
    name: srcBuilt.name,
    description: srcBuilt.description,
    config_hash: srcBuilt.hash,
    snapshot: srcBuilt.snapshot
  });
  assert.strictEqual(exportedJson.format, 'smarthouse-environment-v1');
  assert.strictEqual(exportedJson.sensors, undefined);

  const importedDraft = parseEnvironmentImportPayload(exportedJson, 'Fallback');
  const rebuilt = buildEnvironmentConfig(importedDraft);
  assert.strictEqual(rebuilt.valid, true);
  assert.strictEqual(rebuilt.name, 'Smart Loft 4A');
  assert.deepStrictEqual(rebuilt.snapshot.roles, ['Roommate_A', 'Roommate_B', 'Assistant_A']);
  assert.strictEqual(rebuilt.snapshot.locations.length, 2);
  assert.strictEqual(rebuilt.snapshot.activities.length, 4);
  console.log('✓ Environment JSON Export & Import round-trip passed all checks');

  // Test 8: Solo-Only Activity Interaction Enforcement
  console.log('\n[8/10] Testing Solo-Only Activity Interaction Enforcement...');
  const toiletActs = cfg.snapshot.locationActivitiesMap[9];
  const usingToilet = toiletActs.find(a => a.id === 11);
  assert.ok(usingToilet && usingToilet.canDoTogether === false);

  const rejectCollabOnToilet = validateAnnotationPayload({
    client_uuid: 'solo-guard-' + Date.now(),
    session_id: 'S_SOLO_TEST',
    participant: 'Person_A',
    timestamp_started: new Date(Date.now() - 2000).toISOString(),
    timestamp_submitted: new Date().toISOString(),
    location_id: 9,
    activity_id: 11,
    interaction: 'collaborative',
    other_person: 'Person_B'
  }, cfg.snapshot);
  assert.strictEqual(rejectCollabOnToilet.valid, false);

  const customRuleBuilt = buildEnvironmentConfig({
    name: 'Clinic Suite',
    roles: ['Resident_A', 'Nurse_1'],
    locations: [
      {
        name: 'Bathroom',
        activities: [
          { name: 'bathing', allowedInteractions: ['solo'] },
          { name: 'assisted wash', allowedInteractions: ['solo', 'assistive'] },
          { name: 'group cleanup', allowedInteractions: ['solo', 'collaborative'] }
        ]
      }
    ]
  });
  assert.strictEqual(customRuleBuilt.valid, true);
  const washAct = customRuleBuilt.snapshot.locationActivitiesMap[0].find(a => a.name === 'assisted wash');
  assert.deepStrictEqual(washAct.allowedInteractions, ['solo', 'assistive']);
  console.log('✓ Solo/Collab/Assisted activity rules passed all checks');

  // Test 9: Full Database Backup Export & Restore Round-Trip
  console.log('\n[9/10] Testing Full Database Backup Export & Restore...');
  const bkEnvBuilt = buildEnvironmentConfig({
    name: 'Backup Verification Wing',
    roles: ['Resident_X', 'Resident_Y'],
    locations: [{ name: 'Study', activities: [{ name: 'reading', allowedInteractions: ['solo'] }] }]
  });
  const bkEnv = await db.createEnvironment({
    id: 'env_bk_' + Date.now(),
    name: bkEnvBuilt.name,
    description: 'Backup check',
    configHash: bkEnvBuilt.hash,
    configSnapshot: bkEnvBuilt.snapshot
  });
  const bkSessId = 'BK_SESS_' + Date.now();
  await db.createSession(bkSessId, bkEnv.config_hash, bkEnv.snapshot, 'Europe/Paris', bkEnv.id, bkEnv.name);
  await db.ensureParticipantTokens(bkSessId, bkEnvBuilt.snapshot.roles);
  const bkAnnUuid = 'bk-ann-' + Date.now();
  await db.saveAnnotation({
    client_uuid: bkAnnUuid,
    session_id: bkSessId,
    participant: 'Resident_X',
    timestamp_started: new Date(Date.now() - 4000).toISOString(),
    timestamp_submitted: new Date().toISOString(),
    location_id: 0,
    location: 'Study',
    activity_id: 0,
    activity: 'reading',
    interaction: 'solo',
    other_person: '',
    edited: 0,
    config_version: bkEnv.config_hash
  });

  const backupJson = await db.exportBackup();
  assert.strictEqual(backupJson.format, 'smarthouse-backup-v1');
  assert.strictEqual(backupJson.data.sensor_chunks, undefined);
  assert.strictEqual(backupJson.data.wearables, undefined);
  assert.ok(backupJson.data.sessions.some(s => s.id === bkSessId));
  assert.ok(backupJson.data.annotations.some(a => a.client_uuid === bkAnnUuid));

  await db.deleteSession(bkSessId);
  await db.deleteEnvironment(bkEnv.id);
  const restoreRes = await db.restoreBackup(backupJson);
  assert.ok(restoreRes.sessionsAdded >= 1);
  assert.ok(restoreRes.annotationsAdded >= 1);
  assert.ok(restoreRes.environmentsAdded >= 1);

  const secondRestore = await db.restoreBackup(backupJson);
  assert.strictEqual(secondRestore.sessionsAdded, 0);
  assert.strictEqual(secondRestore.annotationsAdded, 0);

  await db.deleteSession(bkSessId);
  await db.deleteEnvironment(bkEnv.id);
  console.log('✓ Full Database Backup export & idempotent restore passed all checks');

  // Test 10: Private GitHub Automated Backup Engine
  console.log('\n[10/10] Testing Private GitHub Backup Engine...');
  assert.deepStrictEqual(
    gitBackup.parseRepoSlug('https://github.com/ptech8000/smarthouse-annotator-backups.git'),
    { owner: 'ptech8000', repo: 'smarthouse-annotator-backups', slug: 'ptech8000/smarthouse-annotator-backups' }
  );

  await assert.rejects(
    () =>
      gitBackup.runBackupNow({
        reason: 'test-public-guard',
        force: true,
        env: { GITHUB_BACKUP_REPO: 'ptech8000/SmartHouse-Studio', GITHUB_BACKUP_TOKEN: 'tok_test' },
        exportBackupFn: () => db.exportBackup(),
        fetchFn: async () => ({
          ok: true,
          status: 200,
          json: async () => ({ private: false, default_branch: 'main' })
        })
      }),
    /must.*PRIVATE|PUBLIC/i
  );

  const uploadedFiles = [];
  const ghResult = await gitBackup.runBackupNow({
    reason: 'test-private',
    force: true,
    env: { GITHUB_BACKUP_REPO: 'ptech8000/smarthouse-annotator-backups', GITHUB_BACKUP_TOKEN: 'tok_test' },
    exportBackupFn: () => db.exportBackup(),
    fetchFn: async (url, opts = {}) => {
      if (opts.method === 'PUT') {
        const body = JSON.parse(opts.body);
        uploadedFiles.push({ url, message: body.message, branch: body.branch, contentLen: body.content.length });
        return {
          ok: true,
          status: 201,
          json: async () => ({ commit: { html_url: 'https://github.com/ptech8000/smarthouse-annotator-backups/commit/abc' } })
        };
      }
      if (url.includes('/contents/')) {
        return { ok: false, status: 404, text: async () => '{}' };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ private: true, default_branch: 'main' })
      };
    }
  });
  assert.strictEqual(ghResult.success, true);
  assert.strictEqual(uploadedFiles.length, 2);
  console.log('✓ Private GitHub backup safety checks passed');

  console.log('\n🎉 ALL 10 TEST SUITES PASSED CLEANLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
```

---

## 8. Vercel Deployment & Environment Variables Checklist

1. **Create a brand-new GitHub repo** for this code (e.g. `ptech8000/smarthouse-annotator-vercel`) — do NOT push into `SmartHouse-Studio`.
2. **Create a brand-new private GitHub repo** for automated JSON backups (e.g. `ptech8000/smarthouse-annotator-backups`) and generate a dedicated Fine-Grained Personal Access Token with `Contents: Read and write` **only** on `smarthouse-annotator-backups`.
3. **Import the repo in Vercel (`vercel.com/new`):**
   - Set **Node.js Version** to **`22.x`** under **Project Settings → General**.
   - Leave Root Directory empty (`.`), because `vercel.json` handles `installCommand`, `buildCommand`, `outputDirectory: "client/dist"`, `rewrites`, `functions`, and daily `crons`.
4. **Attach a brand-new PostgreSQL database** (Vercel **Storage → Marketplace → Neon Postgres**, free tier) or paste a brand-new Postgres connection string — **never reuse the Render `DATABASE_URL`**.
5. **Set Vercel Project Environment Variables** (All Environments):
   - `DATABASE_URL` = *(your brand-new Vercel/Neon Postgres URL)*
   - `PG_SCHEMA` = `annotator_v2` *(optional override; `annotator_v2` is already the default on Vercel)*
   - `ADMIN_USERNAME` = `admin` *(or your preferred admin username)*
   - `ADMIN_PASSWORD` = *(a new strong password)*
   - `GITHUB_BACKUP_REPO` = `ptech8000/smarthouse-annotator-backups`
   - `GITHUB_BACKUP_TOKEN` = *(your new Fine-Grained PAT scoped only to `smarthouse-annotator-backups`)*
   - `CRON_SECRET` = *(a random 32+ char secret so Vercel's daily `0 3 * * *` cron can authenticate `/api/backup/cron`)*
6. **Verify after deploy:**
   - Open `https://<your-vercel-domain>/api/health` and confirm `"engine": "postgresql"` and `"schema": "annotator_v2"`.
   - Sign in, open **Environments**, click **Push to Private Git Now**, and verify your new backup repo receives `backups/latest.json`.
