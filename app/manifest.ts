import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ZeroQ 공간 혼잡도",
    short_name: "ZeroQ",
    description: "센서의 최신 측정을 바탕으로 공간별 현재 혼잡도를 확인합니다.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f3",
    theme_color: "#f4f6f3",
    lang: "ko-KR",
    categories: ["utilities", "lifestyle"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
