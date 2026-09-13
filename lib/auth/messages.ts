/**
 * Supabase Auth 오류를 사용자용 한글 메시지로 변환한다.
 */
export const toAuthErrorMessage = (
  error: { message?: string; code?: string; status?: number } | null,
  fallback = "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요."
): string => {
  if (!error?.message) return fallback;

  const message = error.message.toLowerCase();

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials") ||
    error.code === "invalid_credentials"
  ) {
    return "이메일 또는 비밀번호가 올바르지 않아요.";
  }

  if (
    message.includes("email not confirmed") ||
    error.code === "email_not_confirmed"
  ) {
    return "이메일 확인이 아직 완료되지 않았어요. 받은편지함을 확인해 주세요.";
  }

  if (
    message.includes("user already registered") ||
    message.includes("already been registered") ||
    error.code === "user_already_exists"
  ) {
    return "이미 가입된 이메일이에요. 로그인해 주세요.";
  }

  if (message.includes("password") && message.includes("at least")) {
    return "비밀번호는 6자 이상이어야 해요.";
  }

  if (
    message.includes("invalid email") ||
    message.includes("unable to validate email")
  ) {
    return "올바른 이메일 형식으로 입력해 주세요.";
  }

  if (message.includes("signup is disabled")) {
    return "현재 회원가입을 받을 수 없어요. 잠시 후 다시 시도해 주세요.";
  }

  if (
    message.includes("rate limit") ||
    message.includes("email rate limit") ||
    message.includes("over_email_send_rate_limit")
  ) {
    return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("fetch failed")
  ) {
    return "네트워크 연결을 확인하고 다시 시도해 주세요.";
  }

  return fallback;
};
