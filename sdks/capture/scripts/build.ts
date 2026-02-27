import { spawn } from "node:child_process"
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { basename, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import tailwind from "@tailwindcss/postcss"
import postcss from "postcss"

const CAPTURE_WIDGET_CSS_PLACEHOLDER = "__CRIKKET_CAPTURE_WIDGET_CSS__"
const USE_CLIENT_DIRECTIVE_PATTERN =
  /(^|\n)[\t ]*(["'])use client\2;?[\t ]*(?=\n|$)/g

const buildTargets = [
  {
    entrypoint: "./src/index.ts",
    outfile: "./dist/index.js",
    format: "esm",
    external: ["react", "react-dom", "react-dom/client"],
  },
  {
    entrypoint: "./src/browser.ts",
    outfile: "./dist/browser.js",
    format: "esm",
    external: ["react", "react-dom", "react-dom/client"],
  },
  {
    entrypoint: "./src/plugin.tsx",
    outfile: "./dist/react-client.js",
    format: "esm",
    external: ["react", "react-dom", "react-dom/client"],
  },
  {
    entrypoint: "./src/browser.ts",
    outfile: "./dist/capture.global.js",
    format: "iife",
    external: [],
  },
] as const

async function main(): Promise<void> {
  process.chdir(fileURLToPath(new URL("../", import.meta.url)))

  await rm("./dist", {
    force: true,
    recursive: true,
  })
  await mkdir("./dist", {
    recursive: true,
  })

  const widgetCss = await buildWidgetCss()

  for (const target of buildTargets) {
    await rm(resolveGeneratedOutput(target.outfile), { force: true })
    await rm(resolveGeneratedOutput(`${target.outfile}.map`), { force: true })
  }

  for (const target of buildTargets) {
    const exitCode = await runCommand([
      "bun",
      "build",
      target.entrypoint,
      "--target=browser",
      `--format=${target.format}`,
      "--packages=bundle",
      "--sourcemap=linked",
      `--outfile=${target.outfile}`,
      ...target.external.map((value) => `--external=${value}`),
    ])
    if (exitCode !== 0) {
      throw new Error(`Failed to build ${target.outfile}`)
    }

    await rename(resolveGeneratedOutput(target.outfile), target.outfile)
    await rename(
      resolveGeneratedOutput(`${target.outfile}.map`),
      `${target.outfile}.map`
    )
    await sanitizeBundleOutput(target.outfile, widgetCss)
  }

  const exitCode = await runCommand([
    "bun",
    "x",
    "tsc",
    "--emitDeclarationOnly",
    "-p",
    "tsconfig.json",
  ])
  if (exitCode !== 0) {
    throw new Error("Type declaration build failed.")
  }

  await writeReactEntry()
}

function resolveGeneratedOutput(outfile: string): string {
  return `./src/${basename(outfile)}`
}

async function buildWidgetCss(): Promise<string> {
  const cssSourcePath = resolve("./src/ui/widget.css")
  const cssInput = await readFile(cssSourcePath, "utf8")
  const result = await postcss([tailwind()]).process(cssInput, {
    from: cssSourcePath,
    to: resolve("./dist/capture.css"),
  })

  await mkdir("./dist", {
    recursive: true,
  })
  await writeFile("./dist/capture.css", result.css)
  return result.css
}

async function sanitizeBundleOutput(
  outputPath: string,
  widgetCss: string
): Promise<void> {
  const bundle = await readFile(outputPath, "utf8")
  const updatedBundle = stripUseClientDirectives(
    bundle.replaceAll(
      JSON.stringify(CAPTURE_WIDGET_CSS_PLACEHOLDER),
      JSON.stringify(widgetCss)
    )
  )

  await writeFile(outputPath, updatedBundle)
}

async function writeReactEntry(): Promise<void> {
  await writeFile(
    "./dist/react.js",
    'export { CapturePlugin } from "./react-client.js"\n'
  )
}

function stripUseClientDirectives(source: string): string {
  return source.replaceAll(USE_CLIENT_DIRECTIVE_PATTERN, "$1")
}

function runCommand(args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(args[0], args.slice(1), {
      shell: false,
      stdio: "inherit",
    })

    child.on("error", reject)
    child.on("exit", (code) => {
      resolve(code ?? 1)
    })
  })
}

await main()
