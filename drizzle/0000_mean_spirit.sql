CREATE TABLE `appointments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` text DEFAULT 'ta-no-banho' NOT NULL,
	`pet_id` integer,
	`pet_name` text DEFAULT 'Pet não informado' NOT NULL,
	`client_name` text NOT NULL,
	`phone` text NOT NULL,
	`service` text NOT NULL,
	`appointment_date` text NOT NULL,
	`appointment_time` text NOT NULL,
	`payment_method` text NOT NULL,
	`payment_option` text DEFAULT 'deposit' NOT NULL,
	`price_cents` integer NOT NULL,
	`deposit_cents` integer DEFAULT 0 NOT NULL,
	`paid_cents` integer DEFAULT 0 NOT NULL,
	`balance_cents` integer DEFAULT 0 NOT NULL,
	`external_reference` text,
	`payment_id` text,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`checkout_url` text,
	`status` text DEFAULT 'awaiting_payment' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_appointments_external_reference` ON `appointments` (`external_reference`);--> statement-breakpoint
CREATE INDEX `idx_appointments_schedule` ON `appointments` (`appointment_date`,`appointment_time`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_clients_organization_phone` ON `clients` (`organization_id`,`phone`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` text DEFAULT 'ta-no-banho' NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`expense_date` text NOT NULL,
	`payment_method` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_expenses_date` ON `expenses` (`expense_date`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `pets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` text NOT NULL,
	`client_id` integer NOT NULL,
	`name` text NOT NULL,
	`breed` text,
	`size` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_pets_client` ON `pets` (`organization_id`,`client_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`email` text NOT NULL,
	`full_name` text,
	`role` text DEFAULT 'owner' NOT NULL,
	`welcome_seen_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_profiles_email` ON `profiles` (`email`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` text DEFAULT 'ta-no-banho' NOT NULL,
	`name` text NOT NULL,
	`group_name` text NOT NULL,
	`category` text NOT NULL,
	`detail` text NOT NULL,
	`duration` text NOT NULL,
	`price_cents` integer NOT NULL,
	`sessions` integer DEFAULT 1 NOT NULL,
	`visits_json` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_services_category_active` ON `services` (`organization_id`,`category`,`active`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_services_organization_name` ON `services` (`organization_id`,`name`);
--> statement-breakpoint
INSERT INTO `organizations` (`id`, `name`, `slug`, `active`)
VALUES ('ta-no-banho', 'Tá no Banho', 'ta-no-banho', 1)
ON CONFLICT (`id`) DO NOTHING;
