/**
 * Manual document cross-check helpers.
 * NOTE: This is NOT OCR. Staff read the document and type the name / DOB /
 * address; we compare it against the CRM record and highlight mismatches.
 */

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let cur = i;
    let last = i - 1;
    for (let j = 1; j <= b.length; j++) {
      const temp = prev[j];
      prev[j] = Math.min(
        prev[j] + 1,
        cur + 1,
        last + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      last = temp;
      cur = prev[j];
    }
  }
  return prev[b.length];
}

export type MatchResult = {
  field: string;
  input: string;
  expected: string;
  score: number; // 0-100
  status: "MATCH" | "REVIEW" | "MISMATCH" | "NOT_CHECKED";
};

function compareText(field: string, input: string, expected: string): MatchResult {
  const a = normalize(input);
  const b = normalize(expected);
  if (!a) return { field, input, expected, score: 0, status: "NOT_CHECKED" };
  if (!b) return { field, input, expected, score: 0, status: "REVIEW" };
  if (a === b) return { field, input, expected, score: 100, status: "MATCH" };

  const distance = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  const ratio = Math.round((1 - distance / maxLen) * 100);

  const tokensA = new Set(a.split(" "));
  const tokensB = new Set(b.split(" "));
  const intersection = [...tokensA].filter((t) => tokensB.has(t)).length;
  const tokenScore = Math.round((intersection / Math.max(tokensA.size, tokensB.size)) * 100);
  const score = Math.max(ratio, tokenScore);

  return {
    field,
    input,
    expected,
    score,
    status: score >= 85 ? "MATCH" : score >= 60 ? "REVIEW" : "MISMATCH",
  };
}

function parseDateLoose(value: string): Date | null {
  if (!value) return null;
  const clean = value.trim();
  const dmy = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  const ymd = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  const parsed = new Date(clean);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function compareIdentity(
  customer: { fullName: string; fatherName: string | null; address: string | null; village: string | null },
  input: { fullName?: string; fatherName?: string; dob?: string; address?: string; dobOnRecord?: string | null },
): MatchResult[] {
  const results: MatchResult[] = [];
  results.push(compareText("Customer Name", input.fullName || "", customer.fullName));
  results.push(compareText("Father's Name", input.fatherName || "", customer.fatherName || ""));
  results.push(compareText("Address", input.address || "", customer.address || customer.village || ""));

  if (input.dob) {
    const inDate = parseDateLoose(input.dob);
    const record = input.dobOnRecord ? parseDateLoose(input.dobOnRecord) : null;
    if (!record) {
      results.push({
        field: "Date of Birth",
        input: input.dob,
        expected: "Not stored in CRM",
        score: 0,
        status: "REVIEW",
      });
    } else {
      const same =
        inDate &&
        inDate.getFullYear() === record.getFullYear() &&
        inDate.getMonth() === record.getMonth() &&
        inDate.getDate() === record.getDate();
      results.push({
        field: "Date of Birth",
        input: input.dob,
        expected: input.dobOnRecord || "",
        score: same ? 100 : 0,
        status: same ? "MATCH" : "MISMATCH",
      });
    }
  }
  return results;
}
