// Exportação estática => publicável no GitHub Pages (HTTPS/TLS fornecido pelo próprio GH Pages).
const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
module.exports = { output: 'export', basePath: base, assetPrefix: base || undefined, trailingSlash: true, images: { unoptimized: true }, reactStrictMode: true, poweredByHeader: false };
