CREATE TABLE `org_ingest_keys` (
	`org_id` text PRIMARY KEY NOT NULL,
	`public_key` text NOT NULL,
	`private_key_ciphertext` text NOT NULL,
	`private_key_iv` text NOT NULL,
	`private_key_tag` text NOT NULL,
	`public_rotated_at` integer NOT NULL,
	`private_rotated_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `org_ingest_keys_public_key_unique` ON `org_ingest_keys` (`public_key`);