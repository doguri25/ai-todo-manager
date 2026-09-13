"use client";

import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CompletionFilter,
  TodoSortKey,
  TodoSortOrder,
} from "@/lib/todos/filter";
import { PRIORITY_LABELS } from "@/lib/todos/status";
import { TODO_PRIORITIES, type TodoPriority } from "@/lib/todos/types";

const COMPLETION_ITEMS: { value: CompletionFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "incomplete", label: "미완료" },
  { value: "completed", label: "완료" },
];

const PRIORITY_FILTER_ITEMS: { value: TodoPriority | "all"; label: string }[] =
  [
    { value: "all", label: "전체" },
    ...TODO_PRIORITIES.map((item) => ({
      value: item,
      label: PRIORITY_LABELS[item],
    })),
  ];

const SORT_ITEMS: { value: TodoSortKey; label: string }[] = [
  { value: "created_at", label: "생성일" },
  { value: "due_date", label: "마감일" },
  { value: "priority", label: "우선순위" },
  { value: "title", label: "제목" },
];

const ORDER_ITEMS: { value: TodoSortOrder; label: string }[] = [
  { value: "asc", label: "오름차순" },
  { value: "desc", label: "내림차순" },
];

const COMPLETION_LABELS = Object.fromEntries(
  COMPLETION_ITEMS.map((item) => [item.value, item.label])
) as Record<CompletionFilter, string>;

const PRIORITY_FILTER_LABELS = Object.fromEntries(
  PRIORITY_FILTER_ITEMS.map((item) => [item.value, item.label])
) as Record<TodoPriority | "all", string>;

const SORT_LABELS = Object.fromEntries(
  SORT_ITEMS.map((item) => [item.value, item.label])
) as Record<TodoSortKey, string>;

const ORDER_LABELS = Object.fromEntries(
  ORDER_ITEMS.map((item) => [item.value, item.label])
) as Record<TodoSortOrder, string>;

/** 필터 버튼 — 글자는 왼쪽 정렬, 열렸을 때만 primary */
const FILTER_TRIGGER_CLASS =
  "relative h-9 w-full justify-start gap-0 border border-border/55 bg-input/55 " +
  "py-0 pl-2.5 pr-7 text-sm font-medium text-foreground shadow-none " +
  "hover:bg-input/70 focus-visible:border-border/55 focus-visible:ring-0 " +
  "data-popup-open:rounded-b-none data-popup-open:border-border/55 " +
  "data-popup-open:border-b-transparent data-popup-open:bg-input/55 " +
  "data-popup-open:shadow-none data-popup-open:ring-0 " +
  "*:data-[slot=select-value]:flex-1 *:data-[slot=select-value]:justify-start " +
  "*:data-[slot=select-value]:text-left *:data-[slot=select-value]:font-medium " +
  "*:data-[slot=select-value]:text-foreground " +
  "data-popup-open:*:data-[slot=select-value]:font-semibold " +
  "data-popup-open:*:data-[slot=select-value]:text-primary " +
  "[&_svg]:absolute [&_svg]:top-1/2 [&_svg]:right-2 [&_svg]:size-3.5 " +
  "[&_svg]:-translate-y-1/2 [&_svg]:text-muted-foreground";

/** 필터 메뉴 — 버튼과 같은 왼쪽 패딩으로 글자 세로(가로 위치) 정렬 */
const FILTER_MENU_CLASS =
  "min-w-0 w-(--anchor-width) max-w-(--anchor-width) rounded-t-none rounded-b-3xl " +
  "border border-t-0 border-border/55 bg-input/55 p-0 text-popover-foreground " +
  "shadow-none ring-0 outline-none " +
  "data-open:animate-none data-closed:animate-none " +
  "**:data-[slot=select-item]:scroll-my-0";

const FILTER_ITEM_CLASS =
  "min-h-9 w-full justify-start gap-0 rounded-none px-0 py-0 pl-2.5 pr-2.5 " +
  "text-sm font-medium text-foreground " +
  "focus:bg-background/75 focus:text-foreground " +
  "data-highlighted:bg-background/75 data-highlighted:text-foreground " +
  "first:rounded-none last:rounded-b-3xl " +
  "[&>span]:flex-1 [&>span]:justify-start [&>span]:text-left " +
  "[&>span]:font-medium [&>span]:whitespace-nowrap";

