// pages/api/index.js
export default async function handler(req, res) {
  try {
    const UPSTREAM_BASE = "https://dark-trace-networks.vercel.app/api";
    const PUBLIC_KEY = "onlymynk";
    const UPSTREAM_KEY = "DarkTrace_Network";
    const MY_CREDIT = "@mynk_mynk_mynk";

    // Build upstream query: if user sent key=onlymynk, swap to upstream accepted key
    const incoming = { ...req.query };
    if (incoming.key && incoming.key === PUBLIC_KEY) {
      incoming.key = UPSTREAM_KEY;
    }
    const upstreamQuery = new URLSearchParams(incoming).toString();
    const targetUrl = `${UPSTREAM_BASE}${upstreamQuery ? "?" + upstreamQuery : ""}`;

    // Forward minimal headers so upstream treats request normally
    const upstreamResponse = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": req.headers["user-agent"] || "Mozilla/5.0 (compatible)",
        "Accept": req.headers["accept"] || "application/json, text/plain, */*"
      },
    });

    const status = upstreamResponse.status;
    const contentType = upstreamResponse.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await upstreamResponse.json();

      // If there's a top-level credit field, replace it
      if (data && typeof data === "object") {
        if ("credit" in data) {
          data.credit = MY_CREDIT;
        }
        // If there's a result array, replace/add credit on each item
        if (Array.isArray(data.result)) {
          data.result = data.result.map(item => {
            // ensure item is object
            if (item && typeof item === "object") {
              return { ...item, credit: MY_CREDIT };
            }
            return item;
          });
        }
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(status).json(data);
    }

    // Non-JSON: replace known credit strings in text/html/plain
    const text = await upstreamResponse.text();
    const replaced = text
      .replace(/@?DarkTrace_Networks/gi, MY_CREDIT)
      .replace(/@?DarkTrace_Network/gi, MY_CREDIT)
      .replace(/credit/gi, MY_CREDIT);

    res.setHeader("Content-Type", contentType || "text/plain; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(status).send(replaced);

  } catch (err) {
    console.error("Proxy error:", err);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({ success: false, error: err.message });
  }
}
