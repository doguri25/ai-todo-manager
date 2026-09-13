"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PlusIcon } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { AiSummaryPanel } from "@/components/todo/AiSummaryPanel";
import { AiTodoInput } from "@/components/todo/AiTodoInput";
import { TodoForm } from "@/components/todo/TodoForm";
import { TodoHeader } from "@/components/todo/TodoHeader";
import { TodoList } from "@/components/todo/TodoList";
import { TodoToolbar } from "@/components/todo/TodoToolbar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  countTodos,
  createTodo,
  deleteTodo,
  ensureUserProfile,
  fetchTodos,
  updateTodo,
} from "@/lib/todos/api";
import type {
  CompletionFilter,
  TodoSortKey,
  TodoSortOrder,
} from "@/lib/todos/filter";
import type { Todo, TodoFormValues, TodoPriority } from "@/lib/todos/types";

/**
 * 마감일이 있는 할 일을 달력 강조용 Date 배열로 변환한다.
 */
const toScheduledDates = (items: Todo[]): Date[] => {
  const map = new Map<string, Date>();
  for (const todo of items) {
    if (!todo.due_date) continue;
    const due = new Date(todo.due_date);
    if (Number.isNaN(due.getTime())) continue;
    const key = `${due.getFullYear()}-${due.getMonth()}-${due.getDate()}`;
    if (!map.has(key)) {
      map.set(key, new Date(due.getFullYear(), due.getMonth(), due.getDate()));
    }
  }
  return [...map.values()];
};

/**
 * Supabase 할 일 CRUD·검색·필터·정렬을 메인 화면에 연결한다.
 */
