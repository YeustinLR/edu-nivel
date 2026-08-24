export const RESOURCE_DOCUMENT_FORMAT = "edunivel-blocks" as const;
export const RESOURCE_DOCUMENT_VERSION = 1 as const;

export const MAX_RESOURCE_CONTENT_CHARACTERS = 50_000;
export const MAX_SERIALIZED_RESOURCE_DOCUMENT_BYTES = 524_288;
export const MAX_RESOURCE_DOCUMENT_BLOCKS = 1_000;
export const MAX_RESOURCE_DOCUMENT_DEPTH = 8;

export const eduCalloutVariants = [
  "keyIdea",
  "example",
  "note",
  "warning",
] as const;

export type EduCalloutVariant = (typeof eduCalloutVariants)[number];

export const eduCalloutPresentation = {
  keyIdea: { label: "Idea clave", tone: "purple", icon: "lightbulb" },
  example: { label: "Ejemplo", tone: "green", icon: "book" },
  note: { label: "Nota", tone: "blue", icon: "note" },
  warning: { label: "Advertencia", tone: "amber", icon: "warning" },
} as const satisfies Record<
  EduCalloutVariant,
  { label: string; tone: string; icon: string }
>;

export const resourceTextColors = [
  "default",
  "gray",
  "purple",
  "blue",
  "green",
  "yellow",
  "red",
] as const;

export type ResourceTextColor = (typeof resourceTextColors)[number];
export type ResourceTextAlignment = "left" | "center" | "right" | "justify";

export type EduTextStyles = Partial<{
  bold: true;
  italic: true;
  underline: true;
  strike: true;
  textColor: ResourceTextColor;
  backgroundColor: ResourceTextColor;
}>;

export type EduStyledText = {
  type: "text";
  text: string;
  styles: EduTextStyles;
};

export type EduLink = {
  type: "link";
  href: string;
  content: EduStyledText[];
};

export type EduInlineContent = EduStyledText | EduLink;

export type EduTableCell = {
  type: "tableCell";
  props: {
    backgroundColor: ResourceTextColor;
    textColor: ResourceTextColor;
    textAlignment: ResourceTextAlignment;
    colspan?: number;
    rowspan?: number;
  };
  content: EduInlineContent[];
};

export type EduTableContent = {
  type: "tableContent";
  columnWidths: (number | undefined)[];
  headerRows?: number;
  headerCols?: number;
  rows: { cells: EduTableCell[] }[];
};

export type EduNivelBlock = {
  id: string;
  type:
    | "paragraph"
    | "heading"
    | "bulletListItem"
    | "numberedListItem"
    | "quote"
    | "divider"
    | "table"
    | "eduCallout";
  props: Record<string, unknown>;
  content?: EduInlineContent[] | EduTableContent;
  children: EduNivelBlock[];
};

export type ResourceDocumentV1 = {
  format: typeof RESOURCE_DOCUMENT_FORMAT;
  version: typeof RESOURCE_DOCUMENT_VERSION;
  blocks: EduNivelBlock[];
};

export type ParsedResourceContent =
  | { kind: "empty"; document: null; blocks: EduNivelBlock[] }
  | {
      kind: "document";
      document: ResourceDocumentV1;
      blocks: EduNivelBlock[];
    }
  | {
      kind: "legacy";
      document: ResourceDocumentV1;
      blocks: EduNivelBlock[];
      legacyText: string;
    }
  | { kind: "invalid"; document: null; blocks: EduNivelBlock[] };

export type ResourceDocumentErrorCode =
  | "INVALID_DOCUMENT"
  | "UNKNOWN_VERSION"
  | "TEXT_LIMIT"
  | "BYTE_LIMIT"
  | "BLOCK_LIMIT"
  | "DEPTH_LIMIT";

const errorMessages: Record<ResourceDocumentErrorCode, string> = {
  INVALID_DOCUMENT: "El documento educativo no tiene un formato válido.",
  UNKNOWN_VERSION: "La versión del documento educativo no es compatible.",
  TEXT_LIMIT: "El contenido no puede superar 50 000 caracteres de texto.",
  BYTE_LIMIT: "El documento no puede superar 512 KiB.",
  BLOCK_LIMIT: "El documento no puede superar 1 000 bloques.",
  DEPTH_LIMIT: "El documento no puede superar 8 niveles de anidación.",
};

