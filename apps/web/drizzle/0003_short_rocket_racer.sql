CREATE TABLE "ai_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"openai_base_url" text,
	"openai_api_key_enc" text,
	"openai_model" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_providers" ADD CONSTRAINT "ai_providers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_providers_userId_idx" ON "ai_providers" USING btree ("user_id");
--> statement-breakpoint
INSERT INTO "ai_providers" ("id", "user_id", "name", "openai_base_url", "openai_api_key_enc", "openai_model", "is_default", "created_at", "updated_at")
SELECT
  ("user_id" || ':default') as "id",
  "user_id",
  '默认' as "name",
  "openai_base_url",
  "openai_api_key_enc",
  "openai_model",
  true as "is_default",
  now() as "created_at",
  now() as "updated_at"
FROM "user_ai_settings"
WHERE
  ("openai_base_url" IS NOT NULL OR "openai_api_key_enc" IS NOT NULL OR "openai_model" IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM "ai_providers" p
    WHERE p."user_id" = "user_ai_settings"."user_id" AND p."is_default" = true
  );
