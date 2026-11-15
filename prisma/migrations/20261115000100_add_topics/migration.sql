CREATE TABLE "Topic" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT NOT NULL DEFAULT '#1a73e8',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");
CREATE INDEX "Topic_isActive_sortOrder_idx" ON "Topic"("isActive", "sortOrder");
ALTER TABLE "Post" ADD COLUMN "topicId" TEXT;
CREATE INDEX "Post_topicId_published_idx" ON "Post"("topicId", "published");
ALTER TABLE "Post" ADD CONSTRAINT "Post_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
