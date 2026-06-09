ALTER TABLE "sessions" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_rag_chunks_project_file" ON "rag_chunks" USING btree ("project_id","file_id");--> statement-breakpoint
CREATE INDEX "idx_user_facts_user_id" ON "user_facts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_vault_files_user_deleted" ON "vault_files" USING btree ("user_id","deleted_at");