const SAVED_ARTICLES_KEY = 'al_burhan_saved_article_ids_v1';
const LEGACY_POSTS_KEY = 'al_burhan_posts_v2';
const SAVED_CHANGED_EVENT = 'al-burhan:saved-articles-changed';

export function getSavedArticleIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(SAVED_ARTICLES_KEY) || '[]');
    return Array.isArray(value)
      ? Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0)))
      : [];
  } catch {
    return [];
  }
}

export function setSavedArticle(postId: string, saved: boolean): string[] {
  if (typeof window === 'undefined' || !postId) return [];
  const ids = new Set(getSavedArticleIds());
  if (saved) ids.add(postId);
  else ids.delete(postId);

  const nextIds = Array.from(ids);
  try {
    window.localStorage.setItem(SAVED_ARTICLES_KEY, JSON.stringify(nextIds));
    window.dispatchEvent(new Event(SAVED_CHANGED_EVENT));
  } catch {
    // The current page can still update its in-memory state if browser storage is blocked.
  }
  return nextIds;
}

/**
 * Migrate bookmarks from the previous cached-post implementation.
 * The old cache was overwritten by API data with bookmarked=false, so this
 * migration preserves any legacy bookmarks that are still available.
 */
export function migrateLegacySavedArticles(): string[] {
  if (typeof window === 'undefined') return [];
  const ids = new Set(getSavedArticleIds());
  let changed = false;

  try {
    const cached: unknown = JSON.parse(window.localStorage.getItem(LEGACY_POSTS_KEY) || '[]');
    if (Array.isArray(cached)) {
      for (const item of cached) {
        if (
          item &&
          typeof item === 'object' &&
          'id' in item &&
          typeof item.id === 'string' &&
          'bookmarked' in item &&
          item.bookmarked === true &&
          !ids.has(item.id)
        ) {
          ids.add(item.id);
          changed = true;
        }
      }
    }

    if (changed) window.localStorage.setItem(SAVED_ARTICLES_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Keep any bookmarks already stored under the new key.
  }

  return Array.from(ids);
}
