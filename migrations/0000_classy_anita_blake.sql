CREATE TABLE `delivery_addresses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`description` text,
	`attached_files` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`order_number` text NOT NULL,
	`description` text NOT NULL,
	`pickup_address` text NOT NULL,
	`delivery_address` text NOT NULL,
	`service_type` text NOT NULL,
	`base_cost` real NOT NULL,
	`distance_fee` real DEFAULT 0 NOT NULL,
	`total_cost` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`approval_status` text DEFAULT 'pending' NOT NULL,
	`approved_by` integer,
	`approved_at` integer,
	`rejection_reason` text,
	`special_instructions` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`order_id` integer,
	`type` text NOT NULL,
	`amount` real NOT NULL,
	`description` text NOT NULL,
	`approval_status` text DEFAULT 'pending' NOT NULL,
	`approved_by` integer,
	`approved_at` integer,
	`rejection_reason` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`telegram_id` text,
	`username` text NOT NULL,
	`email` text,
	`password` text,
	`first_name` text,
	`last_name` text,
	`balance` real DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_telegram_id_unique` ON `users` (`telegram_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);