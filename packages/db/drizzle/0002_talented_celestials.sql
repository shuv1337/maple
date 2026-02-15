ALTER TABLE `org_ingest_keys` ADD `public_key_hash` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `org_ingest_keys` ADD `private_key_hash` text NOT NULL DEFAULT '';--> statement-breakpoint
UPDATE `org_ingest_keys` SET `public_key_hash` = `public_key` WHERE `public_key_hash` = '';--> statement-breakpoint
UPDATE `org_ingest_keys` SET `private_key_hash` = `private_key_ciphertext` WHERE `private_key_hash` = '';--> statement-breakpoint
CREATE UNIQUE INDEX `org_ingest_keys_public_key_hash_unique` ON `org_ingest_keys` (`public_key_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `org_ingest_keys_private_key_hash_unique` ON `org_ingest_keys` (`private_key_hash`);
