import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Importação do PDF "Record of Responses" (processos/import-record-actions.ts)
    // chega por Server Action; o padrão do Next é 1 MB.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
