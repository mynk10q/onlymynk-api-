// pages/api/index.js

export default async function handler(req, res) {
  try {
    const baseUrl = "https://dark-trace-networks.vercel.app/api";
    const myCredit = "@mynk_mynk_mynk";

    // Ensure query includes key=onlymynk as you wanted; but we forward whatever query client sends.
    // Build target URL
    const query = new URLSearchParams(req.query).toString();
    const target = `${baseUrl}${query ? "?" + query : ""}`;

    const upstream = await fetch(target);
    const contentType = upstream.headers.get("content-type") || "";

    // If JSON -> parse and replace credit field only
    if (contentType.includes("application/json")) {
      const data = await upstream.json();

      // If top-level has result array with objects, set credit in each object
      if (data && Array.isArray(data.result)) {
        data.result = data.result.map(item => {
          // keep existing keys and only set/replace credit
          return { ...item, credit: myCredit };
        });
      } else if (data && data.credit) {
        // if credit is top-level
        data.credit = myCredit;
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(200).json(data);
    }

    // For non-JSON responses (text/html/plain), replace "credit" word globally
    const text = await upstream.text();
    const replaced = text.replace(/@?DarkTrace_Networks/gi, myCredit).replace(/credit/gi, myCredit);
    res.setHeader("Content-Type", contentType || "text/plain; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).send(replaced);

  } catch (err) {
    console.error("Proxy Error:", err);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({ success: false, error: err.message });
  }
}
