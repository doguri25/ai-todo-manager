/**
 * 환경 변수 URL에서 /rest/v1 접미사를 제거해 Auth용 프로젝트 URL로 맞춘다.
 */
export const getSupabaseUrl = (): string => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return raw.replace(/\/rest\/v1\/?$/i, "").replace(/\/$/, "");
};
