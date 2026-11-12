CREATE TABLE "audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"at" timestamp with time zone NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"feeling_id" uuid,
	"detail" text
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feeling_id" uuid NOT NULL,
	"reporter_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"outcome" text,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "feelings" ADD COLUMN "reported_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "feelings" ADD COLUMN "removed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "feelings" ADD COLUMN "correction_notice" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reporting_timed_out_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_feeling_id_feelings_id_fk" FOREIGN KEY ("feeling_id") REFERENCES "public"."feelings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reports_by_feeling" ON "reports" USING btree ("feeling_id");