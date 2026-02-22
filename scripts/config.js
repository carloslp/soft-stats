/**
 * config.js — API configuration
 *
 * Set SOFT_STATS_API_URL on the window object BEFORE this file is loaded
 * if you need to override it at runtime (e.g. injected by a server-side
 * template).  Otherwise the value from .env (via a build step) or the
 * default below is used.
 *
 * For Vercel deployments set the environment variable VITE_API_URL (or
 * replace the placeholder below with your actual endpoint URL).
 */
window.SOFT_STATS_CONFIG = {
  // Replace with your actual Vercel API endpoint, e.g.:
  // apiUrl: 'https://your-app.vercel.app/api/stats'
  apiUrl: window.SOFT_STATS_API_URL || '/api/stats'
};
