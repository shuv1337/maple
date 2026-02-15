import { createDecipheriv } from "node:crypto"
import { createClient } from "@libsql/client"
import {
  hashIngestKey,
  parseIngestKeyLookupHmacKey,
  resolveMapleDbConfig,
} from "@maple/db"

interface OrgIngestKeyRow {
  readonly org_id: string
  readonly public_key: string
  readonly private_key_ciphertext: string
  readonly private_key_iv: string
  readonly private_key_tag: string
}

const parseEncryptionKey = (raw: string): Buffer => {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    throw new Error("MAPLE_INGEST_KEY_ENCRYPTION_KEY is required")
  }

  const decoded = Buffer.from(trimmed, "base64")
  if (decoded.length !== 32) {
    throw new Error("MAPLE_INGEST_KEY_ENCRYPTION_KEY must be base64 for exactly 32 bytes")
  }

  return decoded
}

const decryptPrivateKey = (
  row: Pick<
    OrgIngestKeyRow,
    "private_key_ciphertext" | "private_key_iv" | "private_key_tag"
  >,
  encryptionKey: Buffer,
): string => {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey,
    Buffer.from(row.private_key_iv, "base64"),
  )
  decipher.setAuthTag(Buffer.from(row.private_key_tag, "base64"))

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(row.private_key_ciphertext, "base64")),
    decipher.final(),
  ])

  return plaintext.toString("utf8")
}

const run = async () => {
  const dbConfig = resolveMapleDbConfig(process.env)
  const encryptionKey = parseEncryptionKey(
    process.env.MAPLE_INGEST_KEY_ENCRYPTION_KEY ?? "",
  )
  const lookupHmacKey = parseIngestKeyLookupHmacKey(
    process.env.MAPLE_INGEST_KEY_LOOKUP_HMAC_KEY ?? "",
  )

  const client = createClient({
    url: dbConfig.url,
    ...(dbConfig.authToken ? { authToken: dbConfig.authToken } : {}),
  })

  const rows = (
    await client.execute(
      `
        SELECT
          org_id,
          public_key,
          private_key_ciphertext,
          private_key_iv,
          private_key_tag
        FROM org_ingest_keys
      `,
    )
  ).rows as unknown as OrgIngestKeyRow[]

  for (const row of rows) {
    const privateKey = decryptPrivateKey(row, encryptionKey)
    const publicKeyHash = hashIngestKey(row.public_key, lookupHmacKey)
    const privateKeyHash = hashIngestKey(privateKey, lookupHmacKey)

    await client.execute({
      sql: `
        UPDATE org_ingest_keys
        SET
          public_key_hash = ?,
          private_key_hash = ?
        WHERE org_id = ?
      `,
      args: [publicKeyHash, privateKeyHash, row.org_id],
    })
  }

  console.log(`Backfilled ingest key hashes for ${rows.length} org(s).`)
}

run().catch((error) => {
  console.error("Failed to backfill ingest key hashes", error)
  process.exit(1)
})