type TodoToolbarProps = {
  query: string;
  completion: CompletionFilter;
  priority: TodoPriority | "all";
  sort: TodoSortKey;
  order: TodoSortOrder;
  onQueryChange: (value: string) => void;
  onCompletionChange: (value: CompletionFilter) => void;
  onPriorityChange: (value: TodoPriority | "all") => void;
  onSortChange: (value: TodoSortKey) => void;
  onOrderChange: (value: TodoSortOrder) => void;
};

/**
 * 검색·완료 상태·우선순위 필터와 정렬 컨트롤을 제공한다.
 */
export const TodoToolbar = ({
  query,
  completion,
  priority,
  sort,
  order,
  onQueryChange,
  onCompletionChange,
  onPriorityChange,
  onSortChange,
  onOrderChange,
}: TodoToolbarProps) => {
  const completionOptions = COMPLETION_ITEMS.filter(
    (item) => item.value !== completion
  );
  const priorityOptions = PRIORITY_FILTER_ITEMS.filter(
    (item) => item.value !== priority
  );
  const sortOptions = SORT_ITEMS.filter((item) => item.value !== sort);
  const orderOptions = ORDER_ITEMS.filter((item) => item.value !== order);

  return (
    <section
      aria-label="할 일 검색 및 필터"
      className="rounded-4xl border border-border/80 bg-card p-3 shadow-sm"
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-[8rem] flex-[1_1_8rem] max-w-[12rem] flex-col gap-1.5">
          <Label htmlFor="todo-search" className="text-xs">
            검색
          </Label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="todo-search"
              value={query}
              placeholder="제목"
              className="h-9 pl-8 text-sm"
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </div>
        </div>

        <div className="flex w-[5.75rem] shrink-0 flex-col gap-1.5">
          <Label htmlFor="todo-completion-filter" className="text-xs">
            상태
          </Label>
          <Select
            value={completion}
            items={COMPLETION_LABELS}
            onValueChange={(value) => {
              if (value == null) return;
              onCompletionChange(value as CompletionFilter);
            }}
          >
            <SelectTrigger
              id="todo-completion-filter"
              className={FILTER_TRIGGER_CLASS}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              side="bottom"
              sideOffset={0}
              align="start"
              alignItemWithTrigger={false}
              className={FILTER_MENU_CLASS}
            >
              {completionOptions.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className={FILTER_ITEM_CLASS}
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-[5.75rem] shrink-0 flex-col gap-1.5">
          <Label htmlFor="todo-priority-filter" className="text-xs">
            우선순위
          </Label>
          <Select
            value={priority}
            items={PRIORITY_FILTER_LABELS}
            onValueChange={(value) => {
              if (value == null) return;
              onPriorityChange(value as TodoPriority | "all");
            }}
          >
            <SelectTrigger
              id="todo-priority-filter"
              className={FILTER_TRIGGER_CLASS}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              side="bottom"
              sideOffset={0}
              align="start"
              alignItemWithTrigger={false}
              className={FILTER_MENU_CLASS}
            >
              {priorityOptions.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className={FILTER_ITEM_CLASS}
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-[6.5rem] shrink-0 flex-col gap-1.5">
          <Label htmlFor="todo-sort" className="text-xs">
            정렬
          </Label>
          <Select
            value={sort}
            items={SORT_LABELS}
            onValueChange={(value) => {
              if (value == null) return;
              onSortChange(value as TodoSortKey);
            }}
          >
            <SelectTrigger id="todo-sort" className={FILTER_TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              side="bottom"
              sideOffset={0}
              align="start"
              alignItemWithTrigger={false}
              className={FILTER_MENU_CLASS}
            >
              {sortOptions.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className={FILTER_ITEM_CLASS}
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-[6.5rem] shrink-0 flex-col gap-1.5">
          <Label htmlFor="todo-order" className="text-xs">
            순서
          </Label>
          <Select
            value={order}
            items={ORDER_LABELS}
            onValueChange={(value) => {
              if (value == null) return;
              onOrderChange(value as TodoSortOrder);
            }}
          >
            <SelectTrigger id="todo-order" className={FILTER_TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              side="bottom"
              sideOffset={0}
              align="start"
              alignItemWithTrigger={false}
              className={FILTER_MENU_CLASS}
            >
              {orderOptions.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className={FILTER_ITEM_CLASS}
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
};