export class ResourceDocumentValidationError extends Error {
  constructor(public readonly code: ResourceDocumentErrorCode) {
    super(errorMessages[code]);
    this.name = "ResourceDocumentValidationError";
  }
}

const supportedBlockTypes = new Set<EduNivelBlock["type"]>([
  "paragraph",
  "heading",
  "bulletListItem",
  "numberedListItem",
  "quote",
  "divider",
  "table",
  "eduCallout",
]);
const alignments = new Set<ResourceTextAlignment>([
  "left",
  "center",
  "right",
  "justify",
]);
const colors = new Set<ResourceTextColor>(resourceTextColors);
const calloutVariants = new Set<EduCalloutVariant>(eduCalloutVariants);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeAlignment(value: unknown): ResourceTextAlignment {
  return typeof value === "string" && alignments.has(value as ResourceTextAlignment)
    ? (value as ResourceTextAlignment)
    : "left";
}

function normalizeColor(value: unknown): ResourceTextColor {
  return typeof value === "string" && colors.has(value as ResourceTextColor)
    ? (value as ResourceTextColor)
    : "default";
}

function isSafeWebUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeStyles(value: unknown): EduTextStyles {
  const styles = isRecord(value) ? value : {};
  const normalized: EduTextStyles = {};
  if (styles.bold === true) normalized.bold = true;
  if (styles.italic === true) normalized.italic = true;
  if (styles.underline === true) normalized.underline = true;
  if (styles.strike === true) normalized.strike = true;
  const textColor = normalizeColor(styles.textColor);
  const backgroundColor = normalizeColor(styles.backgroundColor);
  if (textColor !== "default") normalized.textColor = textColor;
  if (backgroundColor !== "default") normalized.backgroundColor = backgroundColor;
  return normalized;
}

function normalizeStyledText(value: unknown): EduStyledText | null {
  if (!isRecord(value) || value.type !== "text" || typeof value.text !== "string") {
    return null;
  }
  return { type: "text", text: value.text, styles: normalizeStyles(value.styles) };
}

function normalizeInlineContent(value: unknown): EduInlineContent[] {
  const items = typeof value === "string" ? [
    { type: "text", text: value, styles: {} },
  ] : Array.isArray(value) ? value : [];
  const normalized: EduInlineContent[] = [];

  for (const item of items) {
    const text = normalizeStyledText(item);
    if (text) {
      normalized.push(text);
      continue;
    }
    if (!isRecord(item) || item.type !== "link") {
      continue;
    }
    const content = Array.isArray(item.content)
      ? item.content.map(normalizeStyledText).filter((entry): entry is EduStyledText => Boolean(entry))
      : [];
    if (!isSafeWebUrl(item.href)) {
      normalized.push(...content);
    } else if (content.length) {
      normalized.push({ type: "link", href: new URL(item.href).toString(), content });
    }
  }

  return normalized;
}

function normalizePositiveSpan(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 1 && value <= 100
    ? value
    : undefined;
}

function normalizeTableCell(value: unknown): EduTableCell {
  const cell = isRecord(value) && value.type === "tableCell" ? value : null;
  const props = cell && isRecord(cell.props) ? cell.props : {};
  return {
    type: "tableCell",
    props: {
      backgroundColor: normalizeColor(props.backgroundColor),
      textColor: normalizeColor(props.textColor),
      textAlignment: normalizeAlignment(props.textAlignment),
      ...(normalizePositiveSpan(props.colspan) ? { colspan: normalizePositiveSpan(props.colspan) } : {}),
      ...(normalizePositiveSpan(props.rowspan) ? { rowspan: normalizePositiveSpan(props.rowspan) } : {}),
    },
    content: normalizeInlineContent(cell?.content ?? value),
  };
}

