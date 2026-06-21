CREATE TABLE "setlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"gig_id" uuid NOT NULL,
	"setlistfm_id" text NOT NULL,
	"setlistfm_url" text NOT NULL,
	"songs" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "setlists_gig_id_unique" UNIQUE("gig_id")
);
--> statement-breakpoint
ALTER TABLE "setlists" ADD CONSTRAINT "setlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setlists" ADD CONSTRAINT "setlists_gig_id_gigs_id_fk" FOREIGN KEY ("gig_id") REFERENCES "public"."gigs"("id") ON DELETE no action ON UPDATE no action;