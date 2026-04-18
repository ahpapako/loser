import type { NextConfig } from "next";

const getSupabaseImageHost = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) return undefined;

  try {
    return new URL(supabaseUrl).hostname;
  } catch {
    return undefined;
  }
};

const supabaseImageHost = getSupabaseImageHost();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(supabaseImageHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseImageHost,
              pathname: "/storage/v1/object/public/tickets_images/**",
            },
          ]
        : []),
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },
};

export default nextConfig;
