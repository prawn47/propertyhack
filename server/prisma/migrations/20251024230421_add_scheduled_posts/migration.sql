-- CreateTable
CREATE TABLE "scheduled_posts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "image_url" TEXT,
    "scheduled_for" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "scheduled_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "scheduled_posts_user_id_idx" ON "scheduled_posts"("user_id");

-- CreateIndex
CREATE INDEX "scheduled_posts_scheduled_for_idx" ON "scheduled_posts"("scheduled_for");

-- CreateIndex
CREATE INDEX "scheduled_posts_status_idx" ON "scheduled_posts"("status");
