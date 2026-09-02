CREATE TABLE `package_contracts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` text DEFAULT 'ta-no-banho' NOT NULL,
	`plan_id` integer NOT NULL,
	`client_id` integer NOT NULL,
	`pet_name` text NOT NULL,
	`used_sessions` integer DEFAULT 0 NOT NULL,
	`total_sessions` integer NOT NULL,
	`start_date` text NOT NULL,
	`price_cents` integer,
	`paid_cents` integer DEFAULT 0 NOT NULL,
	`payment_method` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`plan_id`) REFERENCES `package_plans`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_package_contracts_org_client` ON `package_contracts` (`organization_id`,`client_id`);--> statement-breakpoint
CREATE TABLE `package_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` text DEFAULT 'ta-no-banho' NOT NULL,
	`name` text NOT NULL,
	`sessions` integer NOT NULL,
	`periodicity` text NOT NULL,
	`validity_days` integer NOT NULL,
	`price_cents` integer,
	`service_id` integer NOT NULL,
	`courtesy` text DEFAULT 'Sem cortesia' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action
);
