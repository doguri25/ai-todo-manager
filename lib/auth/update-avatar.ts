import { toAuthErrorMessage } from "@/lib/auth/messages";
import { enrichAuthUserInfo } from "@/lib/auth/enrich-user";
import type { AuthUserInfo } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/client";
import { toTodoErrorMessage } from "@/lib/todos/api";

export type UpdateAvatarResult = {
  user: AuthUserInfo | null;
  error: string | null;
};

const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const OUTPUT_SIZE = 256;
const OUTPUT_QUALITY = 0.82;

/**
 * 이미지를 정사각 JPEG data URL로 압축한다.
 */
const compressImageToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("canvas"));
        return;
      }

      const minSide = Math.min(image.width, image.height);
      const sx = (image.width - minSide) / 2;
      const sy = (image.height - minSide) / 2;
      context.drawImage(
        image,
        sx,
        sy,
        minSide,
        minSide,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE
      );

      try {
        resolve(canvas.toDataURL("image/jpeg", OUTPUT_QUALITY));
      } catch {
        reject(new Error("encode"));
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("load"));
    };

    image.src = objectUrl;
  });

/**
 * 프로필 사진을 압축해 users 테이블에 저장한다.
 */
export const updateAvatarImage = async (
  file: File
): Promise<UpdateAvatarResult> => {
  if (!file.type.startsWith("image/")) {
    return { user: null, error: "이미지 파일만 올릴 수 있어요." };
  }
  if (file.size > MAX_INPUT_BYTES) {
    return { user: null, error: "이미지는 5MB 이하로 올려 주세요." };
  }

  let dataUrl: string;
  try {
    dataUrl = await compressImageToDataUrl(file);
  } catch {
    return {
      user: null,
      error: "이미지를 처리하지 못했어요. 다른 파일로 시도해 주세요.",
    };
  }

  const supabase = createClient();
  const {
    data: { user: currentUser },
    error: currentError,
  } = await supabase.auth.getUser();

  if (currentError || !currentUser) {
    return {
      user: null,
      error: toAuthErrorMessage(
        currentError,
        "로그인이 만료되었어요. 다시 로그인해 주세요."
      ),
    };
  }

  const { error: profileError } = await supabase
    .from("users")
    .update({ avatar_url: dataUrl })
    .eq("id", currentUser.id);

  if (profileError) {
    if (process.env.NODE_ENV === "development") {
      console.error("[updateAvatarImage] profile", profileError);
    }
    const message = profileError.message?.toLowerCase() ?? "";
    if (message.includes("avatar_url") || message.includes("column")) {
      return {
        user: null,
        error:
          "프로필 사진 저장을 위해 Supabase에서 schema.sql의 avatar_url 컬럼을 추가해 주세요.",
      };
    }
    return {
      user: null,
      error: toTodoErrorMessage(
        profileError,
        "프로필 사진을 저장하지 못했어요. 잠시 후 다시 시도해 주세요."
      ),
    };
  }

  return { user: await enrichAuthUserInfo(currentUser), error: null };
};

/**
 * 프로필 사진을 제거한다.
 */
export const removeAvatarImage = async (): Promise<UpdateAvatarResult> => {
  const supabase = createClient();
  const {
    data: { user: currentUser },
    error: currentError,
  } = await supabase.auth.getUser();

  if (currentError || !currentUser) {
    return {
      user: null,
      error: toAuthErrorMessage(
        currentError,
        "로그인이 만료되었어요. 다시 로그인해 주세요."
      ),
    };
  }

  const { error: profileError } = await supabase
    .from("users")
    .update({ avatar_url: null })
    .eq("id", currentUser.id);

  if (profileError) {
    return {
      user: null,
      error: toTodoErrorMessage(
        profileError,
        "프로필 사진을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요."
      ),
    };
  }

  return { user: await enrichAuthUserInfo(currentUser), error: null };
};
