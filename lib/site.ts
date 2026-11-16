const configuredSiteUrl = process.env.SITE_URL || process.env.NEXTAUTH_URL;
const selectedSiteUrl = configuredSiteUrl && !/localhost|127\.0\.0\.1/.test(configuredSiteUrl)
  ? configuredSiteUrl
  : 'https://al-burhan-pearl-nine.vercel.app';

export const siteUrl = selectedSiteUrl.endsWith('/') ? selectedSiteUrl.slice(0, -1) : selectedSiteUrl;
