import fs from "node:fs";

const sourcePath = new URL("../docs/database-schema.mmd", import.meta.url);
const outputPath = new URL("../docs/database-schema.svg", import.meta.url);
const source = fs.readFileSync(sourcePath, "utf8");

const entityBlocks = [...source.matchAll(/^(\s{4})([A-Z0-9_]+)\s*\{\n([\s\S]*?)^\s{4}\}/gm)];
const entities = new Map();

for (const match of entityBlocks) {
  const [, , name, body] = match;
  const fields = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [type, field, ...flags] = line.split(/\s+/);
      return { type, field, flags: flags.join(" ") };
    });
  entities.set(name, { name, fields });
}

const relationRegex = /^\s{4}([A-Z0-9_]+)\s+([^:]+):\s+"([^"]+)"/gm;
const relations = [...source.matchAll(relationRegex)].map((match) => {
  const [, left, relationPart, label] = match;
  const tokens = relationPart.trim().split(/\s+/);
  const right = tokens.at(-1);
  const operator = tokens.slice(0, -1).join(" ");
  return { left, right, operator, label };
}).filter((relation) => relation.right && entities.has(relation.left) && entities.has(relation.right));

const groups = [
  { title: "Autenticación y usuarios", color: "#DBEAFE", names: ["USER", "SESSION", "ACCOUNT", "VERIFICATION", "RATE_LIMIT"] },
  { title: "Administración", color: "#F3E8FF", names: ["ADMIN_AUDIT_LOG", "USER_INVITATION"] },
  { title: "Suscripciones y pagos", color: "#DCFCE7", names: ["SUBSCRIPTION", "PAYMENT", "PAYMENT_REFUND", "WEBHOOK_RECEIPT"] },
  { title: "Estructura educativa", color: "#FEF3C7", names: ["LEVEL", "SUBJECT", "MODULE", "RESOURCE", "UPLOAD_INTENT"] },
  { title: "Recursos especializados", color: "#FCE7F3", names: ["QUIZ", "YOUTUBE_VIDEO", "PDF_RESOURCE", "FILE_RESOURCE", "LINK_RESOURCE", "GAME_RESOURCE", "IMAGE_RESOURCE", "AUDIO_RESOURCE"] },
  { title: "Progreso del estudiante", color: "#E0E7FF", names: ["RESOURCE_PROGRESS", "SAVED_RESOURCE"] },
];

const width = 6800;
const cardWidth = 1000;
const gap = 90;
const moduleGap = 120;
const lineHeight = 24;
const headerHeight = 42;
const positions = new Map();
let currentY = 120;
let maxBottom = 0;

const esc = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const tableHeight = (entity) => headerHeight + 16 + entity.fields.length * lineHeight;
const parts = [];

parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="3600" viewBox="0 0 ${width} 3600">`);
parts.push(`<rect width="100%" height="100%" fill="#F8FAFC"/>`);
parts.push(`<text x="80" y="58" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#0F172A">EduNivel — esquema de base de datos PostgreSQL</text>`);
parts.push(`<text x="80" y="92" font-family="Arial, sans-serif" font-size="16" fill="#475569">Generado desde prisma/schema.prisma · PK: primaria · FK: foránea · UK: única · optional: nullable</text>`);