function normalizeTableContent(value: unknown): EduTableContent {
  const table = isRecord(value) && value.type === "tableContent" ? value : {};
  const rows = Array.isArray(table.rows) ? table.rows.slice(0, 100) : [];
  const normalizedRows = rows.map((row) => {
    const cells = isRecord(row) && Array.isArray(row.cells) ? row.cells.slice(0, 50) : [];
    return { cells: cells.map(normalizeTableCell) };
  });
  const widestRow = normalizedRows.reduce((maximum, row) => Math.max(maximum, row.cells.length), 0);
  const widths = Array.isArray(table.columnWidths)
    ? table.columnWidths.slice(0, widestRow).map((width) =>
        typeof width === "number" && Number.isFinite(width) && width > 0
          ? width
          : undefined,
      )
    : [];
  while (widths.length < widestRow) widths.push(undefined);

  const normalizeHeaderCount = (header: unknown, maximum: number) =>
    typeof header === "number" && Number.isInteger(header) && header > 0
      ? Math.min(header, maximum)
      : undefined;
  const headerRows = normalizeHeaderCount(table.headerRows, normalizedRows.length);
  const headerCols = normalizeHeaderCount(table.headerCols, widestRow);

  return {
    type: "tableContent",
    columnWidths: widths,
    ...(headerRows ? { headerRows } : {}),
    ...(headerCols ? { headerCols } : {}),
    rows: normalizedRows,
  };
}

type NormalizationState = { blockCount: number; ids: Set<string> };

function normalizeBlock(
  value: unknown,
  depth: number,
  state: NormalizationState,
): EduNivelBlock {
  if (depth > MAX_RESOURCE_DOCUMENT_DEPTH) {
    throw new ResourceDocumentValidationError("DEPTH_LIMIT");
  }
  state.blockCount += 1;
  if (state.blockCount > MAX_RESOURCE_DOCUMENT_BLOCKS) {
    throw new ResourceDocumentValidationError("BLOCK_LIMIT");
  }
  if (!isRecord(value) || typeof value.type !== "string" || !supportedBlockTypes.has(value.type as EduNivelBlock["type"])) {
    throw new ResourceDocumentValidationError("INVALID_DOCUMENT");
  }
  if (typeof value.id !== "string" || !value.id || value.id.length > 128 || state.ids.has(value.id)) {
    throw new ResourceDocumentValidationError("INVALID_DOCUMENT");
  }
  state.ids.add(value.id);
  const type = value.type as EduNivelBlock["type"];
  const sourceProps = isRecord(value.props) ? value.props : {};
  let props: Record<string, unknown>;
  let content: EduNivelBlock["content"];

  if (type === "eduCallout") {
    const variant = calloutVariants.has(sourceProps.variant as EduCalloutVariant)
      ? (sourceProps.variant as EduCalloutVariant)
      : "note";
    props = { variant };
    content = normalizeInlineContent(value.content);
  } else if (type === "divider") {
    props = {};
  } else if (type === "table") {
    props = { textColor: normalizeColor(sourceProps.textColor) };
    content = normalizeTableContent(value.content);
  } else {
    props = {
      backgroundColor: normalizeColor(sourceProps.backgroundColor),
      textColor: normalizeColor(sourceProps.textColor),
      ...(type !== "quote" ? { textAlignment: normalizeAlignment(sourceProps.textAlignment) } : {}),
    };
    if (type === "heading") {
      const level = typeof sourceProps.level === "number" && Number.isInteger(sourceProps.level)
        ? Math.min(3, Math.max(1, sourceProps.level))
        : 1;
      props.level = level;
    }
    if (type === "numberedListItem" && typeof sourceProps.start === "number" && Number.isInteger(sourceProps.start) && sourceProps.start > 0) {
      props.start = sourceProps.start;
    }
    content = normalizeInlineContent(value.content);
  }

  const children = Array.isArray(value.children)
    ? value.children.map((child) => normalizeBlock(child, depth + 1, state))
    : [];

  return {
    id: value.id,
    type,
    props,
    ...(content ? { content } : {}),
    children,
  };
}

function normalizeDocumentValue(value: unknown): ResourceDocumentV1 {
  if (!isRecord(value) || value.format !== RESOURCE_DOCUMENT_FORMAT) {
    throw new ResourceDocumentValidationError("INVALID_DOCUMENT");
  }
  if (value.version !== RESOURCE_DOCUMENT_VERSION) {
    throw new ResourceDocumentValidationError("UNKNOWN_VERSION");
  }
  if (!Array.isArray(value.blocks)) {
    throw new ResourceDocumentValidationError("INVALID_DOCUMENT");
  }
  const state: NormalizationState = { blockCount: 0, ids: new Set() };
  const blocks = value.blocks.map((block) => normalizeBlock(block, 1, state));
  return { format: RESOURCE_DOCUMENT_FORMAT, version: RESOURCE_DOCUMENT_VERSION, blocks };
}

