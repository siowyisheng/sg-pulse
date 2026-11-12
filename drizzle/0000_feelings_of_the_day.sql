CREATE TYPE "public"."polarity" AS ENUM('good', 'bad');--> statement-breakpoint
CREATE TABLE "feelings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"polarity" "polarity" NOT NULL,
	"hashtag" text NOT NULL,
	"seed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feelings_of_the_day" (
	"cycle" date NOT NULL,
	"polarity" "polarity" NOT NULL,
	"feeling_id" uuid NOT NULL,
	CONSTRAINT "feelings_of_the_day_cycle_polarity_pk" PRIMARY KEY("cycle","polarity")
);
--> statement-breakpoint
ALTER TABLE "feelings_of_the_day" ADD CONSTRAINT "feelings_of_the_day_feeling_id_feelings_id_fk" FOREIGN KEY ("feeling_id") REFERENCES "public"."feelings"("id") ON DELETE no action ON UPDATE no action;