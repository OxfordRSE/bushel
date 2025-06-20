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

- [Next.js 15](https://nextjs.org)
- [React 19](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Prettier + Tailwind plugin](https://github.com/tailwindlabs/prettier-plugin-tailwindcss)
- [ESLint](https://nextjs.org/docs/app/building-your-application/linting)
- TypeScript, Radix UI, Sonner toasts, and more

## ✨ Note on Bun

We do not recommend using Bun during development. Bun does **not** play well with MSW (Mock Service Worker), which is used to simulate the FigShare API locally. Use `npm` or `pnpm` instead for a smooth dev experience.

## 🚀 Getting Started

Install dependencies:

```bash
npm install
# or
pnpm install
```

Start the development server:

```bash
npm run dev
# or
pnpm dev
```

Visit `http://localhost:3000` to view the app.

### Environment Variables

Bushel requires FigShare OAuth credentials when running locally or deploying. Set
`FIGSHARE_CLIENT_ID` and `FIGSHARE_CLIENT_SECRET` in your environment (or a
`.env.local` file) so the app can authenticate with FigShare.

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

Bushel can run on any platform that supports Next.js. The recommended route is the
[AWS CDK setup](aws_cdk/README.md) included in this repository, which provisions
Secrets Manager, Fargate and other resources. You will need your FigShare
credentials (`FIGSHARE_CLIENT_ID`/`FIGSHARE_CLIENT_SECRET`) available when deploying.

The app can also be deployed to any other hosting provider that supports Next.js applications
by following the deployment instructions for that provider.

## License

Bushel is distributed under the [GNU Affero General Public License](LICENSE).