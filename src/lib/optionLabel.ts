// Resolves how MCQ option labels render: numeric "1, 2, 3, 4" (NEET-style)
// vs alpha "A, B, C, D" (JEE-style). Tests can pin a style explicitly via
// `option_label_style`; otherwise the exam pattern decides (NEET -> numeric).

export type OptionLabelStyle = "numeric" | "alpha";

export const resolveOptionStyle = (
  test: { option_label_style?: string | null; exam_pattern?: string | null } | null | undefined,
): OptionLabelStyle => {
  const explicit = test?.option_label_style;
  if (explicit === "numeric" || explicit === "alpha") return explicit;
  const ep = (test?.exam_pattern ?? "").toLowerCase();
  return ep.includes("neet") ? "numeric" : "alpha";
};

export const optionLabel = (index: number, style: OptionLabelStyle): string =>
  style === "numeric" ? String(index + 1) : String.fromCharCode(65 + index);