function inlineText(content: EduInlineContent[]) {
  return content
    .map((item) => item.type === "text" ? item.text : item.content.map((text) => text.text).join(""))
    .join("");
}

function blockText(block: EduNivelBlock): string {
  const ownText = Array.isArray(block.content)
    ? inlineText(block.content)
    : block.content?.type === "tableContent"
      ? block.content.rows.flatMap((row) => row.cells).map((cell) => inlineText(cell.content)).join("")
      : "";
  return ownText + block.children.map(blockText).join("");
}

export function countResourceDocumentText(document: ResourceDocumentV1) {
  return Array.from(document.blocks.map(blockText).join("")).length;
}

export function getResourceDocumentByteLength(serialized: string) {
  return new TextEncoder().encode(serialized).byteLength;
}

export function isResourceDocumentSemanticallyEmpty(document: ResourceDocumentV1) {
  const hasStructuralContent = (blocks: EduNivelBlock[]): boolean =>
    blocks.some((block) =>
      block.type === "divider" ||
      block.type === "table" ||
      blockText(block).length > 0 ||
      hasStructuralContent(block.children),
    );
  return !hasStructuralContent(document.blocks);
}

export function serializeResourceDocument(document: ResourceDocumentV1) {
  const normalized = normalizeDocumentValue(document);
  if (countResourceDocumentText(normalized) > MAX_RESOURCE_CONTENT_CHARACTERS) {
    throw new ResourceDocumentValidationError("TEXT_LIMIT");
  }
  const serialized = JSON.stringify(normalized);
  if (getResourceDocumentByteLength(serialized) > MAX_SERIALIZED_RESOURCE_DOCUMENT_BYTES) {
    throw new ResourceDocumentValidationError("BYTE_LIMIT");
  }
  return serialized;
}

function stableLegacyId(text: string, index: number) {
  let hash = 2166136261;
  for (const character of text) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return `legacy-${index}-${(hash >>> 0).toString(36)}`;
}

export function legacyTextToResourceDocument(value: string): ResourceDocumentV1 {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const blocks: EduNivelBlock[] = lines.map((line, index) => ({
    id: stableLegacyId(line, index),
    type: "paragraph",
    props: { backgroundColor: "default", textColor: "default", textAlignment: "left" },
    content: line ? [{ type: "text", text: line, styles: {} }] : [],
    children: [],
  }));
  return { format: RESOURCE_DOCUMENT_FORMAT, version: RESOURCE_DOCUMENT_VERSION, blocks };
}

export function normalizeResourceDocument(blocks: unknown): ResourceDocumentV1 {
  return normalizeDocumentValue({
    format: RESOURCE_DOCUMENT_FORMAT,
    version: RESOURCE_DOCUMENT_VERSION,
    blocks,
  });
}

export function parseResourceContent(value: string | null | undefined): ParsedResourceContent {
  if (!value || !value.trim()) return { kind: "empty", document: null, blocks: [] };
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    const document = legacyTextToResourceDocument(value);
    return { kind: "legacy", document, blocks: document.blocks, legacyText: value };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const document = normalizeDocumentValue(parsed);
    serializeResourceDocument(document);
    return { kind: "document", document, blocks: document.blocks };
  } catch {
    return { kind: "invalid", document: null, blocks: [] };
  }
}

export function normalizeResourceContentForStorage(value: string | null | undefined) {
  if (!value || !value.trim()) return null;
  const trimmed = value.trim();
  let document: ResourceDocumentV1;

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new ResourceDocumentValidationError("INVALID_DOCUMENT");
    }
    document = normalizeDocumentValue(parsed);
  } else {
    document = legacyTextToResourceDocument(value.trim());
  }

  if (isResourceDocumentSemanticallyEmpty(document)) return null;
  return serializeResourceDocument(document);
}

export function getResourceContentValidationMessage(value: string | null | undefined) {
  try {
    normalizeResourceContentForStorage(value);
    return null;
  } catch (error) {
    return error instanceof ResourceDocumentValidationError
      ? error.message
      : errorMessages.INVALID_DOCUMENT;
  }
}
