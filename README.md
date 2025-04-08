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

## 🧪 Development Notes

- Code is organized under `src/app/` and `@/components`, aliased via `tsconfig.json`.
- Fonts are loaded using the [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) API with [Geist](https://vercel.com/font).
- App flow is defined in `AppFlow.tsx`, wrapped by `AppLayout.tsx`.
- Static color theming is handled via OKLCH tokens in `globals.css`.

## 📦 Deployment

This project is ready for deployment on [Vercel](https://vercel.com) or any platform that supports Next.js apps.

