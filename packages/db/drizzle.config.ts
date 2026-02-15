import { defineConfig } from "drizzle-kit"
import { ensureMapleDbDirectory, resolveMapleDbConfig } from "./src/config"

const dbConfig = ensureMapleDbDirectory(resolveMapleDbConfig())

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: dbConfig.url,
    ...(dbConfig.authToken ? { authToken: dbConfig.authToken } : {}),
  },
  strict: true,
})
