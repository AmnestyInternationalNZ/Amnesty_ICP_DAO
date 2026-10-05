# amnesty-dao-application
Exported from Caffeine project: Amnesty DAO Application

## Run locally

Use the isolated Amnesty network on port 4954 to avoid conflicting with other
projects on port 4944. From the project root:

```sh
pnpm install --frozen-lockfile
pnpm backend:network:start:isolated
pnpm backend:deploy:isolated
pnpm frontend:env:isolated
pnpm dev --host 127.0.0.1
```

Open http://localhost:5173. Internet Identity uses its frontend canister on the
local network; `frontend:env:isolated` writes the current backend and login URLs.
Run it again after a deployment changes the backend canister ID.

If the network is already running and responding, skip the network start command.
If it reports that it is running but `http://localhost:4954/api/v2/status` does not
respond, run `pnpm exec icp network stop amnesty-local` before starting it again.
The local network is disposable; restarting it may require redeployment and a new
local identity. Production identities and data are separate.

## 2048 Working Group rehearsal

The pilot branch defaults to the Commission experience. See [the local rehearsal guide](docs/2048-local-rehearsal.md) for setup, roles, the full contribution-to-recommendation journey and the `VITE_APP_MODE=dao` switch to the preserved original interface.
