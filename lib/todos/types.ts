/**
 * PRD 기준 할 일 도메인 타입 정의.
 */

export type TodoPriority = "high" | "medium" | "low";

export type TodoCategory = "업무" | "개인" | "건강" | "학습" | "기타";

/** 목록 필터용 파생 진행 상태 */
export type TodoStatus = "in_progress" | "completed" | "overdue";

export type Todo = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TodoPriority;
  category: TodoCategory;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

/** 생성·수정 폼에서 다루는 필드 */
export type TodoFormValues = {
  title: string;
  description: string;
  due_date: string | null;
  priority: TodoPriority;
  category: TodoCategory;
  completed: boolean;
};

export const TODO_PRIORITIES: TodoPriority[] = ["high", "medium", "low"];

export const TODO_CATEGORIES: TodoCategory[] = [
  "업무",
  "개인",
  "건강",
  "학습",
  "기타",
];
