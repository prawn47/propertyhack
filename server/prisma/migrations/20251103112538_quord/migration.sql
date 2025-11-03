-- CreateTable
CREATE TABLE "email_responses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "prompt_email_id" TEXT NOT NULL,
    "reply_content" TEXT NOT NULL,
    "draft_post_id" TEXT,
    "follow_up_email_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "received_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" DATETIME,
    CONSTRAINT "email_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "tone_of_voice" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "post_goal" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "content_examples" TEXT NOT NULL,
    "time_zone" TEXT NOT NULL,
    "preferred_time" TEXT NOT NULL,
    "profile_picture_url" TEXT,
    "english_variant" TEXT NOT NULL,
    "news_categories" TEXT NOT NULL DEFAULT '[]',
    "news_languages" TEXT NOT NULL DEFAULT '["eng"]',
    "news_sources" TEXT NOT NULL DEFAULT '[]',
    "news_countries" TEXT NOT NULL DEFAULT '[]',
    "email_prompt_enabled" BOOLEAN NOT NULL DEFAULT false,
    "email_prompt_cadence" TEXT NOT NULL DEFAULT 'weekly',
    "email_prompt_time" TEXT NOT NULL DEFAULT '09:00',
    "email_prompt_days" TEXT NOT NULL DEFAULT '[1]',
    "last_email_prompt_sent" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_settings" ("audience", "content_examples", "created_at", "english_variant", "id", "industry", "keywords", "news_categories", "news_countries", "news_languages", "news_sources", "position", "post_goal", "preferred_time", "profile_picture_url", "time_zone", "tone_of_voice", "updated_at", "user_id") SELECT "audience", "content_examples", "created_at", "english_variant", "id", "industry", "keywords", "news_categories", "news_countries", "news_languages", "news_sources", "position", "post_goal", "preferred_time", "profile_picture_url", "time_zone", "tone_of_voice", "updated_at", "user_id" FROM "user_settings";
DROP TABLE "user_settings";
ALTER TABLE "new_user_settings" RENAME TO "user_settings";
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "email_responses_user_id_idx" ON "email_responses"("user_id");

-- CreateIndex
CREATE INDEX "email_responses_received_at_idx" ON "email_responses"("received_at");

-- CreateIndex
CREATE INDEX "email_responses_status_idx" ON "email_responses"("status");
