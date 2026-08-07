This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

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
# MCP de PocketBase

Este proyecto incluye un servidor MCP local para que Codex pueda inspeccionar y administrar su
instancia de PocketBase usando las credenciales de `.env.local`. La configuración está en
`.codex/config.toml` y la documentación en `tools/pocketbase-mcp/README.md`.

Para verificarlo:

```powershell
npm.cmd run mcp:pocketbase:test
npm.cmd run mcp:pocketbase:smoke
```

## OpenSpec

La especificación funcional y operativa del proyecto se encuentra en `openspec/specs`. OpenSpec está
instalado como dependencia de desarrollo y configurado para Codex.

```powershell
npm.cmd run spec:list
npm.cmd run spec:validate
```

Para proponer una evolución del sistema, inicia un cambio OpenSpec en lugar de editar directamente
las especificaciones base.
