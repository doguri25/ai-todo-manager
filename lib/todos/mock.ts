import type { Todo } from "@/lib/todos/types";

/** 화면 구성용 목 사용자 (Auth 연동 전) */
export const MOCK_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "demo@aitodo.app",
  displayName: "데모 사용자",
};

/**
 * 메인 화면 미리보기용 목 할 일 목록을 반환한다.
 */
export const createMockTodos = (): Todo[] => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  return [
    {
      id: "todo-1",
      user_id: MOCK_USER.id,
      title: "팀 회의 준비",
      description: "내일 오전 10시 회의 자료와 안건을 정리한다.",
      due_date: new Date(now + day).toISOString(),
      priority: "high",
      category: "업무",
      completed: false,
      created_at: new Date(now - 2 * day).toISOString(),
      updated_at: new Date(now - 2 * day).toISOString(),
    },
    {
      id: "todo-2",
      user_id: MOCK_USER.id,
      title: "주간 회고 작성",
      description: "이번 주 완료한 일과 다음 주 계획을 정리한다.",
      due_date: new Date(now + 3 * day).toISOString(),
      priority: "medium",
      category: "학습",
      completed: false,
      created_at: new Date(now - day).toISOString(),
      updated_at: new Date(now - day).toISOString(),
    },
    {
      id: "todo-3",
      user_id: MOCK_USER.id,
      title: "장보기",
      description: "과일, 계란, 커피를 산다.",
      due_date: new Date(now - day).toISOString(),
      priority: "low",
      category: "개인",
      completed: false,
      created_at: new Date(now - 4 * day).toISOString(),
      updated_at: new Date(now - 4 * day).toISOString(),
    },
    {
      id: "todo-4",
      user_id: MOCK_USER.id,
      title: "코드 리뷰 반영",
      description: "PR 피드백을 반영하고 테스트를 통과시킨다.",
      due_date: null,
      priority: "high",
      category: "업무",
      completed: true,
      created_at: new Date(now - 5 * day).toISOString(),
      updated_at: new Date(now - day / 2).toISOString(),
    },
  ];
};
