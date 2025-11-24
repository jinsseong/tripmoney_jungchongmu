import { NextResponse } from "next/server";

export async function GET() {
  const manifest = {
    name: "여행 정산 관리",
    short_name: "여행정산",
    description: "친구들과 함께하는 여행 비용을 투명하게 정산하는 앱",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#3b82f6",
    orientation: "portrait-primary",
    categories: ["travel", "finance", "productivity"],
    lang: "ko-KR",
    icons: [],
    shortcuts: [
      {
        name: "지출 추가",
        short_name: "지출 추가",
        description: "새로운 지출 내역 추가",
        url: "/add-expense?type=regular",
      },
      {
        name: "정산 현황",
        short_name: "정산",
        description: "현재 정산 현황 확인",
        url: "/dashboard",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

