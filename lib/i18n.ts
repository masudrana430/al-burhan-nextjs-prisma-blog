export type Locale = 'bn' | 'en';

export const messages = {
  bn: {
    home: 'হোম', articles: 'প্রবন্ধ', topics: 'বিষয়সমূহ', search: 'খুঁজুন',
    login: 'লগইন', register: 'নিবন্ধন', profile: 'প্রোফাইল',
    admin: 'প্রশাসক ড্যাশবোর্ড', newPost: 'নতুন পোস্ট লিখুন',
    publish: 'প্রকাশ করুন', saveDraft: 'খসড়া সংরক্ষণ',
    category: 'বিষয় / ক্যাটাগরি', title: 'শিরোনাম',
    summary: 'সংক্ষিপ্ত পরিচিতি', content: 'মূল লেখা', tags: 'ট্যাগ',
    difficulty: 'কঠিনতার স্তর',
  },
  en: {
    home: 'Home', articles: 'Articles', topics: 'Topics', search: 'Search',
    login: 'Sign in', register: 'Register', profile: 'Profile',
    admin: 'Admin dashboard', newPost: 'Write a post',
    publish: 'Publish', saveDraft: 'Save draft',
    category: 'Topic / category', title: 'Title',
    summary: 'Summary', content: 'Content', tags: 'Tags',
    difficulty: 'Difficulty',
  },
} as const;

export type MessageKey = keyof typeof messages.bn;

export function translate(locale: Locale, key: MessageKey): string {
  return messages[locale][key];
}
