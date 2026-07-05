export const ASSEMBLY_TOOL_CARD_ID =
  process.env.ASSEMBLY_TOOL_CARD_ID ?? "seed-assembly-tool";

export const INTERNAL_INSTALL_PARTNERS = new Set(
  ["client", "direct", "meavo"].map((s) => s.toLowerCase()),
);

export const MEVAO_RESERVED_SEGMENTS = new Set([
  "login",
  "partners",
  "questionnaire",
  "resources",
  "assemblies",
  "calendar",
  "api",
  "_next",
]);
