const KEY = "pendingEnrollment";
const TTL_MS = 60 * 60 * 1000; // 1 hour

export type PendingEnrollment = {
  courseId: string;
  enquiryId: string;
  courseName: string;
  coursePrice: number;
  createdAt: number;
  centreId?: string;
};

export function setPendingEnrollment(data: PendingEnrollment) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

/** Reads, clears, and returns the pending enrollment — or null if missing/expired. */
export function consumePendingEnrollment(): PendingEnrollment | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  localStorage.removeItem(KEY);
  try {
    const data = JSON.parse(raw) as PendingEnrollment;
    if (!data?.courseId || !data?.enquiryId || !data?.createdAt) return null;
    if (Date.now() - data.createdAt > TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}
