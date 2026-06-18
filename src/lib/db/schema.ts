// Database schema, defined with Drizzle ORM. This is the single source of
// truth for the tables; `drizzle-kit` reads it to generate SQL migrations.
//
// Replaces the old Supabase SQL migration. Two important differences:
//   1. There is no database-level Row Level Security (RLS) anymore. Access
//      control happens in the application: every query filters on `userId`
//      (see src/lib/db/queries.ts).
//   2. `userId` references our own `users` table instead of Supabase's
//      `auth.users`.
//
// Column names in the database stay snake_case (e.g. `user_id`, `gig_date`) so
// they match the shapes in src/types and the rest of the app.

import { sql } from "drizzle-orm";
import {
  check,
  date,
  doublePrecision,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// users: our own accounts (email + password via Auth.js Credentials provider).
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// artists: unique artists, reused across multiple gigs.
export const artists = pgTable("artists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// venues: locations (a venue/club or a festival).
export const venues = pgTable(
  "venues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    type: text("type").notNull(),
    city: text("city"),
    country: text("country"),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [check("venues_type_check", sql`${table.type} in ('venue', 'festival')`)]
);

// gigs: the performance itself. One festival visit with several artists = one
// gigs row per artist pointing at the same venue and date (that's intentional).
export const gigs = pgTable(
  "gigs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artists.id),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id),
    gigDate: date("gig_date").notNull(),
    notes: text("notes"),
    rating: smallint("rating"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [check("gigs_rating_check", sql`${table.rating} between 1 and 5`)]
);

// media: photos/videos per gig. Files live on a local volume; only the path
// and metadata live here. Defined now as part of the data model, but the
// upload/serve features are a later phase (not built yet).
export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    gigId: uuid("gig_id")
      .notNull()
      .references(() => gigs.id),
    storagePath: text("storage_path").notNull(),
    mediaType: text("media_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    check("media_type_check", sql`${table.mediaType} in ('photo', 'video')`),
  ]
);
