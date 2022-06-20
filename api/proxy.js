import { createProxyMiddleware } from "http-proxy-middleware";

module.exports = (req, res) => {
    let target = "";

    // proxy target url
    if (req.url.startsWith("/api")) {
        target = "https://oblique-tree-vercel.vercel.app";
    }

    createProxyMiddleware({
        target,
        changeOrigin: true,
    })(req, res)
} 