export const TodoWorkspace = () => {
  const isMobile = useIsMobile();
  const {
    user,
    isAuthenticated,
    isLoading: isAuthLoading,
    isLoggingOut,
    logoutError,
    signOut,
  } = useAuth();

  const userId = user?.id;
  const userEmail = user?.email ?? "";
  const userDisplayName = user?.displayName ?? "";
  const hasLoadedListRef = useRef(false);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [scheduledDates, setScheduledDates] = useState<Date[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [completion, setCompletion] = useState<CompletionFilter>("all");
  const [priority, setPriority] = useState<TodoPriority | "all">("all");
  const [sort, setSort] = useState<TodoSortKey>("created_at");
  const [order, setOrder] = useState<TodoSortOrder>("desc");
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Todo | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [aiDraft, setAiDraft] = useState<Partial<TodoFormValues> | null>(null);
  const [mobileFormOpen, setMobileFormOpen] = useState(false);

  /**
   * 검색어 입력을 짧게 디바운스한다.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  /**
   * Supabase에서 현재 사용자의 할 일 목록을 불러온다.
   */
  const loadTodos = useCallback(async () => {
    if (!userId || !userEmail || !userDisplayName) {
      setTodos([]);
      setScheduledDates([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    const showSkeleton = !hasLoadedListRef.current;
    if (showSkeleton) {
      setIsLoading(true);
    }
    setIsError(false);
    setListError(null);

    const profileResult = await ensureUserProfile({
      id: userId,
      email: userEmail,
      displayName: userDisplayName,
    });
    if (profileResult.error) {
      setIsError(true);
      setListError(profileResult.error);
      setIsLoading(false);
      return;
    }

    const result = await fetchTodos({
      userId,
      query: debouncedQuery,
      completion,
      priority,
      sort,
      order,
    });

    if (result.error || !result.data) {
      setIsError(true);
      setListError(
        result.error ??
          "할 일 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
      );
      setTodos([]);
      setIsLoading(false);
      return;
    }

    setTodos(result.data);

    const countResult = await countTodos(userId);
    setTotalCount(countResult.data ?? result.data.length);

    const scheduleResult = await fetchTodos({ userId });
    if (scheduleResult.data) {
      setScheduledDates(toScheduledDates(scheduleResult.data));
    }

    hasLoadedListRef.current = true;
    setIsLoading(false);
  }, [
    userId,
    userEmail,
    userDisplayName,
    debouncedQuery,
    completion,
    priority,
    sort,
    order,
  ]);

  useEffect(() => {
    hasLoadedListRef.current = false;
  }, [userId]);

  useEffect(() => {
    if (isAuthLoading) return;
    void loadTodos();
  }, [isAuthLoading, loadTodos]);

  const hasActiveFilters =
    debouncedQuery.length > 0 || completion !== "all" || priority !== "all";

  /**
   * 모바일 폼 시트를 닫고 편집·초안 상태를 정리한다.
   */
  const closeMobileForm = () => {
    setMobileFormOpen(false);
    setEditingTodo(null);
    setAiDraft(null);
    setFormKey((key) => key + 1);
  };

  /**
   * 폼 제출로 할 일을 추가하거나 수정한 뒤 목록을 갱신한다.
   */
  const handleSubmit = async (values: TodoFormValues) => {
    if (!userId) {
      setActionError("로그인이 필요해요. 다시 로그인해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const profileResult = await ensureUserProfile({
        id: userId,
        email: userEmail,
        displayName: userDisplayName,
      });
      if (profileResult.error) {
        setActionError(profileResult.error);
        return;
      }

      const result = editingTodo
        ? await updateTodo(editingTodo.id, values)
        : await createTodo(userId, values);

      if (result.error) {
        setActionError(result.error);
        return;
      }

      setEditingTodo(null);
      setAiDraft(null);
      setFormKey((key) => key + 1);
      setMobileFormOpen(false);
      await loadTodos();
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 완료 여부를 토글한 뒤 목록을 다시 불러온다.
   */
  const handleToggleComplete = async (todo: Todo, completed: boolean) => {
    setTogglingId(todo.id);
    setActionError(null);
    try {
      const result = await updateTodo(todo.id, { completed });
      if (result.error) {
        setActionError(result.error);
        return;
      }
      await loadTodos();
    } finally {
      setTogglingId(null);
    }
  };

  /**
   * 확인된 할 일을 삭제한 뒤 목록을 갱신한다.
   */
  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;

    setIsDeleting(true);
    setActionError(null);
    try {
      const result = await deleteTodo(pendingDelete.id);
      if (result.error) {
        setActionError(result.error);
        return;
      }

      if (editingTodo?.id === pendingDelete.id) {
        setEditingTodo(null);
        setFormKey((key) => key + 1);
        setMobileFormOpen(false);
      }
      setPendingDelete(null);
      await loadTodos();
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * 수정 모드를 시작하고 모바일에서는 시트를 연다.
   */
  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setAiDraft(null);
    setFormKey((key) => key + 1);
    setActionError(null);
    if (isMobile) {
      setMobileFormOpen(true);
    }
  };

  /**
   * 모바일에서 새 할 일 시트를 연다.
   */
  const openMobileCreate = () => {
    setEditingTodo(null);
    setAiDraft(null);
    setFormKey((key) => key + 1);
    setActionError(null);
    setMobileFormOpen(true);
  };

  const formCard = (
    <Card size="sm" className="h-fit shadow-sm lg:sticky lg:top-4">
      <CardHeader>
        <CardTitle>{editingTodo ? "할 일 수정" : "할 일 추가"}</CardTitle>
        {editingTodo ? (
          <CardDescription>
            선택한 할 일의 내용을 수정한 뒤 저장하세요.
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        {!editingTodo ? (
          <AiTodoInput
            disabled={isSubmitting}
            onDraft={(draft) => {
              setAiDraft(draft);
              setEditingTodo(null);
              setFormKey((key) => key + 1);
              setActionError(null);
            }}
          />
        ) : null}
        <TodoForm
          key={`${formKey}-${editingTodo?.id ?? "create"}`}
          mode={editingTodo ? "edit" : "create"}
          initialTodo={editingTodo}
          initialValues={editingTodo ? null : aiDraft}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onCancel={
            editingTodo
              ? () => {
                  setEditingTodo(null);
                  setFormKey((key) => key + 1);
                }
              : undefined
          }
        />
      </CardContent>
    </Card>
  );

  const listSection = (
    <section aria-label="할 일 목록" className="min-w-0 space-y-3">
      <TodoToolbar
        query={query}
        completion={completion}
        priority={priority}
        sort={sort}
        order={order}
        onQueryChange={setQuery}
        onCompletionChange={setCompletion}
        onPriorityChange={setPriority}
        onSortChange={setSort}
        onOrderChange={setOrder}
      />
      <div className="min-w-0 rounded-4xl border border-border/80 bg-card/40 p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2 pr-1">
          <h2 className="text-lg font-bold tracking-tight">할 일</h2>
          <p className="max-w-full truncate text-right text-xs text-muted-foreground tabular-nums">
            {todos.length}개 표시 · 전체 {totalCount}개
          </p>
        </div>
        <TodoList
          todos={todos}
          isLoading={isAuthLoading || isLoading}
          isError={isError}
          errorMessage={
            listError ??
            "할 일 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
          }
          emptyFiltered={hasActiveFilters}
          togglingId={togglingId}
          onRetry={() => {
            void loadTodos();
          }}
          onToggleComplete={handleToggleComplete}
          onEdit={handleEdit}
          onDelete={setPendingDelete}
        />
      </div>
    </section>
  );

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <TodoHeader
        displayName={user?.displayName ?? "게스트"}
        email={user?.email ?? ""}
        avatarUrl={user?.avatarUrl ?? null}
        isAuthenticated={isAuthenticated}
        isLoggingOut={isLoggingOut}
        logoutError={logoutError}
        scheduledDates={scheduledDates}
        onLogout={() => {
          void signOut();
        }}
      />

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
        {actionError ? (
          <Alert variant="destructive">
            <AlertTitle>요청을 처리하지 못했어요</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        {/* PC: 할 일 추가 | 목록 | AI 요약 */}
        <div className="hidden flex-1 gap-4 lg:grid lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)_minmax(280px,340px)]">
          {formCard}
          {listSection}
          <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
            <AiSummaryPanel compact />
          </aside>
        </div>

        {/* 모바일: 목록 위 → AI 요약 아래 */}
        <div className="flex flex-1 flex-col gap-4 pb-20 lg:hidden">
          {listSection}
          <AiSummaryPanel compact />
        </div>
      </div>

      {/* 모바일 할 일 추가 FAB */}
      <Button
        type="button"
        size="icon-lg"
        className="fixed right-4 bottom-5 z-40 size-14 rounded-full shadow-lg lg:hidden"
        aria-label="할 일 추가"
        onClick={openMobileCreate}
      >
        <PlusIcon className="size-6" />
      </Button>

      <Sheet
        open={mobileFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeMobileForm();
            return;
          }
          setMobileFormOpen(true);
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[92vh] overflow-y-auto rounded-t-3xl p-0 sm:max-w-none"
        >
          <SheetHeader className="border-b border-border/60 px-4 py-4 text-left">
            <SheetTitle>
              {editingTodo ? "할 일 수정" : "할 일 추가"}
            </SheetTitle>
            <SheetDescription>
              {editingTodo
                ? "내용을 수정한 뒤 저장하세요."
                : "직접 입력하거나 AI로 할 일 만들기를 사용해 보세요."}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 py-4 pb-8">
            {!editingTodo ? (
              <AiTodoInput
                disabled={isSubmitting}
                onDraft={(draft) => {
                  setAiDraft(draft);
                  setEditingTodo(null);
                  setFormKey((key) => key + 1);
                  setActionError(null);
                }}
              />
            ) : null}
            <TodoForm
              key={`mobile-${formKey}-${editingTodo?.id ?? "create"}`}
              mode={editingTodo ? "edit" : "create"}
              initialTodo={editingTodo}
              initialValues={editingTodo ? null : aiDraft}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
              onCancel={closeMobileForm}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>할 일을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `"${pendingDelete.title}" 항목을 삭제합니다. 이 작업은 되돌릴 수 없어요.`
                : "선택한 할 일을 삭제합니다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmDelete();
              }}
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
