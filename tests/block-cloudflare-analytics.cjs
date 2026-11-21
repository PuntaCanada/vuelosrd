// Test-only network isolation. NEVER import into published VuelosRD pages.
// Intercept Cloudflare's analytics script and RUM beacon before any navigation.
'use strict';
const ANALYTICS_URL=/^https?:\/\/(?:static\.)?cloudflareinsights\.com\/|\/cdn-cgi\/rum(?:[?#]|$)/i;
async function blockCloudflareAnalytics(target) {
 await target.route(ANALYTICS_URL, route => route.abort('blockedbyclient'));
}
async function newTrackingFreePage(browser, options) {
 const page=await browser.newPage(options);
 await blockCloudflareAnalytics(page);
 return page;
}
module.exports={ANALYTICS_URL,blockCloudflareAnalytics,newTrackingFreePage};
