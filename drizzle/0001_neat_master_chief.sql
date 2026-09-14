CREATE TABLE `deck_revisions` (
	`owner` text NOT NULL,
	`deck_id` text NOT NULL,
	`version` integer NOT NULL,
	`request_id` text NOT NULL,
	`snapshot` text NOT NULL,
	`reason` text NOT NULL,
	`actor` text NOT NULL,
	`at` text NOT NULL,
	`changes` text NOT NULL,
	PRIMARY KEY(`owner`, `deck_id`, `version`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_deck_revision_request` ON `deck_revisions` (`owner`,`deck_id`,`request_id`);--> statement-breakpoint
CREATE TABLE `decks` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
