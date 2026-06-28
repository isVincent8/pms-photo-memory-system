/**
 * PMS Google Drive 同步客户端工具
 *
 * 参考 My Insurance 的 lib/drive/client-sync.ts，适配 PMS 的数据模型：
 * - pms.importedIndex → Drive index.json
 * - pms:settings      → Drive settings.json
 *
 * 设计要点：
 * - 仅在用户已登录 pms-cloud 时发起请求
 * - 写入后防抖 1.5s 自动推送
 * - 拉取后覆写 localStorage 并触发 storage 事件，让 store 感知
 */

import type { PmsIndex } from "@/types";

const DEBOUNCE_MS = 1500;
const SYNCED_AT_KEY = "pms_drive_last_synced_at";
const FOLDER_ID_KEY = "pms_drive_folder_id";
const FOLDER_PATH_DEFAULT = "PMS/Data";

const INDEX_LOCAL_KEY = "pms.importedIndex";
const SETTINGS_LOCAL_KEY = "pms:settings";

const FILE_KEYS = ["pms_index", "pms_settings"] as const;
type FileKey = (typeof FILE_KEYS)[number];

const LOCAL_KEY_MAP: Record<FileKey, string> = {
  pms_index: INDEX_LOCAL_KEY,
  pms_settings: SETTINGS_LOCAL_KEY,
};

const pushTimers: Record<string, ReturnType<typeof setTimeout>> = {};
let authenticated = false;

function getApiBase(): string {
  // 生产环境可在构建时注入，开发环境走 Vite proxy（同域）
  return import.meta.env.VITE_API_BASE_URL || "";
}

function api(path: string): string {
  return `${getApiBase()}${path}`;
}

export function setAuthenticated(value: boolean): void {
  authenticated = value;
}

export function isAuthenticated(): boolean {
  return authenticated;
}

export interface FolderInfo {
  id: string;
  name: string;
  path: string;
}

function getFolderPath(): string {
  if (typeof window === "undefined") return FOLDER_PATH_DEFAULT;
  return FOLDER_PATH_DEFAULT;
}

function getCachedFolderId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(FOLDER_ID_KEY);
}

function setCachedFolderId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) {
    localStorage.setItem(FOLDER_ID_KEY, id);
  } else {
    localStorage.removeItem(FOLDER_ID_KEY);
  }
}

/**
 * 检查登录状态。
 */
export async function checkAuthStatus(): Promise<{ authenticated: boolean; email?: string }> {
  try {
    const res = await fetch(api("/api/auth/status"), { credentials: "include" });
    const json = (await res.json()) as { authenticated: boolean; email?: string };
    authenticated = json.authenticated;
    return json;
  } catch {
    authenticated = false;
    return { authenticated: false };
  }
}

/**
 * 解析/创建 Drive 文件夹并缓存 folderId。
 */
export async function resolveDriveFolder(path?: string): Promise<FolderInfo | null> {
  if (typeof window === "undefined") return null;

  const targetPath = path?.trim() || getFolderPath();
  try {
    const res = await fetch(api("/api/drive/folder"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: targetPath }),
      credentials: "include",
    });
    const json = (await res.json()) as { success: boolean; id?: string; name?: string; path?: string; error?: string };
    if (!res.ok || !json.success || !json.id) {
      return null;
    }
    setCachedFolderId(json.id);
    return { id: json.id, name: json.name || "", path: json.path || targetPath };
  } catch {
    return null;
  }
}

async function ensureFolderId(): Promise<string | null> {
  const cached = getCachedFolderId();
  if (cached) return cached;
  const info = await resolveDriveFolder();
  return info?.id ?? null;
}

export interface PushResult {
  success: boolean;
  syncedAt?: string;
  error?: string;
}

/**
 * 立即推送单个 key 对应的数据到 Drive。
 */
