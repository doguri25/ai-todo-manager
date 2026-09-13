import type {
  Todo,
  TodoCategory,
  TodoPriority,
  TodoStatus,
} from "@/lib/todos/types";

/**
 * 로컬 날짜 문자열(YYYY-MM-DD)을 만든다.
 */
const toLocalDateParts = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return { yyyy, mm, dd };
};

/**
 * 마감 시각이 '미정'(로컬 00:00)인지 판별한다.
 */
export const isDueTimeUnset = (iso: string | null | undefined): boolean => {
  if (!iso) return true;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return true;
  return date.getHours() === 0 && date.getMinutes() === 0;
};

/**
 * 완료·마감일 기준으로 파생 진행 상태를 계산한다.
 */
export const getTodoStatus = (
  todo: Pick<Todo, "completed" | "due_date">,
  now: Date = new Date()
): TodoStatus => {
  if (todo.completed) return "completed";
  if (!todo.due_date) return "in_progress";

  const due = new Date(todo.due_date);
  if (Number.isNaN(due.getTime())) return "in_progress";

  // 시간 미정이면 날짜만 비교해 당일은 지연으로 보지 않는다.
  if (isDueTimeUnset(todo.due_date)) {
    const dueParts = toLocalDateParts(due);
    const dueDay = `${dueParts.yyyy}-${dueParts.mm}-${dueParts.dd}`;
    const todayParts = toLocalDateParts(now);
    const today = `${todayParts.yyyy}-${todayParts.mm}-${todayParts.dd}`;
    return dueDay < today ? "overdue" : "in_progress";
  }

  return due < now ? "overdue" : "in_progress";
};

/**
 * ISO 시각을 로컬 표시 문자열로 포맷한다. 시간 미정이면 날짜만 보여준다.
 */
export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "미정";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "미정";

  const { yyyy, mm, dd } = toLocalDateParts(date);
  if (isDueTimeUnset(iso)) {
    return `${yyyy}-${mm}-${dd} · 시간 미정`;
  }

  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
};

/**
 * date input용 `YYYY-MM-DD` 로컬 문자열을 만든다.
 */
export const toDateLocalValue = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const { yyyy, mm, dd } = toLocalDateParts(date);
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * time input용 `HH:mm` 로컬 문자열을 만든다. 시간 미정이면 빈 문자열.
 */
export const toTimeLocalValue = (iso: string | null | undefined): string => {
  if (!iso || isDueTimeUnset(iso)) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mi}`;
};

/**
 * 날짜(+선택 시각)를 ISO로 합친다. 시각이 없으면 로컬 00:00(시간 미정)으로 저장한다.
 */
export const combineLocalDateAndTime = (
  dateValue: string,
  timeValue: string | null | undefined
): string | null => {
  if (!dateValue.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue.trim())) {
    return null;
  }

  const time =
    timeValue && /^\d{2}:\d{2}$/.test(timeValue.trim())
      ? timeValue.trim()
      : "00:00";

  const date = new Date(`${dateValue.trim()}T${time}:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

/**
 * datetime-local 입력값용 `YYYY-MM-DDTHH:mm` 로컬 문자열을 만든다.
 */
export const toDateTimeLocalValue = (
  iso: string | null | undefined
): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const { yyyy, mm, dd } = toLocalDateParts(date);
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

/**
 * datetime-local 값을 ISO 문자열(또는 null)로 변환한다.
 */
export const fromDateTimeLocalValue = (value: string): string | null => {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

export const PRIORITY_LABELS: Record<TodoPriority, string> = {
  high: "높음",
  medium: "중간",
  low: "낮음",
};

export const STATUS_LABELS: Record<TodoStatus, string> = {
  in_progress: "진행 중",
  completed: "완료",
  overdue: "지연",
};

export const PRIORITY_CLASS: Record<TodoPriority, string> = {
  high: "border-priority-high/30 bg-priority-high/10 text-priority-high",
  medium:
    "border-priority-medium/30 bg-priority-medium/10 text-priority-medium",
  low: "border-priority-low/30 bg-priority-low/10 text-priority-low",
};

export const CATEGORY_CLASS: Record<TodoCategory, string> = {
  업무: "border-category-work/30 bg-category-work/10 text-category-work",
  개인:
    "border-category-personal/30 bg-category-personal/10 text-category-personal",
  건강: "border-success/30 bg-success/10 text-success",
  학습: "border-category-learn/30 bg-category-learn/10 text-category-learn",
  기타: "border-category-other/30 bg-category-other/10 text-category-other",
};
