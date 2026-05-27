# HandOffLint

Paste a Figma URL to get a **Readiness Score** and severity-sorted lint findings before dev handoff. Week 1 uses mock audit data via `POST /api/scan`; real Figma + audit tools come next.

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Copy `.env.example` to `.env.local`. Optionally set `FIGMA_ACCESS_TOKEN` to log real Figma JSON in the server terminal on each scan; without it, the scan still runs with mock findings.

**Try a scan:** paste a Figma URL you can access with that token, e.g. `https://www.figma.com/design/YOUR_FILE_KEY/Example?node-id=1-2`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
