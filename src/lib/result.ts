export type ActionResult =
  | { ok: true; id?: string; slug?: string; message?: string }
  | { ok: false; error: string };

export function fail(error: string): ActionResult {
  return { ok: false, error };
}

export function done(payload: { id?: string; slug?: string; message?: string } = {}): ActionResult {
  return { ok: true, ...payload };
}

/** FormData → 普通对象（同名多值取最后一个） */
export function formToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === 'string') obj[key] = value;
  });
  return obj;
}

export function zodMessage(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message ?? '提交的数据不合法';
}
