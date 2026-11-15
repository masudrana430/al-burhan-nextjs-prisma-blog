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

INSERT INTO "Topic" ("id", "name", "slug", "description", "sortOrder", "updatedAt") VALUES
('topic-cosmology', 'মহাবিশ্ববিদ্যা ও পদার্থবিজ্ঞান', 'cosmology-physics', 'মহাবিশ্ব, পদার্থবিজ্ঞান, জ্যোতির্বিজ্ঞান ও মহাকাশবিজ্ঞান', 1, CURRENT_TIMESTAMP),
('topic-biology', 'জীববিজ্ঞান ও ভ্রূণতত্ত্ব', 'biology-embryology', 'জীববিজ্ঞান, মানবদেহ, জীবপ্রযুক্তি ও ভ্রূণতত্ত্ব', 2, CURRENT_TIMESTAMP),
('topic-history', 'ইতিহাস ও নৈতিকতা', 'history-ethics', 'ইতিহাস, সভ্যতা, সমাজ ও নৈতিক দর্শন', 3, CURRENT_TIMESTAMP),
('topic-philosophy', 'দর্শন ও যুক্তিবিদ্যা', 'philosophy-logic', 'দর্শন, যুক্তিবিদ্যা, জ্ঞানতত্ত্ব ও সমালোচনামূলক চিন্তা', 4, CURRENT_TIMESTAMP),
('topic-language', 'ভাষাতত্ত্ব ও তাফসির', 'linguistics-tafsir', 'ভাষা, সাহিত্য, আরবি ভাষাতত্ত্ব ও তাফসির', 5, CURRENT_TIMESTAMP);
