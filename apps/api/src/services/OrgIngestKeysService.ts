import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import { SqliteDrizzle } from "@effect/sql-drizzle/Sqlite"
import {
  IngestKeyEncryptionError,
  IngestKeyPersistenceError,
  IngestKeysResponse,
} from "@maple/domain/http"
import {
  createIngestKeyId,
  hashIngestKey,
  inferIngestKeyType,
  orgIngestKeys,
  parseIngestKeyLookupHmacKey,
  type ResolvedIngestKey,
} from "@maple/db"
import { eq } from "drizzle-orm"
import { Effect, Layer } from "effect"
import { DatabaseLive } from "./DatabaseLive"
import { Env } from "./Env"

interface EncryptedPrivateKey {
  readonly ciphertext: string
  readonly iv: string
  readonly tag: string
}

const toPersistenceError = (error: unknown) =>
  new IngestKeyPersistenceError({
    message:
      error instanceof Error ? error.message : "Ingest key persistence failed",
  })

const toEncryptionError = (message: string) =>
  new IngestKeyEncryptionError({ message })

const parseEncryptionKey = (
  raw: string,
): Effect.Effect<Buffer, IngestKeyEncryptionError> =>
  Effect.try({
    try: () => {
      const trimmed = raw.trim()
      if (trimmed.length === 0) {
        throw new Error("MAPLE_INGEST_KEY_ENCRYPTION_KEY is required")
      }

      const decoded = Buffer.from(trimmed, "base64")
      if (decoded.length !== 32) {
        throw new Error(
          "MAPLE_INGEST_KEY_ENCRYPTION_KEY must be base64 for exactly 32 bytes",
        )
      }

      return decoded
    },
    catch: (error) =>
      toEncryptionError(
        error instanceof Error
          ? error.message
          : "Invalid ingest key encryption key",
      ),
  })

const parseLookupHmacKey = (
  raw: string,
): Effect.Effect<string, IngestKeyEncryptionError> =>
  Effect.try({
    try: () => parseIngestKeyLookupHmacKey(raw),
    catch: (error) =>
      toEncryptionError(
        error instanceof Error
          ? error.message
          : "Invalid ingest key lookup HMAC key",
      ),
  })

const encryptPrivateKey = (
  plaintext: string,
  encryptionKey: Buffer,
): Effect.Effect<EncryptedPrivateKey, IngestKeyEncryptionError> =>
  Effect.try({
    try: () => {
      const iv = randomBytes(12)
      const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv)
      const ciphertext = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
      ])

      return {
        ciphertext: ciphertext.toString("base64"),
        iv: iv.toString("base64"),
        tag: cipher.getAuthTag().toString("base64"),
      }
    },
    catch: (error) =>
      toEncryptionError(
        error instanceof Error
          ? error.message
          : "Failed to encrypt private ingest key",
      ),
  })

const decryptPrivateKey = (
  encrypted: EncryptedPrivateKey,
  encryptionKey: Buffer,
): Effect.Effect<string, IngestKeyEncryptionError> =>
  Effect.try({
    try: () => {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        encryptionKey,
        Buffer.from(encrypted.iv, "base64"),
      )
      decipher.setAuthTag(Buffer.from(encrypted.tag, "base64"))

      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
        decipher.final(),
      ])

      return plaintext.toString("utf8")
    },
    catch: () => toEncryptionError("Failed to decrypt private ingest key"),
  })

const generatePublicKey = () => `maple_pk_${randomBytes(24).toString("base64url")}`
const generatePrivateKey = () => `maple_sk_${randomBytes(24).toString("base64url")}`

