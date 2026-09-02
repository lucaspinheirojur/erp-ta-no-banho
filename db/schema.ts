import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const profiles = sqliteTable(
  "profiles",
  {
    userId: text("user_id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    email: text("email").notNull(),
    fullName: text("full_name"),
    role: text("role").notNull().default("owner"),
    welcomeSeenAt: text("welcome_seen_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("idx_profiles_email").on(table.email)],
);

export const clients = sqliteTable(
  "clients",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_clients_organization_phone").on(
      table.organizationId,
      table.phone,
    ),
  ],
);

export const pets = sqliteTable(
  "pets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id),
    name: text("name").notNull(),
    breed: text("breed"),
    size: text("size").notNull(),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_pets_client").on(table.organizationId, table.clientId),
  ],
);

export const appointments = sqliteTable(
  "appointments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    organizationId: text("organization_id")
      .notNull()
      .default("ta-no-banho")
      .references(() => organizations.id),
    petId: integer("pet_id").references(() => pets.id),
    petName: text("pet_name").notNull().default("Pet não informado"),
    clientName: text("client_name").notNull(),
    phone: text("phone").notNull(),
    service: text("service").notNull(),
    appointmentDate: text("appointment_date").notNull(),
    appointmentTime: text("appointment_time").notNull(),
    paymentMethod: text("payment_method").notNull(),
    paymentOption: text("payment_option").notNull().default("deposit"),
    priceCents: integer("price_cents").notNull(),
    depositCents: integer("deposit_cents").notNull().default(0),
    paidCents: integer("paid_cents").notNull().default(0),
    balanceCents: integer("balance_cents").notNull().default(0),
    externalReference: text("external_reference"),
    paymentId: text("payment_id"),
    paymentStatus: text("payment_status").notNull().default("pending"),
    checkoutUrl: text("checkout_url"),
    status: text("status").notNull().default("awaiting_payment"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_appointments_external_reference").on(table.externalReference),
    index("idx_appointments_schedule").on(
      table.appointmentDate,
      table.appointmentTime,
    ),
  ],
);

export const services = sqliteTable(
  "services",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    organizationId: text("organization_id")
      .notNull()
      .default("ta-no-banho")
      .references(() => organizations.id),
    name: text("name").notNull(),
    groupName: text("group_name").notNull(),
    category: text("category").notNull(),
    detail: text("detail").notNull(),
    duration: text("duration").notNull(),
    priceCents: integer("price_cents").notNull(),
    sessions: integer("sessions").notNull().default(1),
    visitsJson: text("visits_json"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_services_category_active").on(
      table.organizationId,
      table.category,
      table.active,
    ),
    uniqueIndex("idx_services_organization_name").on(
      table.organizationId,
      table.name,
    ),
  ],
);

export const expenses = sqliteTable(
  "expenses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    organizationId: text("organization_id")
      .notNull()
      .default("ta-no-banho")
      .references(() => organizations.id),
    description: text("description").notNull(),
    category: text("category").notNull(),
    amountCents: integer("amount_cents").notNull(),
    expenseDate: text("expense_date").notNull(),
    paymentMethod: text("payment_method").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_expenses_date").on(table.expenseDate)],
);

export const packagePlans = sqliteTable("package_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: text("organization_id").notNull().default("ta-no-banho").references(() => organizations.id),
  name: text("name").notNull(),
  sessions: integer("sessions").notNull(),
  periodicity: text("periodicity").notNull(),
  validityDays: integer("validity_days").notNull(),
  priceCents: integer("price_cents"),
  serviceId: integer("service_id").notNull().references(() => services.id),
  courtesy: text("courtesy").notNull().default("Sem cortesia"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const packageContracts = sqliteTable("package_contracts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organizationId: text("organization_id").notNull().default("ta-no-banho").references(() => organizations.id),
  planId: integer("plan_id").notNull().references(() => packagePlans.id),
  clientId: integer("client_id").notNull().references(() => clients.id),
  petName: text("pet_name").notNull(),
  usedSessions: integer("used_sessions").notNull().default(0),
  totalSessions: integer("total_sessions").notNull(),
  startDate: text("start_date").notNull(),
  priceCents: integer("price_cents"),
  paidCents: integer("paid_cents").notNull().default(0),
  paymentMethod: text("payment_method"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("idx_package_contracts_org_client").on(table.organizationId, table.clientId)]);
