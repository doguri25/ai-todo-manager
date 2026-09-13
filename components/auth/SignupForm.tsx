"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toAuthErrorMessage } from "@/lib/auth/messages";
import { createClient } from "@/lib/supabase/client";

type SignupFormState = {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

/**
 * 이름·이메일·비밀번호로 Supabase 회원가입을 처리한다.
 */
export const SignupForm = () => {
  const router = useRouter();
  const [values, setValues] = useState<SignupFormState>({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<SignupFormState>>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * 이름·이메일·비밀번호·비밀번호 확인 값을 검사한다.
   */
  const validate = (next: SignupFormState): Partial<SignupFormState> => {
    const errors: Partial<SignupFormState> = {};
    const displayName = next.displayName.trim();
    const email = next.email.trim();
    const password = next.password;
    const confirmPassword = next.confirmPassword;

    if (!displayName) {
      errors.displayName = "이름을 입력해 주세요.";
    } else if (displayName.length > 50) {
      errors.displayName = "이름은 50자 이하로 입력해 주세요.";
    }

    if (!email) {
      errors.email = "이메일을 입력해 주세요.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "올바른 이메일 형식으로 입력해 주세요.";
    }

    if (!password) {
      errors.password = "비밀번호를 입력해 주세요.";
    } else if (password.length < 6) {
      errors.password = "비밀번호는 6자 이상이어야 해요.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "비밀번호를 한 번 더 입력해 주세요.";
    } else if (confirmPassword !== password) {
      errors.confirmPassword = "비밀번호가 일치하지 않아요.";
    }

    return errors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setSuccessMessage(null);

    const errors = validate(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const displayName = values.displayName.trim();
      const email = values.email.trim();

      const { data, error } = await supabase.auth.signUp({
        email,
        password: values.password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("[SignupForm]", error);
        }
        setAuthError(toAuthErrorMessage(error));
        return;
      }

      // 이메일 확인이 꺼져 있으면 세션이 바로 발급된다.
      if (data.session) {
        router.push("/");
        router.refresh();
        return;
      }

      setSuccessMessage(
        "가입이 완료되었어요. 이메일로 보낸 확인 링크를 누르면 로그인할 수 있어요."
      );
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[SignupForm]", error);
      }
      setAuthError("회원가입에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 필드 값을 갱신하고 해당 필드 오류를 지운다.
   */
  const updateField = <K extends keyof SignupFormState>(
    key: K,
    value: SignupFormState[K]
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {authError ? (
        <Alert variant="destructive">
          <AlertTitle>회원가입에 실패했어요</AlertTitle>
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      ) : null}

      {successMessage ? (
        <Alert>
          <AlertTitle>이메일을 확인해 주세요</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-display-name">이름</Label>
        <Input
          id="signup-display-name"
          name="displayName"
          type="text"
          autoComplete="name"
          placeholder="홍길동"
          value={values.displayName}
          disabled={isSubmitting}
          aria-invalid={Boolean(fieldErrors.displayName)}
          onChange={(event) => updateField("displayName", event.target.value)}
        />
        {fieldErrors.displayName ? (
          <p className="text-sm text-destructive">{fieldErrors.displayName}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-email">이메일</Label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={values.email}
          disabled={isSubmitting}
          aria-invalid={Boolean(fieldErrors.email)}
          onChange={(event) => updateField("email", event.target.value)}
        />
        {fieldErrors.email ? (
          <p className="text-sm text-destructive">{fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-password">비밀번호</Label>
        <Input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="6자 이상 입력하세요"
          value={values.password}
          disabled={isSubmitting}
          aria-invalid={Boolean(fieldErrors.password)}
          onChange={(event) => updateField("password", event.target.value)}
        />
        {fieldErrors.password ? (
          <p className="text-sm text-destructive">{fieldErrors.password}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-confirm-password">비밀번호 확인</Label>
        <Input
          id="signup-confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="비밀번호를 다시 입력하세요"
          value={values.confirmPassword}
          disabled={isSubmitting}
          aria-invalid={Boolean(fieldErrors.confirmPassword)}
          onChange={(event) =>
            updateField("confirmPassword", event.target.value)
          }
        />
        {fieldErrors.confirmPassword ? (
          <p className="text-sm text-destructive">
            {fieldErrors.confirmPassword}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
        {isSubmitting ? "가입 중..." : "회원가입"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        이미 계정이 있으신가요?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          로그인
        </Link>
      </p>
    </form>
  );
};
