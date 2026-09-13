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

type LoginFormState = {
  email: string;
  password: string;
};

/**
 * 이메일·비밀번호로 Supabase 로그인을 처리한다.
 */
export const LoginForm = () => {
  const router = useRouter();
  const [values, setValues] = useState<LoginFormState>({
    email: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<LoginFormState>>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * 이메일·비밀번호 필수값과 형식을 검사한다.
   */
  const validate = (next: LoginFormState): Partial<LoginFormState> => {
    const errors: Partial<LoginFormState> = {};
    const email = next.email.trim();
    const password = next.password;

    if (!email) {
      errors.email = "이메일을 입력해 주세요.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "올바른 이메일 형식으로 입력해 주세요.";
    }

    if (!password || !password.trim()) {
      errors.password = "비밀번호를 입력해 주세요.";
    }

    return errors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);

    const errors = validate(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email.trim(),
        password: values.password,
      });

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("[LoginForm]", error);
        }
        setAuthError(
          toAuthErrorMessage(
            error,
            "이메일 또는 비밀번호가 올바르지 않아요."
          )
        );
        return;
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[LoginForm]", error);
      }
      setAuthError("이메일 또는 비밀번호가 올바르지 않아요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {authError ? (
        <Alert variant="destructive">
          <AlertTitle>로그인에 실패했어요</AlertTitle>
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="login-email">이메일</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={values.email}
          disabled={isSubmitting}
          aria-invalid={Boolean(fieldErrors.email)}
          onChange={(event) => {
            setValues((prev) => ({ ...prev, email: event.target.value }));
            if (fieldErrors.email) {
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }
          }}
        />
        {fieldErrors.email ? (
          <p className="text-sm text-destructive">{fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="login-password">비밀번호</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="비밀번호를 입력하세요"
          value={values.password}
          disabled={isSubmitting}
          aria-invalid={Boolean(fieldErrors.password)}
          onChange={(event) => {
            setValues((prev) => ({ ...prev, password: event.target.value }));
            if (fieldErrors.password) {
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }
          }}
        />
        {fieldErrors.password ? (
          <p className="text-sm text-destructive">{fieldErrors.password}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
        {isSubmitting ? "로그인 중..." : "로그인"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        아직 계정이 없으신가요?{" "}
        <Link
          href="/signup"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          회원가입
        </Link>
      </p>
    </form>
  );
};
