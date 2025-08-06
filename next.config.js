/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ 개발 환경 최적화
  experimental: {
    // RSC 안정성 향상
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
    // Fast Refresh 안정성 향상
    optimizePackageImports: ['react-hot-toast', 'lucide-react'],
  },
  
  // ✅ 웹팩 최적화
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // 개발 환경에서 HMR 안정성 향상
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    
    // ✅ 번들 크기 최적화
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    }
    
    return config
  },
  
  // ✅ 이미지 최적화
  images: {
    domains: ['ewxzampbdpuaawzrvsln.supabase.co'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // ✅ 환경 변수 최적화
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  
  // ✅ 개발 서버 설정
  devIndicators: {
    buildActivity: false,
  },
  
  // ✅ 타입스크립트 설정
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ✅ ESLint 설정
  eslint: {
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig 