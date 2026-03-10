-- CreateEnum
CREATE TYPE "NewsletterStatus" AS ENUM ('DRAFT', 'APPROVED', 'SENT');

-- CreateTable
CREATE TABLE "newsletter_drafts" (
    "id" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html_content" TEXT NOT NULL,
    "text_content" TEXT,
    "article_ids" TEXT[],
    "status" "NewsletterStatus" NOT NULL DEFAULT 'DRAFT',
    "beehiiv_post_id" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "newsletter_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "newsletter_drafts_jurisdiction_idx" ON "newsletter_drafts"("jurisdiction");

-- CreateIndex
CREATE INDEX "newsletter_drafts_status_idx" ON "newsletter_drafts"("status");
