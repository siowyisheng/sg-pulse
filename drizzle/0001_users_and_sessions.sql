CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "singpass_logins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_hash" text NOT NULL,
	"nonce" text NOT NULL,
	"code_verifier" text NOT NULL,
	"adapter_state" text,
	"created_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"proof_hash" text,
	"person" jsonb,
	CONSTRAINT "singpass_logins_state_hash_unique" UNIQUE("state_hash"),
	CONSTRAINT "singpass_logins_proof_hash_unique" UNIQUE("proof_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"singpass_subject" text NOT NULL,
	"initials" text NOT NULL,
	"sex" text,
	"date_of_birth" date NOT NULL,
	"consented_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "users_singpass_subject_unique" UNIQUE("singpass_subject")
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;