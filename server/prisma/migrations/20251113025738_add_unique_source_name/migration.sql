/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `article_sources` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "article_sources_name_key" ON "article_sources"("name");
