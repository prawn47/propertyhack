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
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_settings" ("audience", "content_examples", "created_at", "english_variant", "id", "industry", "keywords", "position", "post_goal", "preferred_time", "profile_picture_url", "time_zone", "tone_of_voice", "updated_at", "user_id") SELECT "audience", "content_examples", "created_at", "english_variant", "id", "industry", "keywords", "position", "post_goal", "preferred_time", "profile_picture_url", "time_zone", "tone_of_voice", "updated_at", "user_id" FROM "user_settings";
DROP TABLE "user_settings";
ALTER TABLE "new_user_settings" RENAME TO "user_settings";
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
