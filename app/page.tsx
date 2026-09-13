import type { Metadata } from "next";

import { TodoWorkspace } from "@/components/todo/TodoWorkspace";

export const metadata: Metadata = {
  title: "할 일",
  description: "할 일을 추가·검색·필터하고 진행 상태를 관리합니다.",
};

/**
 * 할 일 관리 메인 화면 진입점이다.
 */
const HomePage = () => {
  return <TodoWorkspace />;
};

export default HomePage;
