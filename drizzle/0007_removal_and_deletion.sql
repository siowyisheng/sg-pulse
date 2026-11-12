CREATE TABLE "removal_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feeling_id" uuid NOT NULL,
	"requester_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "feelings" ADD COLUMN "byline_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "removal_requests" ADD CONSTRAINT "removal_requests_feeling_id_feelings_id_fk" FOREIGN KEY ("feeling_id") REFERENCES "public"."feelings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "removal_requests" ADD CONSTRAINT "removal_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "removal_requests_by_feeling" ON "removal_requests" USING btree ("feeling_id");