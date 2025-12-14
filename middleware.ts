import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // 仅处理 /api 路径的请求
  if (request.nextUrl.pathname.startsWith("/api")) {
    const origin = request.headers.get("origin");

    // 定义允许的来源列表
    // https://localhost 是 Android 模拟器/真机通常使用的来源
    // capacitor://localhost 是 iOS 通常使用的来源
    const allowedOrigins = [
      "https://localhost",
      "http://localhost",
      "capacitor://localhost",
      "http://localhost:3000",
      "https://earthechoes.dufran.cn",
    ];

    const response = NextResponse.next();

    // 处理 CORS 头
    if (origin) {
      // 如果来源在白名单中，或者为了开发方便允许所有（生产环境建议严格限制）
      // 这里我们简单地回显 origin 以允许它，配合 Credentials: true 使用
      response.headers.set("Access-Control-Allow-Origin", origin);
    }

    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, DELETE, PATCH, POST, PUT, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
    );

    // 处理预检请求 (OPTIONS)
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: response.headers,
      });
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
