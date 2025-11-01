-- CreateTable
CREATE TABLE "prompt_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "variables" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
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
    "linkedin_connected" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_users" ("created_at", "email", "email_verified", "id", "linkedin_access_token", "linkedin_connected", "linkedin_id", "linkedin_token_expiry", "password_hash", "updated_at") SELECT "created_at", "email", "email_verified", "id", "linkedin_access_token", "linkedin_connected", "linkedin_id", "linkedin_token_expiry", "password_hash", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "prompt_templates_name_key" ON "prompt_templates"("name");
