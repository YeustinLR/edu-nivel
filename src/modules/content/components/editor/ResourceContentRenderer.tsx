import { BookOpen, Lightbulb, NotebookPen, TriangleAlert } from "lucide-react";
import katex from "katex";
import { Fragment, type ReactNode } from "react";

import {
  eduCalloutPresentation,
  parseResourceContent,
  type EduInlineContent,
  type EduNivelBlock,
  type EduTextStyles,
  type ResourceTextAlignment,
  type ResourceTextColor,
} from "@/modules/content/domain/resource-document";

import styles from "./ResourceContentRenderer.module.css";

const colorClasses: Partial<Record<ResourceTextColor, string>> = {
  gray: styles.textGray,
  purple: styles.textPurple,
  blue: styles.textBlue,
  green: styles.textGreen,
  yellow: styles.textYellow,
  red: styles.textRed,
};

const backgroundClasses: Partial<Record<ResourceTextColor, string>> = {
  gray: styles.bgGray,
  purple: styles.bgPurple,
  blue: styles.bgBlue,
  green: styles.bgGreen,
  yellow: styles.bgYellow,
  red: styles.bgRed,
};

const alignmentClasses: Partial<Record<ResourceTextAlignment, string>> = {
  center: styles.alignCenter,
  right: styles.alignRight,
  justify: styles.alignJustify,
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function inlineClassName(textStyles: EduTextStyles) {
  return classNames(
    textStyles.bold && styles.strong,
    textStyles.italic && styles.italic,
    textStyles.underline && styles.underline,
    textStyles.strike && styles.strike,
    textStyles.textColor && colorClasses[textStyles.textColor],
    textStyles.backgroundColor && backgroundClasses[textStyles.backgroundColor],
  );
}

function MathFormula({ source, displayMode }: { source: string; displayMode: boolean }) {
  if (!source) return null;
  let html: string | null = null;
  try {
    html = katex.renderToString(source, {
      displayMode,
      output: "htmlAndMathml",
      throwOnError: true,
      trust: false,
      strict: "warn",
      maxExpand: 1_000,
      maxSize: 20,
    });
  } catch {
    html = null;
  }
  if (html) {
    return (
      <span
        className={displayMode ? styles.mathDisplay : styles.mathInline}
        // KaTeX creates the HTML and MathML; raw document HTML is never passed here.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <code
      className={displayMode ? styles.mathInvalidDisplay : styles.mathInvalidInline}
      title="Fórmula LaTeX no válida"
    >
      {source}
    </code>
  );
}

function InlineContent({ content }: { content: EduInlineContent[] }) {
  return content.map((item, index) => {
    if (item.type === "text") {
      return (
        <span key={index} className={inlineClassName(item.styles)}>
          {item.text}
        </span>
      );
    }
    if (item.type === "math") {
      return <MathFormula key={index} source={item.content} displayMode={false} />;
    }
    return (
      <a
        key={index}
        href={item.href}
        target="_blank"
        rel="noreferrer"
        className={styles.link}
      >
        <InlineContent content={item.content} />
      </a>
    );
  });
}

function getInlineContent(block: EduNivelBlock) {
  return Array.isArray(block.content) ? block.content : [];
}

function getAlignment(block: EduNivelBlock) {
  const alignment = block.props.textAlignment;
  return typeof alignment === "string"
    ? alignmentClasses[alignment as ResourceTextAlignment]
    : undefined;
}

function getBlockColorClasses(block: EduNivelBlock) {
  const textColor = block.props.textColor as ResourceTextColor | undefined;
  const backgroundColor = block.props.backgroundColor as ResourceTextColor | undefined;
  return classNames(
    textColor && colorClasses[textColor],
    backgroundColor && backgroundClasses[backgroundColor],
  );
}

const calloutIcons = {
  keyIdea: Lightbulb,
  example: BookOpen,
  note: NotebookPen,
  warning: TriangleAlert,
} as const;

function BlockChildren({ block }: { block: EduNivelBlock }) {
  return block.children.length ? (
    <div className={styles.children}>{renderBlockSequence(block.children)}</div>
  ) : null;
}

function RenderBlock({ block }: { block: EduNivelBlock }) {
  const content = <InlineContent content={getInlineContent(block)} />;
  const alignment = getAlignment(block);

  if (block.type === "paragraph") {
    return (
      <div>
        <p className={classNames(styles.paragraph, alignment, getBlockColorClasses(block))}>{content}</p>
        <BlockChildren block={block} />
      </div>
    );
  }
  if (block.type === "heading") {
    const level = block.props.level === 2 ? 2 : block.props.level === 3 ? 3 : 1;
    const headingClass = level === 1 ? styles.heading2 : level === 2 ? styles.heading3 : styles.heading4;
    const Tag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
    return (
      <div>
        <Tag className={classNames(styles.heading, headingClass, alignment, getBlockColorClasses(block))}>{content}</Tag>
        <BlockChildren block={block} />
      </div>
    );
  }
  if (block.type === "quote") {
    return (
      <div>
        <blockquote className={classNames(styles.quote, getBlockColorClasses(block))}>{content}</blockquote>
        <BlockChildren block={block} />
      </div>
    );
  }
  if (block.type === "divider") return <hr className={styles.divider} />;
  if (block.type === "mathBlock") {
    return (
      <div className={styles.mathBlock}>
        <MathFormula
          source={typeof block.content === "string" ? block.content : ""}
          displayMode
        />
        <BlockChildren block={block} />
      </div>
    );
  }
  if (block.type === "eduCallout") {
    const variant = block.props.variant === "keyIdea" || block.props.variant === "example" || block.props.variant === "warning"
      ? block.props.variant
      : "note";
    const Icon = calloutIcons[variant];
    return (
      <aside className={classNames(styles.callout, styles[variant])}>
        <span className={styles.calloutIcon} aria-hidden="true"><Icon size={17} /></span>
        <div>
          <span className={styles.calloutLabel}>{eduCalloutPresentation[variant].label}</span>
          <div>{content}</div>
          <BlockChildren block={block} />
        </div>
      </aside>
    );
  }
  if (block.type === "image") {
    const imageId = String(block.props.imageId ?? "");
    const altText = block.props.decorative
      ? ""
      : String(block.props.altText ?? "");
    const caption = String(block.props.caption ?? "");
    const width = Number(block.props.previewWidth) || 720;
    return (
      <figure
        className={classNames(
          styles.imageFigure,
          alignmentClasses[
            String(block.props.textAlignment) as ResourceTextAlignment
          ],
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/content-images/${encodeURIComponent(imageId)}/file`}
          alt={altText}
          width={width}
          loading="lazy"
          decoding="async"
          className={styles.image}
        />
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  }
  if (
    block.type === "table" &&
    block.content &&
    typeof block.content === "object" &&
    !Array.isArray(block.content)
  ) {
    const table = block.content;
    return (
      <div className={styles.tableScroller}>
        <table className={styles.table}>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.cells.map((cell, cellIndex) => {
                  const isHeader =
                    rowIndex < (table.headerRows ?? 0) ||
                    cellIndex < (table.headerCols ?? 0);
                  const Cell = isHeader ? "th" : "td";
                  return (
                    <Cell
                      key={cellIndex}
                      colSpan={cell.props.colspan}
                      rowSpan={cell.props.rowspan}
                      className={classNames(styles.tableCell, isHeader && styles.tableHeader, alignmentClasses[cell.props.textAlignment], colorClasses[cell.props.textColor], backgroundClasses[cell.props.backgroundColor])}
                    >
                      <InlineContent content={cell.content} />
                    </Cell>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return null;
}

function renderListGroup(blocks: EduNivelBlock[], start: number) {
  const first = blocks[start];
  const type = first.type;
  const items: EduNivelBlock[] = [];
  let cursor = start;
  while (cursor < blocks.length && blocks[cursor].type === type) {
    items.push(blocks[cursor]);
    cursor += 1;
  }
  const listClass = type === "bulletListItem" ? styles.bullet : styles.numbered;
  const children = items.map((block) => (
    <li key={block.id} className={classNames(styles.listItem, getAlignment(block), getBlockColorClasses(block))}>
      <InlineContent content={getInlineContent(block)} />
      {block.children.length ? renderBlockSequence(block.children) : null}
    </li>
  ));
  const node = type === "bulletListItem" ? (
    <ul key={first.id} className={classNames(styles.list, listClass)}>{children}</ul>
  ) : (
    <ol key={first.id} start={typeof first.props.start === "number" ? first.props.start : undefined} className={classNames(styles.list, listClass)}>{children}</ol>
  );
  return { node, nextIndex: cursor };
}

function renderBlockSequence(blocks: EduNivelBlock[]): ReactNode {
  const rendered: ReactNode[] = [];
  for (let index = 0; index < blocks.length;) {
    const block = blocks[index];
    if (block.type === "bulletListItem" || block.type === "numberedListItem") {
      const group = renderListGroup(blocks, index);
      rendered.push(group.node);
      index = group.nextIndex;
    } else {
      rendered.push(<Fragment key={block.id}><RenderBlock block={block} /></Fragment>);
      index += 1;
    }
  }
  return rendered;
}

export function ResourceContentRenderer({
  content,
  className,
  emptyFallback = null,
}: {
  content: string | null | undefined;
  className?: string;
  emptyFallback?: ReactNode;
}) {
  const parsed = parseResourceContent(content);
  if (parsed.kind === "invalid") {
    return <p className={classNames(styles.invalid, className)}>Este contenido no se puede mostrar de forma segura.</p>;
  }
  if (parsed.kind === "empty" || parsed.blocks.length === 0) return emptyFallback;
  return <div className={classNames(styles.content, className)}>{renderBlockSequence(parsed.blocks)}</div>;
}
