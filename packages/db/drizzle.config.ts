import "dotenv/config"
import { defineConfig } from "drizzle-kit"

// Railway: DATABASE_URL, DATABASE_PRIVATE_URL, DATABASE_PUBLIC_URL. Oder Einzelwerte PGHOST, PGUSER, PGPASSWORD, PGDATABASE.
const url =
  process.env.DATABASE_URL ||
  process.env.DATABASE_PRIVATE_URL ||
  process.env.DATABASE_PUBLIC_URL ||
  (process.env.PGHOST &&
  process.env.PGUSER &&
  process.env.PGPASSWORD &&
  process.env.PGDATABASE
    ? `postgresql://${encodeURIComponent(process.env.PGUSER)}:${encodeURIComponent(process.env.PGPASSWORD)}@${process.env.PGHOST}:${process.env.PGPORT || "5432"}/${process.env.PGDATABASE}`
    : "")

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
})
