// pages/api/index.js
export default async function handler(req, res) {
  try {
    const UPSTREAM_BASE = "https://dark-trace-networks.vercel.app/api";
    const PUBLIC_KEY = "onlymynk";               // what external users will send
    const UPSTREAM_KEY = "DarkTrace_Network";    // what upstream expects
    const MY_CREDIT = "@mynk_mynk_mynk";

    // Build params for upstream call:
    // If user sent key=onlymynk, replace it with the upstream accepted key.
    const incoming = { ...req.query };
    if (incoming.key && incoming.key === PUBLIC_KEY) {
      incoming.key = UPSTREAM_KEY;
    }
    // If user didn't send key, we don't force anything — forward as-is.
    const upstreamQuery = new URLSearchParams(incoming).toString();
    const targetUrl = `${UPSTREAM_BASE}${upstreamQuery ? "?" + upstreamQuery : ""}`;

    // Forward some headers to make upstream treat it like a normal request
    const forwardHeaders = {
      // prefer original user-agent if present, else set a common UA
      "User-Agent": req.headers["user-agent"] || "Mozilla/5.0 (compatible)",
      "Accept": req.headers["accept"] || "application/json, text/plain, */*",
      "Accept-Language": req.headers["accept-language"] || "en-US,en;q=0.9"
      // don't forward authorization or cookie headers unless you know what they do
    };

    const upstreamResponse = await fetch(targetUrl, {
      method: "GET",
      headers: forwardHeaders,
      // set a reasonable timeout via AbortController if desired
    });

    // preserve upstream status
    const status = upstreamResponse.status;
    const contentType = upstreamResponse.headers.get("content-type") || "";

    // If JSON, parse and replace only the credit field
    if (contentType.includes("application/json")) {
      const data = await upstreamResponse.json();

      // If top-level result array -> set credit in each item
      if (data && Array.isArray(data.result)) {
        data.result = data.result.map(item => ({ ...item, credit: MY_CREDIT }));
      } else if (data && typeof data === "object" && data.credit) {
        data.credit = MY_CREDIT;
      }

      // return with same status
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(status).json(data);
    }

    // For non-JSON (HTML/text) responses: do a simple replace of known credit text
    const textBody = await upstreamResponse.text();
    const replacedText = textBody
      .replace(/@?DarkTrace_Networks/gi, MY_CREDIT)
      .replace(/credit/gi, MY_CREDIT);

    // propagate content-type if available
    if (upstreamResponse.headers.get("content-type")) {
      res.setHeader("Content-Type", upstreamResponse.headers.get("content-type"));
    } else {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
    }
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(status).send(replacedText);

  } catch (err) {
    console.error("Proxy error:", err);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({ success: false, error: err.message });
  }
}
