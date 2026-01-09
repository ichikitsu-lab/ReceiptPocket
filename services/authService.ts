
/**
 * 認証設定（疑似バックエンド）
 * パスワードの変更はここで行います。
 */
const AUTH_CONFIG = {
  VIEWER_PASSWORD: "1234", // 閲覧者モード
  ADMIN_PASSWORD: "5678"   // 管理者モード
};

export type UserRole = 'admin' | 'viewer' | null;

/**
 * 選択された権限に対してパスワードが正しいか検証します。
 */
export const verifyPasswordForRole = (password: string, targetRole: 'admin' | 'viewer'): boolean => {
  if (targetRole === 'admin') {
    return password === AUTH_CONFIG.ADMIN_PASSWORD;
  }
  if (targetRole === 'viewer') {
    return password === AUTH_CONFIG.VIEWER_PASSWORD;
  }
  return false;
};
