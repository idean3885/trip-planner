import type { MetadataRoute } from "next";

import { projectMeta } from "@/lib/project-meta";

// spec: 브랜드 이미지(#907) — 웹 앱 매니페스트. 설치 시 이름·아이콘·테마색을
// 브라우저/OS에 넘긴다. theme_color·background_color 는 페이지 캔버스 그라데이션
// 상단색과 맞춘다 (#911). 아이콘은 public/icons.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: projectMeta.name,
    short_name: projectMeta.name,
    description: projectMeta.description,
    start_url: "/",
    display: "standalone",
    background_color: "#eef6f3",
    theme_color: "#eef6f3",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
