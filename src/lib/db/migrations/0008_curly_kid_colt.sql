CREATE TYPE "public"."artifact_document_type" AS ENUM('obituary', 'eulogy');--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"date_of_birth" date,
	"date_of_death" date,
	"place_of_birth" text,
	"place_of_death" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
DROP INDEX "artifact_document_user_unique";--> statement-breakpoint
ALTER TABLE "artifact_document" ADD COLUMN "entry_id" uuid;--> statement-breakpoint
ALTER TABLE "artifact_document" ADD COLUMN "doc_type" "artifact_document_type" DEFAULT 'obituary';--> statement-breakpoint
ALTER TABLE "artifact_document" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "artifact_document" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "artifact_document" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entries_user_idx" ON "entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "entries_updated_idx" ON "entries" USING btree ("updated_at");--> statement-breakpoint
ALTER TABLE "artifact_document" ADD CONSTRAINT "artifact_document_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "artifact_document_user_entry_type_unique" ON "artifact_document" USING btree ("user_id","entry_id","doc_type");--> statement-breakpoint
CREATE INDEX "artifact_document_user_idx" ON "artifact_document" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "artifact_document_entry_idx" ON "artifact_document" USING btree ("entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "artifact_document_share_token_unique" ON "artifact_document" USING btree ("share_token");