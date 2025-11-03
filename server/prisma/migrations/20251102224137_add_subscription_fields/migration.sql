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
    "subscription_tier" TEXT NOT NULL DEFAULT 'free',
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "subscription_status" TEXT NOT NULL DEFAULT 'trial',
    "trial_ends_at" DATETIME,
    "subscription_ends_at" DATETIME,
    "monthly_post_count" INTEGER NOT NULL DEFAULT 0,
    "last_post_count_reset" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_users" ("created_at", "email", "email_verified", "id", "linkedin_access_token", "linkedin_connected", "linkedin_id", "linkedin_token_expiry", "password_hash", "super_admin", "updated_at") SELECT "created_at", "email", "email_verified", "id", "linkedin_access_token", "linkedin_connected", "linkedin_id", "linkedin_token_expiry", "password_hash", "super_admin", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
