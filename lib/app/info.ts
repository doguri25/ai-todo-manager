/** 앱 공개 버전 — package.json과 동기화한다. */
export const APP_VERSION = "1.1.3";

export const APP_INFO = {
  name: "도구리 태스크",
  tagline: "개인 할 일과 AI 요약을 한곳에서",
  author: "도구리",
  organization: "홍북초등학교",
  contact: "raccoon@ai.cne.go.kr",
  version: APP_VERSION,
  /** 배포 공개 URL (메타데이터·공유용) */
  url: "https://doguri-todo.vercel.app",
} as const;
