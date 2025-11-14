-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "super_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "linkedin_id" TEXT,
    "linkedin_access_token" TEXT,
    "linkedin_token_expiry" TIMESTAMP(3),
    "linkedin_connected" BOOLEAN NOT NULL DEFAULT false,
    "otp_code" TEXT,
    "otp_expiry" TIMESTAMP(3),
    "subscription_tier" TEXT NOT NULL DEFAULT 'free',
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "subscription_status" TEXT NOT NULL DEFAULT 'trial',
    "trial_ends_at" TIMESTAMP(3),
    "subscription_ends_at" TIMESTAMP(3),
    "monthly_post_count" INTEGER NOT NULL DEFAULT 0,
    "last_post_count_reset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "display_name" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
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
    "last_email_prompt_sent" TIMESTAMP(3),
    "image_style" TEXT NOT NULL DEFAULT 'Abstract/Conceptual',
    "custom_image_prompt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draft_posts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "image_url" TEXT,
    "is_publishing" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "published_posts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "image_url" TEXT,
    "published_at" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "published_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_posts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "image_url" TEXT,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "variables" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_articles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "published_at" TIMESTAMP(3),
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT,
    "relevance_score" DOUBLE PRECISION,
    "is_read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_responses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "prompt_email_id" TEXT NOT NULL,
    "reply_content" TEXT NOT NULL,
    "draft_post_id" TEXT,
    "follow_up_email_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "excerpt" TEXT,
    "published_at" TIMESTAMP(3),
    "scraped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE INDEX "draft_posts_user_id_idx" ON "draft_posts"("user_id");

-- CreateIndex
CREATE INDEX "draft_posts_created_at_idx" ON "draft_posts"("created_at");

-- CreateIndex
CREATE INDEX "published_posts_user_id_idx" ON "published_posts"("user_id");

-- CreateIndex
CREATE INDEX "published_posts_created_at_idx" ON "published_posts"("created_at");

-- CreateIndex
CREATE INDEX "scheduled_posts_user_id_idx" ON "scheduled_posts"("user_id");

-- CreateIndex
CREATE INDEX "scheduled_posts_scheduled_for_idx" ON "scheduled_posts"("scheduled_for");

-- CreateIndex
CREATE INDEX "scheduled_posts_status_idx" ON "scheduled_posts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_templates_name_key" ON "prompt_templates"("name");

-- CreateIndex
CREATE INDEX "news_articles_user_id_idx" ON "news_articles"("user_id");

-- CreateIndex
CREATE INDEX "news_articles_fetched_at_idx" ON "news_articles"("fetched_at");

-- CreateIndex
CREATE INDEX "news_articles_is_read_idx" ON "news_articles"("is_read");

-- CreateIndex
CREATE INDEX "email_responses_user_id_idx" ON "email_responses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sources_name_key" ON "sources"("name");

-- CreateIndex
CREATE INDEX "articles_source_id_idx" ON "articles"("source_id");

-- CreateIndex
CREATE INDEX "articles_user_id_idx" ON "articles"("user_id");

-- CreateIndex
CREATE INDEX "articles_status_idx" ON "articles"("status");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_posts" ADD CONSTRAINT "draft_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "published_posts" ADD CONSTRAINT "published_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_responses" ADD CONSTRAINT "email_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
