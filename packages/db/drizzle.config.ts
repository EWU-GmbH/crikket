import { defineConfig } from "drizzle-kit"

// Railway: DATABASE_URL, DATABASE_PRIVATE_URL. Referenz ${{Postgres.DATABASE_URL}} muss
// in Railway → Server → Variables gesetzt und der Postgres-Service verlinkt sein.
const url =
  process.env.DATABASE_URL ||
  process.env.DATABASE_PRIVATE_URL ||
  process.env.DATABASE_PUBLIC_URL ||
  ""

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
})
