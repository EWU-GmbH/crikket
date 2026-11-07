import { build } from "esbuild"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const outdir = here

await mkdir(outdir, { recursive: true })

await build({
  absWorkingDir: here,
  entryPoints: [path.join(here, "preview.tsx")],
  outfile: path.join(outdir, "preview.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  jsx: "automatic",
  target: ["es2022"],
  loader: {
    ".tsx": "tsx",
    ".ts": "ts",
  },
  alias: {
    "next/image": path.join(here, "shims/next-image.tsx"),
    "next/link": path.join(here, "shims/next-link.tsx"),
    "@crikket/ui/components/ui/card": path.join(here, "shims/card.tsx"),
    "@crikket/ui/components/ui/badge": path.join(here, "shims/badge.tsx"),
  },
  external: [],
  logLevel: "info",
})

console.log("visual-meine-meldungen bundle ready")
