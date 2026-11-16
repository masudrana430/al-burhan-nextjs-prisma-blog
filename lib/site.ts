const configuredSiteUrl = process.env.SITE_URL || process.env.NEXTAUTH_URL;

export const siteUrl = (configuredSiteUrl && !/localhost|127\\.0\\.0\\.1/.test(configuredSiteUrl)
  ? configuredSiteUrl
  : 'https://al-burhan-pearl-nine.vercel.app'
).replace(/\\/+$/, '');