for (const group of groups) {
  const columns = Math.min(4, group.names.length);
  const groupX = 80;
  const groupY = currentY;
  const colHeights = Array.from({ length: columns }, () => 0);
  const groupPositions = [];

  parts.push(`<text x="${groupX}" y="${groupY}" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#1E293B">${esc(group.title)}</text>`);
  const startY = groupY + 24;

  group.names.forEach((name, index) => {
    const entity = entities.get(name);
    if (!entity) return;
    const column = index % columns;
    const x = groupX + column * (cardWidth + gap);
    const y = startY + colHeights[column];
    const h = tableHeight(entity);
    groupPositions.push({ x, y, h, column });
    colHeights[column] += h + 30;
  });

  for (const item of groupPositions) {
    const name = group.names[groupPositions.indexOf(item)];
    const entity = entities.get(name);
    const x = item.x;
    const y = item.y;
    positions.set(name, { x, y, w: cardWidth, h: item.h });
    parts.push(`<rect x="${x}" y="${y}" width="${cardWidth}" height="${item.h}" rx="8" fill="#FFFFFF" stroke="#94A3B8" stroke-width="2"/>`);
    parts.push(`<rect x="${x}" y="${y}" width="${cardWidth}" height="${headerHeight}" rx="8" fill="${group.color}"/>`);
    parts.push(`<rect x="${x}" y="${y + headerHeight - 8}" width="${cardWidth}" height="8" fill="${group.color}"/>`);
    parts.push(`<text x="${x + 14}" y="${y + 28}" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#0F172A">${esc(name.toLowerCase())}</text>`);
    entity.fields.forEach((field, fieldIndex) => {
      const fieldY = y + headerHeight + 22 + fieldIndex * lineHeight;
      const marker = field.flags ? ` [${field.flags}]` : "";
      parts.push(`<text x="${x + 14}" y="${fieldY}" font-family="monospace" font-size="15" fill="#334155">${esc(field.type)} ${esc(field.field)}${esc(marker)}</text>`);
    });
  }

  const groupBottom = Math.max(...groupPositions.map((item) => item.y + item.h), startY);
  maxBottom = Math.max(maxBottom, groupBottom);
  currentY = groupBottom + moduleGap;
}

const endpoint = (name) => {
  const node = positions.get(name);
  if (!node) return null;
  return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
};

const edgeParts = [];
for (const relation of relations) {
  const a = endpoint(relation.left);
  const b = endpoint(relation.right);
  if (!a || !b || relation.left === relation.right) continue;
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  edgeParts.push(`<path d="M ${a.x} ${a.y} L ${b.x} ${b.y}" stroke="#64748B" stroke-width="2" fill="none" opacity="0.55"/>`);
  edgeParts.push(`<text x="${midX + 6}" y="${midY - 4}" font-family="Arial, sans-serif" font-size="12" fill="#475569">${esc(relation.label)}</text>`);
}

// Place the edges above the background but below the table cards is not possible
// after drawing cards, so they are appended with low opacity to remain readable.
// The table cards are intentionally opaque and remain the primary visual layer.
parts.splice(3, 0, ...edgeParts);

const enumY = Math.max(maxBottom + 70, 3300);
parts.push(`<rect x="80" y="${enumY}" width="${width - 160}" height="220" rx="10" fill="#FFFFFF" stroke="#CBD5E1"/>`);
parts.push(`<text x="105" y="${enumY + 32}" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#1E293B">Enums (tipos enumerados, no tablas)</text>`);
const enumText = [
  "Role: STUDENT | TEACHER | COLLABORATOR | ADMIN",
  "PlanCode: STUDENT_MONTHLY | STUDENT_YEARLY | TEACHER_MONTHLY | TEACHER_YEARLY",
  "SubscriptionProduct: STUDENT_PREMIUM | TEACHER_PREMIUM · BillingInterval: MONTHLY | YEARLY",
  "SubscriptionStatus: ACTIVE | CANCELED | EXPIRED | REFUNDED · PaymentStatus: INITIALIZING | PROCESSING | SUCCEEDED | FAILED | CANCELED | REFUNDED | REQUIRES_REVIEW",
  "RefundStatus: REQUESTED | PENDING | SUCCEEDED | FAILED | REQUIRES_REVIEW | CANCELED · PaymentProvider: ONVO · PaymentMethod: SINPE_MOBILE",
  "ProviderMode: TEST | LIVE · WebhookOutcome: PROCESSED | IGNORED | REQUIRES_REVIEW | FAILED | PROCESSING",
  "ResourceType: NOTE | QUIZ | YOUTUBE | PDF | FILE | LINK | GAME | IMAGE | AUDIO · ContentAudience: STUDENT | TEACHER | BOTH",
  "PublicationStatus: DRAFT | IN_REVIEW | CHANGES_REQUESTED | PUBLISHED | UNPUBLISHED · UploadStatus: PENDING | PROCESSING | CONFIRMED | CLEANUP_PENDING | FAILED | EXPIRED",
];
enumText.forEach((line, index) => parts.push(`<text x="105" y="${enumY + 60 + index * 20}" font-family="Arial, sans-serif" font-size="13" fill="#475569">${esc(line)}</text>`));
parts.push("</svg>");

fs.writeFileSync(outputPath, parts.join("\n"));
console.log(`Generated ${outputPath.pathname}`);
