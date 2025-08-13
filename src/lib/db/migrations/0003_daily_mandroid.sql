CREATE TYPE "public"."artifact_message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TABLE "artifact_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"content" text DEFAULT '' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artifact_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artifact_id" uuid NOT NULL,
	"role" "artifact_message_role" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artifact_document" ADD CONSTRAINT "artifact_document_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artifact_message" ADD CONSTRAINT "artifact_message_artifact_id_artifact_document_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."artifact_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "artifact_document_user_unique" ON "artifact_document" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "artifact_document_updated_idx" ON "artifact_document" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "artifact_message_artifact_idx" ON "artifact_message" USING btree ("artifact_id");--> statement-breakpoint
CREATE INDEX "artifact_message_created_idx" ON "artifact_message" USING btree ("created_at");