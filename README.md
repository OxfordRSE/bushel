# 📦 Bushel

Bushel is a streamlined tool for uploading archaeological datasets to [FigShare](https://figshare.com) from Excel files. It guides users through validating records, resolving data conflicts, and performing reliable uploads to FigShare’s API.

## ✨ Features

- 🔐 Login with FigShare
- 📂 Project selection from your FigShare account
- 📈 Excel record ingestion
- 📉 Validation and issue detection
- 🔄 Duplicate resolution
- ☁️ Upload and summary reporting

## 🧱 Tech Stack

- [Next.js 16](https://nextjs.org) and [React 19](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com) (Radix UI)
- [Zod](https://zod.dev) for validating spreadsheet data
- [Vitest](https://vitest.dev), Testing Library and [MSW](https://mswjs.io) for tests and API mocking
- TypeScript throughout

## 🚀 Getting Started

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to view the app.

In development, the FigShare API is mocked with MSW and login is faked, so you
don't need FigShare credentials or an account. Set `MOCK_LOGIN_OAUTH_FAIL=true`
to simulate a failed login.

We do not recommend Bun: it doesn't play well with MSW. Use `npm`, which is what
the lockfile, Docker build and CI use.

### Checks

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build       # production build
```

CI runs all three on every pull request and push to `main`.

### Running against real FigShare

To run against the real FigShare API, build in production mode:

```bash
npm run build && npm start
```

You need a FigShare OAuth application. Set `FIGSHARE_CLIENT_ID` and
`FIGSHARE_CLIENT_SECRET` in your environment or in `.env.local` (gitignored). The
application's redirect URI must be `<your origin>/api/auth/callback`.

## 🧪 Development Notes

- Code is organized under `src/app/` and `@/components`, aliased via `tsconfig.json`.
- Fonts are loaded using the [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) API with [Geist](https://vercel.com/font).
- App flow is defined in `AppFlow.tsx`, wrapped by `AppLayout.tsx`.
- Static color theming is handled via OKLCH tokens in `globals.css`.

## 📑 Excel Input & Validation

- Column names are case-insensitive and unknown columns are dropped.
- Lists are separated with semicolons (`;`). Values containing semicolons are unsupported.
- File paths in the `Files` column must be relative to the directory you select when uploading.
- JSON fields must contain valid JSON. Unrecognised keys produce warnings.
- Dates are read either from Excel date cells or strings formatted as `YYYY-MM-DD` or `-YYYY-MM-DD` (BCE). FigShare accepts dates from `1001-01-31` to `9999-12-31`.
- Mandatory fields may not be blank and single‑value URL fields must contain only one URL.
- Row checks verify files exist, category and keyword counts, select values and custom field validations. File‑level checks ensure titles are unique and that your quota is sufficient.

## 📦 Deployment

Bushel runs on [Fly.io](https://fly.io) as the `bushel` app (<https://bushel.fly.dev>),
using the `Dockerfile` and `fly.toml` in this repository.

- **Automatic deploys:** every push to `main` deploys through
  `.github/workflows/fly-deploy.yml`. This needs a `FLY_API_TOKEN` repository secret.
- **Configuration:** `FIGSHARE_CLIENT_ID` is set in `fly.toml`. The client secret is a
  Fly secret:

  ```bash
  fly secrets set FIGSHARE_CLIENT_SECRET=... -a bushel
  ```

- **Manual deploys:** `fly deploy` deploys your local working tree, including
  uncommitted changes. Prefer merging to `main`, so production matches the repository.
- **Checking what's live:** `fly releases -a bushel`.

Machines stop when idle (`min_machines_running = 0`), so the first request after a
quiet period is slower.

## License

Bushel is distributed under the [GNU Affero General Public License](LICENSE).