CREATE TABLE "upvotes" (
	"user_id" uuid NOT NULL,
	"cycle" date NOT NULL,
	"feeling_id" uuid NOT NULL,
	"cast_at" timestamp with time zone NOT NULL,
	CONSTRAINT "upvotes_user_id_cycle_pk" PRIMARY KEY("user_id","cycle")
);
--> statement-breakpoint
ALTER TABLE "upvotes" ADD CONSTRAINT "upvotes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upvotes" ADD CONSTRAINT "upvotes_feeling_id_feelings_id_fk" FOREIGN KEY ("feeling_id") REFERENCES "public"."feelings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "upvotes_by_feeling" ON "upvotes" USING btree ("feeling_id");