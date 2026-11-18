export async function registerOffline() {
  if (!("serviceWorker" in navigator)) return;
  const h = window.location.hostname.toLowerCase();
  const preview =
    /(?:^|\.)(?:lovableproject(?:-dev)?\.com|beta\.lovable\.dev)$/.test(h) ||
    /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+\.(?:lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(
      h,
    ) ||
    /^project--.+-dev\.(?:lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(h);
  if (
    !import.meta.env.PROD ||
    window.self !== window.top ||
    preview ||
    new URLSearchParams(location.search).get("sw") === "off"
  ) {
    for (const r of await navigator.serviceWorker.getRegistrations())
      if (
        r.active?.scriptURL.endsWith("/sw.js") ||
        r.installing?.scriptURL.endsWith("/sw.js") ||
        r.waiting?.scriptURL.endsWith("/sw.js")
      )
        await r.unregister();
    return;
  }
  await navigator.serviceWorker.register("/sw.js");
}
