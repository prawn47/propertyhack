-- CreateTable
CREATE TABLE "news_articles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "published_at" DATETIME,
    "fetched_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT,
    "relevance_score" REAL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "news_articles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "news_articles_user_id_idx" ON "news_articles"("user_id");

-- CreateIndex
CREATE INDEX "news_articles_fetched_at_idx" ON "news_articles"("fetched_at");

-- CreateIndex
CREATE INDEX "news_articles_is_read_idx" ON "news_articles"("is_read");
