ALTER TABLE "feelings" ADD COLUMN "submitter_id" uuid;--> statement-breakpoint
ALTER TABLE "feelings" ADD COLUMN "cycle" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "feelings" ADD CONSTRAINT "feelings_submitter_id_users_id_fk" FOREIGN KEY ("submitter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feelings_one_per_submitter_per_cycle" ON "feelings" USING btree ("submitter_id","cycle");