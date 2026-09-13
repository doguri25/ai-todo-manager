import type { Todo, TodoPriority } from "@/lib/todos/types";

export type CompletionFilter = "all" | "completed" | "incomplete";

export type TodoSortKey = "priority" | "due_date" | "created_at" | "title";

export type TodoSortOrder = "asc" | "desc";

const PRIORITY_RANK: Record<TodoPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

type FilterSortInput = {
  todos: Todo[];
  query: string;
  completion: CompletionFilter;
  priority: TodoPriority | "all";
  sort: TodoSortKey;
  order: TodoSortOrder;
};

/**
 * 검색·필터·정렬을 적용한 할 일 목록을 반환한다. (클라이언트 보조용)
 */
export const filterAndSortTodos = ({
  todos,
  query,
  completion,
  priority,
  sort,
  order,
}: FilterSortInput): Todo[] => {
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = todos.filter((todo) => {
    if (completion === "completed" && !todo.completed) return false;
    if (completion === "incomplete" && todo.completed) return false;
    if (priority !== "all" && todo.priority !== priority) return false;

    if (!normalizedQuery) return true;
    return todo.title.toLowerCase().includes(normalizedQuery);
  });

  const direction = order === "asc" ? 1 : -1;

  return [...filtered].sort((a, b) => {
    if (sort === "priority") {
      return (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * direction;
    }

    if (sort === "due_date") {
      const aTime = a.due_date
        ? new Date(a.due_date).getTime()
        : Number.POSITIVE_INFINITY;
      const bTime = b.due_date
        ? new Date(b.due_date).getTime()
        : Number.POSITIVE_INFINITY;
      if (aTime === bTime) return 0;
      return (aTime - bTime) * direction;
    }

    if (sort === "title") {
      return a.title.localeCompare(b.title, "ko") * direction;
    }

    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return (aTime - bTime) * direction;
  });
};
