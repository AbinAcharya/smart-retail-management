# Smart Retail Analytics

## Run locally

Requires Node.js 24 or newer.

```powershell
npm install
npm run dev
```

The development server serves the React app and its local API together. For a production-style local run:

```powershell
npm run build
npm run start
```

## First setup on a fresh checkout

The SQLite database and bootstrap verifier are created under `server/data/`, which is ignored by Git. To enable the one-time registration screen on a fresh checkout, create a local verifier using environment variables. In PowerShell:

```powershell
$env:INITIAL_ADMIN_NAME = 'Abin'
$securePassword = Read-Host 'Initial admin password' -AsSecureString
$env:INITIAL_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $securePassword).Password
npm run setup:admin
Remove-Item Env:INITIAL_ADMIN_NAME, Env:INITIAL_ADMIN_PASSWORD
```

Use the configured name and password once in the app's Register form. Registration then closes permanently for that database, and later access must use Login. The password itself is not written to the project; the local verifier stores a salted scrypt hash.

## Persistence and hosting

Inventory, stock, and synthetic journey history are stored in `server/data/retail.sqlite`. Keep that directory on persistent local storage and do not delete it when restarting the server. It is intentionally excluded from Git.

This app requires a Node.js server and a persistent writable filesystem. Static-only hosting such as GitHub Pages cannot run the SQLite API. A host with persistent disk storage is required for data to survive server restarts.
