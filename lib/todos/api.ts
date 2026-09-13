import { createClient } from "@/lib/supabase/client";
import type {
  CompletionFilter,
  TodoSortKey,
  TodoSortOrder,
} from "@/lib/todos/filter";
import type { Todo, TodoFormValues, TodoPriority } from "@/lib/todos/types";

export type TodoListQuery = {
  userId: string;
  query?: string;
  completion?: CompletionFilter;
  priority?: TodoPriority | "all";
  sort?: TodoSortKey;
  order?: TodoSortOrder;
};

type TodoResult<T> = {
  data: T | null;
  error: string | null;
};

/**
 * Supabase/PostgREST 오류를 사용자용 한글 메시지로 변환한다.
 */
export const toTodoErrorMessage = (
  error: { message?: string; code?: string; status?: number } | null,
  fallback: string
): string => {
  if (!error?.message) return fallback;

  const message = error.message.toLowerCase();
  const code = error.code?.toLowerCase() ?? "";

  if (
    message.includes("jwt expired") ||
    message.includes("invalid jwt") ||
    message.includes("not authenticated") ||
    code === "pgrst301" ||
    error.status === 401
  ) {
    return "로그인이 만료되었어요. 다시 로그인해 주세요.";
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("fetch failed")
  ) {
    return "네트워크 연결을 확인하고 다시 시도해 주세요.";
  }

  if (message.includes("row-level security") || code === "42501") {
    return "이 할 일을 변경할 권한이 없어요.";
  }

  if (message.includes("foreign key") || code === "23503") {
    return "사용자 프로필이 아직 준비되지 않았어요. 다시 로그인해 주세요.";
  }

  return fallback;
};

/**
 * 로그인 사용자의 프로필 행이 없으면 생성한다.
 */
export const ensureUserProfile = async (input: {
  id: string;
  email: string;
  displayName: string;
}): Promise<TodoResult<null>> => {
  const supabase = createClient();
  const { error } = await supabase.from("users").upsert(
    {
      id: input.id,
      email: input.email,
      display_name: input.displayName,
    },
    { onConflict: "id" }
  );

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[ensureUserProfile]", error);
    }
    return {
      data: null,
      error: toTodoErrorMessage(
        error,
        "사용자 정보를 준비하지 못했어요. 잠시 후 다시 시도해 주세요."
      ),
    };
  }

  return { data: null, error: null };
};

/**
 * 현재 사용자의 할 일 목록을 검색·필터·정렬해 조회한다.
 */
export const fetchTodos = async ({
  userId,
  query = "",
  completion = "all",
  priority = "all",
  sort = "created_at",
  order = "desc",
}: TodoListQuery): Promise<TodoResult<Todo[]>> => {
  const supabase = createClient();
  let request = supabase.from("todos").select("*").eq("user_id", userId);

  const keyword = query.trim();
  if (keyword) {
    request = request.ilike("title", `%${keyword}%`);
  }

  if (completion === "completed") {
    request = request.eq("completed", true);
  } else if (completion === "incomplete") {
    request = request.eq("completed", false);
  }

  if (priority !== "all") {
    request = request.eq("priority", priority);
  }

  const ascending = order === "asc";

  if (sort === "due_date") {
    request = request.order("due_date", {
      ascending,
      nullsFirst: false,
    });
  } else if (sort === "priority") {
    // enum 정의 순서(high < medium < low)를 따른다.
    request = request.order("priority", { ascending });
  } else if (sort === "title") {
    request = request.order("title", { ascending });
  } else {
    request = request.order("created_at", { ascending });
  }

  // 동일 키 보조 정렬
  if (sort !== "created_at") {
    request = request.order("created_at", { ascending: false });
  }

  const { data, error } = await request;

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[fetchTodos]", error);
    }
    return {
      data: null,
      error: toTodoErrorMessage(
        error,
        "할 일 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
      ),
    };
  }

  return { data: (data as Todo[]) ?? [], error: null };
};

/**
 * 현재 사용자의 전체 할 일 개수를 조회한다.
 */
export const countTodos = async (
  userId: string
): Promise<TodoResult<number>> => {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("todos")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[countTodos]", error);
    }
    return {
      data: null,
      error: toTodoErrorMessage(
        error,
        "할 일 개수를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
      ),
    };
  }

  return { data: count ?? 0, error: null };
};

/**
 * 새 할 일을 생성한다.
 */
export const createTodo = async (
  userId: string,
  values: TodoFormValues
): Promise<TodoResult<Todo>> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("todos")
    .insert({
      user_id: userId,
      title: values.title.trim(),
      description: values.description.trim() || null,
      due_date: values.due_date,
      priority: values.priority,
      category: values.category,
      completed: false,
    })
    .select("*")
    .single();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[createTodo]", error);
    }
    return {
      data: null,
      error: toTodoErrorMessage(
        error,
        "할 일을 저장하지 못했어요. 잠시 후 다시 시도해 주세요."
      ),
    };
  }

  return { data: data as Todo, error: null };
};

/**
 * 기존 할 일을 수정한다.
 */
export const updateTodo = async (
  todoId: string,
  values: Partial<TodoFormValues> & { completed?: boolean }
): Promise<TodoResult<Todo>> => {
  const supabase = createClient();
  const payload: Record<string, unknown> = {};

  if (values.title !== undefined) payload.title = values.title.trim();
  if (values.description !== undefined) {
    payload.description = values.description.trim() || null;
  }
  if (values.due_date !== undefined) payload.due_date = values.due_date;
  if (values.priority !== undefined) payload.priority = values.priority;
  if (values.category !== undefined) payload.category = values.category;
  if (values.completed !== undefined) payload.completed = values.completed;

  const { data, error } = await supabase
    .from("todos")
    .update(payload)
    .eq("id", todoId)
    .select("*")
    .single();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[updateTodo]", error);
    }
    return {
      data: null,
      error: toTodoErrorMessage(
        error,
        "할 일을 수정하지 못했어요. 잠시 후 다시 시도해 주세요."
      ),
    };
  }

  return { data: data as Todo, error: null };
};

/**
 * 할 일을 삭제한다.
 */
export const deleteTodo = async (
  todoId: string
): Promise<TodoResult<null>> => {
  const supabase = createClient();
  const { error } = await supabase.from("todos").delete().eq("id", todoId);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[deleteTodo]", error);
    }
    return {
      data: null,
      error: toTodoErrorMessage(
        error,
        "할 일을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요."
      ),
    };
  }

  return { data: null, error: null };
};
