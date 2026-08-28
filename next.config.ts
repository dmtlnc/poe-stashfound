import type { NextConfig } from "next";

const staticExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(staticExport ? { output: "export" as const, trailingSlash: true, images: { unoptimized: true } } : {}),
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
