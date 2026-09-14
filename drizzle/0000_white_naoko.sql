CREATE TABLE `revisions` (
	`owner` text NOT NULL,
	`version` integer NOT NULL,
	`request_id` text NOT NULL,
	`snapshot` text NOT NULL,
	`reason` text NOT NULL,
	`actor` text NOT NULL,
	`at` text NOT NULL,
	`changes` text NOT NULL,
	PRIMARY KEY(`owner`, `version`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_revisions_owner_request` ON `revisions` (`owner`,`request_id`);