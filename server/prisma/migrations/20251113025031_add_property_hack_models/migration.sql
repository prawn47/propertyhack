-- CreateTable
CREATE TABLE "markets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "article_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "market" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "article_sources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "logo_url" TEXT,
    "feedType" TEXT NOT NULL,
    "feed_url" TEXT,
    "api_key" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "auto_import" BOOLEAN NOT NULL DEFAULT false,
    "market" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT,
    "source_url" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "source_logo_url" TEXT,
    "meta_description" TEXT NOT NULL,
    "focus_keywords" TEXT NOT NULL,
    "og_image" TEXT,
    "image_url" TEXT,
    "image_alt_text" TEXT,
    "market" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" DATETIME,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "author_id" TEXT NOT NULL,
    "source_id" TEXT,
    "category_id" TEXT,
    CONSTRAINT "articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "articles_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "article_sources" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "article_categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "super_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "linkedin_id" TEXT,
    "linkedin_access_token" TEXT,
    "linkedin_token_expiry" DATETIME,
    "linkedin_connected" BOOLEAN NOT NULL DEFAULT false,
    "otp_code" TEXT,
    "otp_expiry" DATETIME,
    "subscription_tier" TEXT NOT NULL DEFAULT 'free',
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "subscription_status" TEXT NOT NULL DEFAULT 'trial',
    "trial_ends_at" DATETIME,
    "subscription_ends_at" DATETIME,
    "monthly_post_count" INTEGER NOT NULL DEFAULT 0,
    "last_post_count_reset" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "display_name" TEXT
);
INSERT INTO "new_users" ("created_at", "email", "email_verified", "id", "last_post_count_reset", "linkedin_access_token", "linkedin_connected", "linkedin_id", "linkedin_token_expiry", "monthly_post_count", "otp_code", "otp_expiry", "password_hash", "stripe_customer_id", "stripe_subscription_id", "subscription_ends_at", "subscription_status", "subscription_tier", "super_admin", "trial_ends_at", "updated_at") SELECT "created_at", "email", "email_verified", "id", "last_post_count_reset", "linkedin_access_token", "linkedin_connected", "linkedin_id", "linkedin_token_expiry", "monthly_post_count", "otp_code", "otp_expiry", "password_hash", "stripe_customer_id", "stripe_subscription_id", "subscription_ends_at", "subscription_status", "subscription_tier", "super_admin", "trial_ends_at", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "markets_code_key" ON "markets"("code");

-- CreateIndex
CREATE UNIQUE INDEX "article_categories_slug_key" ON "article_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "articles_market_idx" ON "articles"("market");

-- CreateIndex
CREATE INDEX "articles_status_idx" ON "articles"("status");

-- CreateIndex
CREATE INDEX "articles_published_at_idx" ON "articles"("published_at");

-- CreateIndex
CREATE INDEX "articles_featured_idx" ON "articles"("featured");

-- CreateIndex
CREATE INDEX "articles_author_id_idx" ON "articles"("author_id");