export async function pushNow(key: FileKey, data: unknown): Promise<PushResult> {
  if (typeof window === "undefined") return { success: false, error: "非客户端环境" };

  const folderId = await ensureFolderId();
  if (!folderId) return { success: false, error: "无法解析 Drive 文件夹" };

  try {
    const res = await fetch(api("/api/drive/push"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, data, folderId }),
      credentials: "include",
    });
    const json = (await res.json()) as { success: boolean; syncedAt?: string; folderId?: string; error?: string };
    if (res.ok && json.success) {
      if (json.folderId) setCachedFolderId(json.folderId);
      const syncedAt = json.syncedAt || new Date().toISOString();
      localStorage.setItem(SYNCED_AT_KEY, syncedAt);
      return { success: true, syncedAt };
    }
    return { success: false, error: json.error || `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * 防抖推送。同一 key 在 DEBOUNCE_MS 内多次写入只触发一次推送。
 */
export function scheduleDrivePush(key: FileKey, data: unknown): void {
  if (typeof window === "undefined") return;

  clearTimeout(pushTimers[key]);
  pushTimers[key] = setTimeout(() => {
    pushNow(key, data).catch(() => {
      // 静默失败，下次写操作会重试
    });
  }, DEBOUNCE_MS);
}

export interface PullResult {
  success: boolean;
  driveEmpty?: boolean;
  syncedAt?: string;
  error?: string;
}

/**
 * 从 Drive 拉取全部文件并覆写 localStorage。
 * 覆写后手动 dispatch storage 事件，让各 store 的缓存失效。
 */
export async function pullFromDriveAndApply(path?: string): Promise<PullResult> {
  if (typeof window === "undefined") return { success: false, error: "非客户端环境" };

  const folderPath = path?.trim() || getFolderPath();
  const cachedFolderId = getCachedFolderId();

  try {
    const res = await fetch(api("/api/drive/pull"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: cachedFolderId, folderPath }),
      credentials: "include",
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      return { success: false, error: err.error || `HTTP ${res.status}` };
    }
    const json = (await res.json()) as {
      success: boolean;
      folderId?: string;
      driveEmpty?: boolean;
      pms_index?: unknown;
      pms_settings?: unknown;
      error?: string;
    };
    if (!json.success) {
      return { success: false, error: json.error || "拉取失败" };
    }

    if (json.folderId) setCachedFolderId(json.folderId);

    const writes: { key: string; raw: string }[] = [];
    if (json.pms_index !== undefined) {
      const raw = JSON.stringify(json.pms_index);
      localStorage.setItem(INDEX_LOCAL_KEY, raw);
      writes.push({ key: INDEX_LOCAL_KEY, raw });
    }
    if (json.pms_settings !== undefined) {
      const raw = JSON.stringify(json.pms_settings);
      localStorage.setItem(SETTINGS_LOCAL_KEY, raw);
      writes.push({ key: SETTINGS_LOCAL_KEY, raw });
    }

    for (const { key, raw } of writes) {
      // 同 tab dispatch（浏览器默认只对其他 tab 触发 storage 事件）
      window.dispatchEvent(new StorageEvent("storage", { key, newValue: raw }));
    }

    const syncedAt = new Date().toISOString();
    localStorage.setItem(SYNCED_AT_KEY, syncedAt);

    return {
      success: true,
      driveEmpty: json.driveEmpty === true,
      syncedAt,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * 推送当前 localStorage 全部内容到 Drive（用于“立即推送全部”按钮）。
 */
export async function pushAllLocal(): Promise<PullResult> {
  if (typeof window === "undefined") return { success: false, error: "非客户端环境" };

  const folderId = await ensureFolderId();
  if (!folderId) return { success: false, error: "无法解析 Drive 文件夹" };

  const results = await Promise.all(
    FILE_KEYS.map(async (key) => {
      const localKey = LOCAL_KEY_MAP[key];
      const raw = localStorage.getItem(localKey);
      if (raw === null) return { key, ok: true }; // 空数据不推送，视为成功
      try {
        const data = JSON.parse(raw);
        const res = await pushNow(key, data);
        return { key, ok: res.success };
      } catch {
        return { key, ok: false };
      }
    })
  );

  const allOk = results.every((r) => r.ok);
  const syncedAt = allOk ? new Date().toISOString() : undefined;
  if (allOk) {
    localStorage.setItem(SYNCED_AT_KEY, syncedAt!);
  }
  return {
    success: allOk,
    syncedAt,
    error: allOk ? undefined : "部分文件推送失败",
  };
}

export function getLastSyncedAt(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SYNCED_AT_KEY);
}

export function getDriveFolderId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(FOLDER_ID_KEY);
}

export function clearDriveFolderCache(): void {
  setCachedFolderId(null);
}

/**
 * 校验从 Drive 拉取的 index 数据是否合法。
 */
export function isValidIndex(data: unknown): data is PmsIndex {
  return (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as PmsIndex).photos) &&
    Array.isArray((data as PmsIndex).stages)
  );
}
