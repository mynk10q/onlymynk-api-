export default async function handler(req, res) {
  try {
    const UPSTREAM_BASE = "https://dark-trace-networks.vercel.app/api";
    const PUBLIC_KEY = "onlymynk";
    const UPSTREAM_KEY = "DarkTrace_Network";
    const MY_CREDIT = "@mynk_mynk_mynk";

    // swap user key to upstream key
    const incoming = { ...req.query };
    if (incoming.key && incoming.key === PUBLIC_KEY) incoming.key = UPSTREAM_KEY;
    const upstreamQuery = new URLSearchParams(incoming).toString();
    const targetUrl = `${UPSTREAM_BASE}?${upstreamQuery}`;

    const upstreamResponse = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": req.headers["user-agent"] || "Mozilla/5.0",
        "Accept": "application/json, text/plain, */*",
      },
    });

    const status = upstreamResponse.status;
    let bodyText = await upstreamResponse.text();

    // replace credits inside result objects
    bodyText = bodyText
      .replace(/"credit"\s*:\s*"@?DarkTrace_Networks"/gi, `"credit": "${MY_CREDIT}"`)
      .replace(/"credit"\s*:\s*"@?DarkTrace_Network"/gi, `"credit": "${MY_CREDIT}"`);

    // completely remove the top-level "credit": "...", if it exists
    bodyText = bodyText.replace(/,\s*"credit"\s*:\s*".*?"/gi, "");

    // cleanup any trailing commas after removal
    bodyText = bodyText.replace(/,\s*}/g, "}");

    let finalBody;
    try {
      finalBody = JSON.parse(bodyText);
    } catch {
      finalBody = bodyText;
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(status).json(finalBody);
  } catch (err) {
    console.error("Proxy error:", err);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({
      success: false,
      error: err.message,
      credit: "@mynk_mynk_mynk",
    });
  }
}