export class OrgIngestKeysService extends Effect.Service<OrgIngestKeysService>()(
  "OrgIngestKeysService",
  {
    accessors: true,
    dependencies: [Env.Default],
    effect: Effect.gen(function* () {
      const db = yield* SqliteDrizzle
      const env = yield* Env
      const encryptionKey = yield* parseEncryptionKey(
        env.MAPLE_INGEST_KEY_ENCRYPTION_KEY,
      )
      const lookupHmacKey = yield* parseLookupHmacKey(
        env.MAPLE_INGEST_KEY_LOOKUP_HMAC_KEY,
      )

      const selectRow = Effect.fn("OrgIngestKeysService.selectRow")(function* (
        orgId: string,
      ) {
        const rows = yield* db
          .select()
          .from(orgIngestKeys)
          .where(eq(orgIngestKeys.orgId, orgId))
          .limit(1)
          .pipe(Effect.mapError(toPersistenceError))

        return rows[0]
      })

      const toResponse = Effect.fn("OrgIngestKeysService.toResponse")(function* (
        row: typeof orgIngestKeys.$inferSelect,
      ) {
        const privateKey = yield* decryptPrivateKey(
          {
            ciphertext: row.privateKeyCiphertext,
            iv: row.privateKeyIv,
            tag: row.privateKeyTag,
          },
          encryptionKey,
        )

        return new IngestKeysResponse({
          publicKey: row.publicKey,
          privateKey,
          publicRotatedAt: new Date(row.publicRotatedAt).toISOString(),
          privateRotatedAt: new Date(row.privateRotatedAt).toISOString(),
        })
      })

      const ensureRow = Effect.fn("OrgIngestKeysService.ensureRow")(function* (
        orgId: string,
        userId: string,
      ) {
        const existing = yield* selectRow(orgId)
        if (existing) return existing

        const now = Date.now()
        const publicKey = generatePublicKey()
        const privateKey = generatePrivateKey()
        const publicKeyHash = hashIngestKey(publicKey, lookupHmacKey)
        const privateKeyHash = hashIngestKey(privateKey, lookupHmacKey)
        const encryptedPrivate = yield* encryptPrivateKey(privateKey, encryptionKey)

        yield* db
          .insert(orgIngestKeys)
          .values({
            orgId,
            publicKey,
            publicKeyHash,
            privateKeyCiphertext: encryptedPrivate.ciphertext,
            privateKeyIv: encryptedPrivate.iv,
            privateKeyTag: encryptedPrivate.tag,
            privateKeyHash,
            publicRotatedAt: now,
            privateRotatedAt: now,
            createdAt: now,
            updatedAt: now,
            createdBy: userId,
            updatedBy: userId,
          })
          .onConflictDoNothing()
          .pipe(Effect.mapError(toPersistenceError))

        const row = yield* selectRow(orgId)
        if (!row) {
          return yield* Effect.fail(
            new IngestKeyPersistenceError({
              message: "Failed to create org ingest keys",
            }),
          )
        }

        return row
      })

      const getOrCreate = Effect.fn("OrgIngestKeysService.getOrCreate")(function* (
        orgId: string,
        userId: string,
      ) {
        const row = yield* ensureRow(orgId, userId)
        return yield* toResponse(row)
      })

      const rerollPublic = Effect.fn("OrgIngestKeysService.rerollPublic")(function* (
        orgId: string,
        userId: string,
      ) {
        yield* ensureRow(orgId, userId)

        const now = Date.now()
        const publicKey = generatePublicKey()
        const publicKeyHash = hashIngestKey(publicKey, lookupHmacKey)

        yield* db
          .update(orgIngestKeys)
          .set({
            publicKey,
            publicKeyHash,
            publicRotatedAt: now,
            updatedAt: now,
            updatedBy: userId,
          })
          .where(eq(orgIngestKeys.orgId, orgId))
          .pipe(Effect.mapError(toPersistenceError))

        const row = yield* selectRow(orgId)
        if (!row) {
          return yield* Effect.fail(
            new IngestKeyPersistenceError({
              message: "Failed to load rerolled public ingest key",
            }),
          )
        }

        return yield* toResponse(row)
      })

      const rerollPrivate = Effect.fn("OrgIngestKeysService.rerollPrivate")(function* (
        orgId: string,
        userId: string,
      ) {
        yield* ensureRow(orgId, userId)

        const now = Date.now()
        const privateKey = generatePrivateKey()
        const privateKeyHash = hashIngestKey(privateKey, lookupHmacKey)
        const encryptedPrivate = yield* encryptPrivateKey(privateKey, encryptionKey)

        yield* db
          .update(orgIngestKeys)
          .set({
            privateKeyCiphertext: encryptedPrivate.ciphertext,
            privateKeyIv: encryptedPrivate.iv,
            privateKeyTag: encryptedPrivate.tag,
            privateKeyHash,
            privateRotatedAt: now,
            updatedAt: now,
            updatedBy: userId,
          })
          .where(eq(orgIngestKeys.orgId, orgId))
          .pipe(Effect.mapError(toPersistenceError))

        const row = yield* selectRow(orgId)
        if (!row) {
          return yield* Effect.fail(
            new IngestKeyPersistenceError({
              message: "Failed to load rerolled private ingest key",
            }),
          )
        }

        return yield* toResponse(row)
      })

      const resolveIngestKey = Effect.fn("OrgIngestKeysService.resolveIngestKey")(function* (
        rawKey: string,
      ) {
        const keyType = inferIngestKeyType(rawKey)
        if (!keyType) return null

        const keyHash = hashIngestKey(rawKey, lookupHmacKey)
        const rows = yield* db
          .select({ orgId: orgIngestKeys.orgId })
          .from(orgIngestKeys)
          .where(
            keyType === "public"
              ? eq(orgIngestKeys.publicKeyHash, keyHash)
              : eq(orgIngestKeys.privateKeyHash, keyHash),
          )
          .limit(1)
          .pipe(Effect.mapError(toPersistenceError))

        const row = rows[0]
        if (!row) return null

        return {
          orgId: row.orgId,
          keyType,
          keyId: createIngestKeyId(keyHash),
        } satisfies ResolvedIngestKey
      })

      return {
        getOrCreate,
        rerollPublic,
        rerollPrivate,
        resolveIngestKey,
      }
    }),
  },
) {
  static readonly Live = this.Default.pipe(Layer.provide(DatabaseLive))
}
