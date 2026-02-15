CREATE TABLE `dashboards` (
	`org_id` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	PRIMARY KEY(`org_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `dashboards_org_updated_idx` ON `dashboards` (`org_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `dashboards_org_name_idx` ON `dashboards` (`org_id`,`name`);