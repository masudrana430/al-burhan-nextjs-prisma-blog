const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const topics = [
  ['topic-cosmology', 'মহাবিশ্ববিদ্যা ও পদার্থবিজ্ঞান', 'cosmology-physics', 'মহাবিশ্ব, পদার্থবিজ্ঞান, জ্যোতির্বিজ্ঞান ও মহাকাশবিজ্ঞান', 1],
  ['topic-biology', 'জীববিজ্ঞান ও ভ্রূণতত্ত্ব', 'biology-embryology', 'জীববিজ্ঞান, মানবদেহ, জীবপ্রযুক্তি ও ভ্রূণতত্ত্ব', 2],
  ['topic-history', 'ইতিহাস ও নৈতিকতা', 'history-ethics', 'ইতিহাস, সভ্যতা, সমাজ ও নৈতিক দর্শন', 3],
  ['topic-philosophy', 'দর্শন ও যুক্তিবিদ্যা', 'philosophy-logic', 'দর্শন, যুক্তিবিদ্যা, জ্ঞানতত্ত্ব ও সমালোচনামূলক চিন্তা', 4],
  ['topic-language', 'ভাষাতত্ত্ব ও তাফসির', 'linguistics-tafsir', 'ভাষা, সাহিত্য, আরবি ভাষাতত্ত্ব ও তাফসির', 5],
];

async function main() {
  for (const [id, name, slug, description, sortOrder] of topics) {
    await prisma.topic.upsert({
      where: { slug },
      update: { name, description, sortOrder, isActive: true },
      create: { id, name, slug, description, sortOrder },
    });
  }
}

main()
  .catch((error) => { console.error('[prisma seed]', error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
