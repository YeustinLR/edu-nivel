"use client";

import {
  BlockNoteSchema,
  combineByGroup,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  SourceBlockWithPreviewExtension,
  type PartialBlock,
} from "@blocknote/core";
import { syntaxHighlighter } from "@blocknote/code-block";
import {
  createReactInlineMathSpec,
  createReactMathBlockSpec,
  getMathSlashMenuItems,
  locales as mathLocales,
} from "@blocknote/math-block";
import { es } from "@blocknote/core/locales";
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
  SideMenuExtension,
  SuggestionMenu,
} from "@blocknote/core/extensions";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/ariakit";
import "@blocknote/ariakit/style.css";
import {
  AddBlockButton,
  createReactBlockSpec,
  DragHandleMenu,
  SideMenu,
  SideMenuController,
  SuggestionMenuController,
  useComponentsContext,
  useCreateBlockNote,
  useDictionary,
  useExtension,
  useExtensionState,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  BookOpen,
  Bold,
  CornerDownLeft,
  CornerDownRight,
  GripVertical,
  Heading2,
  ImageIcon,
  Italic,
  Lightbulb,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  NotebookPen,
  Pilcrow,
  Quote,
  Redo2,
  Smile,
  Strikethrough,
  Sigma,
  Table2,
  TriangleAlert,
  Underline,
  Undo2,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

import { ResourceContentRenderer } from "@/modules/content/components/editor/ResourceContentRenderer";
import {
  eduCalloutPresentation,
  eduCalloutVariants,
  isResourceDocumentSemanticallyEmpty,
  normalizeResourceDocument,
  parseResourceContent,
  serializeResourceDocument,
  type ResourceDocumentValidationError,
} from "@/modules/content/domain/resource-document";

import styles from "./ResourceDocumentEditor.module.css";

const calloutIcons = {
  keyIdea: Lightbulb,
  example: BookOpen,
  note: NotebookPen,
  warning: TriangleAlert,
} as const;

const createEduCallout = createReactBlockSpec(
  {
    type: "eduCallout",
    propSchema: {
      variant: { default: "note", values: eduCalloutVariants },
    },
    content: "inline",
  },
  {
    render: ({ block, contentRef }) => {
      const variant = block.props.variant;
      const Icon = calloutIcons[variant];
      return (
        <aside className={`${styles.calloutEditor} ${styles[variant]}`}>
          <span contentEditable={false} className={styles.calloutIcon} aria-hidden="true">
            <Icon size={17} />
          </span>
          <div>
            <span contentEditable={false} className={styles.calloutLabel}>
              {eduCalloutPresentation[variant].label}
            </span>
            <div ref={contentRef} />
          </div>
        </aside>
      );
    },
  },
);

function EmbeddedImageEditorView({
  imageId,
  altText,
  decorative,
  caption,
  textAlignment,
  previewWidth,
  disabled,
  onFile,
}: {
  imageId: string;
  altText: string;
  decorative: boolean;
  caption: string;
  textAlignment: "left" | "center" | "right";
  previewWidth: number;
  disabled: boolean;
  onFile: (file: File) => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!imageId) {
    return (
      <div className={styles.imagePlaceholder} contentEditable={false}>
        <ImageIcon aria-hidden="true" size={28} />
        <label className={styles.imageUploadButton}>
          <UploadCloud aria-hidden="true" size={16} />
          {uploading ? "Subiendo imagen…" : "Seleccionar imagen"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled || uploading}
            hidden
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setUploading(true);
              setError(null);
              try {
                await onFile(file);
              } catch (uploadError) {
                setError(
                  uploadError instanceof Error
                    ? uploadError.message
                    : "No se pudo subir la imagen.",
                );
              } finally {
                setUploading(false);
                event.target.value = "";
              }
            }}
          />
        </label>
        <span>JPEG, PNG o WebP · máximo 10 MiB</span>
        {error ? <span className={styles.imageUploadError}>{error}</span> : null}
      </div>
    );
  }

  return (
    <figure
      className={`${styles.imageFigure} ${styles[`imageAlign${textAlignment[0].toUpperCase()}${textAlignment.slice(1)}`]}`}
      contentEditable={false}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/content-images/${encodeURIComponent(imageId)}/file`}
        alt={decorative ? "" : altText}
        width={previewWidth}
        className={styles.embeddedImage}
        draggable={false}
      />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

const createEmbeddedImage = createReactBlockSpec(
  {
    type: "image",
    propSchema: {
      imageId: { default: "", type: "string" },
      altText: { default: "", type: "string" },
      decorative: { default: false },
      caption: { default: "", type: "string" },
      textAlignment: {
        default: "center",
        values: ["left", "center", "right"],
      },
      previewWidth: { default: 720, type: "number" },
    },
    content: "none",
  },
  {
    meta: {
      fileBlockAccept: ["image/jpeg", "image/png", "image/webp"],
    },
    render: ({ block, editor }) => (
      <EmbeddedImageEditorView
        imageId={block.props.imageId}
        altText={block.props.altText}
        decorative={block.props.decorative}
        caption={block.props.caption}
        textAlignment={block.props.textAlignment}
        previewWidth={block.props.previewWidth}
        disabled={!editor.isEditable}
        onFile={async (file) => {
          if (!editor.uploadFile) {
            throw new Error("La carga de imágenes no está disponible.");
          }
          const update = await editor.uploadFile(file, block.id);
          editor.updateBlock(
            block,
            typeof update === "string"
              ? { props: { imageId: update } }
              : update,
          );
        }}
      />
    ),
  },
);

const resourceEditorSchema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
    heading: defaultBlockSpecs.heading,
    bulletListItem: defaultBlockSpecs.bulletListItem,
    numberedListItem: defaultBlockSpecs.numberedListItem,
    quote: defaultBlockSpecs.quote,
    divider: defaultBlockSpecs.divider,
    table: defaultBlockSpecs.table,
    image: createEmbeddedImage(),
    mathBlock: createReactMathBlockSpec(),
    eduCallout: createEduCallout(),
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    math: createReactInlineMathSpec(),
  },
});

type ResourceEditor = typeof resourceEditorSchema.BlockNoteEditor;

const dictionary = {
  ...es,
  math: mathLocales.es,
  placeholders: {
    ...es.placeholders,
    default: "Escribe ‘/’ para insertar contenido",
  },
};

function initialBlocks(value: string | null | undefined) {
  const parsed = parseResourceContent(value);
  if (parsed.kind !== "empty" && parsed.kind !== "invalid" && parsed.blocks.length) {
    return parsed.blocks as unknown as PartialBlock<
      typeof resourceEditorSchema.blockSchema,
      typeof resourceEditorSchema.inlineContentSchema,
      typeof resourceEditorSchema.styleSchema
    >[];
  }
  return [{ type: "paragraph" as const }];
}

function initialSerializedContent(value: string | null | undefined) {
  const parsed = parseResourceContent(value);
  if (!parsed.document) return "";
  return isResourceDocumentSemanticallyEmpty(parsed.document)
    ? ""
    : serializeResourceDocument(parsed.document);
}

function isSafeWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function insertBlockItem(
  editor: ResourceEditor,
  item: Omit<DefaultReactSuggestionItem, "onItemClick"> & {
    block: Record<string, unknown>;
  },
): DefaultReactSuggestionItem {
  const { block, ...presentation } = item;
  return {
    ...presentation,
    onItemClick: () =>
      insertOrUpdateBlockForSlashMenu(
        editor as unknown as Parameters<typeof insertOrUpdateBlockForSlashMenu>[0],
        block as Parameters<typeof insertOrUpdateBlockForSlashMenu>[1],
      ),
  };
}

function getSlashMenuItems(editor: ResourceEditor): DefaultReactSuggestionItem[] {
  const basics: DefaultReactSuggestionItem[] = [
    insertBlockItem(editor, { title: "Texto", subtext: "Párrafo de texto", aliases: ["parrafo", "texto"], group: "Básicos", icon: <Pilcrow size={18} />, block: { type: "paragraph" } }),
    insertBlockItem(editor, { title: "Heading 1", subtext: "Encabezado principal", aliases: ["titulo", "encabezado", "h1"], group: "Básicos", icon: <Heading2 size={18} />, block: { type: "heading", props: { level: 1 } } }),
    insertBlockItem(editor, { title: "Heading 2", subtext: "Encabezado secundario", aliases: ["subtitulo", "encabezado", "h2"], group: "Básicos", icon: <Heading2 size={17} />, block: { type: "heading", props: { level: 2 } } }),
    insertBlockItem(editor, { title: "Heading 3", subtext: "Encabezado de tercer nivel", aliases: ["subtitulo", "encabezado", "h3"], group: "Básicos", icon: <Heading2 size={16} />, block: { type: "heading", props: { level: 3 } } }),
    insertBlockItem(editor, { title: "Lista con viñetas", aliases: ["lista", "vinetas"], group: "Básicos", icon: <List size={18} />, block: { type: "bulletListItem" } }),
    insertBlockItem(editor, { title: "Lista numerada", aliases: ["lista", "numerada"], group: "Básicos", icon: <ListOrdered size={18} />, block: { type: "numberedListItem" } }),
    insertBlockItem(editor, { title: "Cita", aliases: ["cita", "quote"], group: "Básicos", icon: <Quote size={18} />, block: { type: "quote" } }),
    insertBlockItem(editor, { title: "Separador", aliases: ["linea", "divisor"], group: "Básicos", icon: <Minus size={18} />, block: { type: "divider" } }),
    insertBlockItem(editor, { title: "Tabla", subtext: "Tabla de 2 × 2", aliases: ["tabla", "cuadricula"], group: "Básicos", icon: <Table2 size={18} />, block: { type: "table", content: { type: "tableContent", rows: [{ cells: ["", ""] }, { cells: ["", ""] }] } } }),
    insertBlockItem(editor, { title: "Imagen", subtext: "Imagen dentro del contenido", aliases: ["imagen", "foto", "ilustracion"], group: "Básicos", icon: <ImageIcon size={18} />, block: { type: "image" } }),
  ];
  const callouts = eduCalloutVariants.map((variant): DefaultReactSuggestionItem => {
    const Icon = calloutIcons[variant];
    return insertBlockItem(editor, {
      title: eduCalloutPresentation[variant].label,
      subtext: variant === "keyIdea" ? "Destaca un concepto esencial" : variant === "example" ? "Presenta un caso práctico" : variant === "warning" ? "Señala una precaución" : "Añade una aclaración",
      aliases: ["educativo", "destacado", variant],
      group: "EduNivel",
      icon: <Icon size={18} />,
      block: { type: "eduCallout", props: { variant } },
    });
  });
  return combineByGroup(
    [...basics, ...callouts],
    getMathSlashMenuItems(editor) as DefaultReactSuggestionItem[],
  );
}

function insertMathBlock(editor: ResourceEditor) {
  const block = insertOrUpdateBlockForSlashMenu(
    editor as unknown as Parameters<typeof insertOrUpdateBlockForSlashMenu>[0],
    { type: "mathBlock" } as Parameters<typeof insertOrUpdateBlockForSlashMenu>[1],
  );
  editor
    .getExtension(SourceBlockWithPreviewExtension)
    ?.store.setState((state) => ({ ...state, popupOpen: block.id }));
  window.requestAnimationFrame(() => {
    editor.setTextCursorPosition(block.id, "end");
    editor.focus();
  });
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`${styles.toolButton} ${active ? styles.toolButtonActive : ""}`}
    >
      {children}
    </button>
  );
}

function RightOpeningDragHandleButton() {
  const components = useComponentsContext();
  const dictionary = useDictionary();
  const sideMenu = useExtension(SideMenuExtension);
  const block = useExtensionState(SideMenuExtension, {
    selector: (state) => state?.block,
  });

  if (!components || !block) return null;

  return (
    <components.Generic.Menu.Root
      position="right"
      onOpenChange={(open) => {
        if (open) sideMenu.freezeMenu();
        else sideMenu.unfreezeMenu();
      }}
    >
      <components.Generic.Menu.Trigger>
        <components.SideMenu.Button
          label={dictionary.side_menu.drag_handle_label}
          draggable
          onDragStart={(event) => sideMenu.blockDragStart(event, block)}
          onDragEnd={sideMenu.blockDragEnd}
          className="bn-button"
          icon={<GripVertical size={20} aria-hidden="true" />}
        />
      </components.Generic.Menu.Trigger>
      <DragHandleMenu />
    </components.Generic.Menu.Root>
  );
}

function RightOpeningSideMenu() {
  return (
    <SideMenu>
      <AddBlockButton />
      <RightOpeningDragHandleButton />
    </SideMenu>
  );
}

function StaticToolbar({ editor, disabled }: { editor: ResourceEditor; disabled: boolean }) {
  const [, forceUpdate] = useState(0);
  const [linkUrl, setLinkUrl] = useState("");
  const activeStyles = editor.getActiveStyles();
  let currentBlock: ReturnType<ResourceEditor["getTextCursorPosition"]>["block"] | null = null;
  try {
    currentBlock = editor.getTextCursorPosition().block;
  } catch {
    currentBlock = null;
  }
  const updateUi = () => forceUpdate((value) => value + 1);
  const applyBlockType = (type: string) => {
    if (!currentBlock) return;
    if (type.startsWith("heading-")) {
      editor.updateBlock(currentBlock, { type: "heading", props: { level: Number(type.at(-1)) as 1 | 2 | 3 } });
    } else {
      editor.updateBlock(currentBlock, { type: type as "paragraph" | "bulletListItem" | "numberedListItem" | "quote" | "mathBlock" });
    }
    updateUi();
  };
  const applyLink = () => {
    const trimmed = linkUrl.trim();
    if (!isSafeWebUrl(trimmed)) return;
    editor.createLink(new URL(trimmed).toString());
    setLinkUrl("");
    updateUi();
  };
  const alignmentOptions = [
    { value: "left" as const, label: "Alinear a la izquierda", Icon: AlignLeft },
    { value: "center" as const, label: "Centrar", Icon: AlignCenter },
    { value: "right" as const, label: "Alinear a la derecha", Icon: AlignRight },
    { value: "justify" as const, label: "Justificar", Icon: AlignJustify },
  ];
  const currentProps = (currentBlock?.props ?? {}) as Record<string, unknown>;

  return (
    <div className={styles.toolbarScroller} aria-label="Herramientas de formato">
      <div className={styles.toolbar} onMouseUp={updateUi}>
        <div className={styles.toolbarGroup}>
          <ToolButton label="Deshacer" disabled={disabled} onClick={() => { editor.undo(); updateUi(); }}><Undo2 size={16} /></ToolButton>
          <ToolButton label="Rehacer" disabled={disabled} onClick={() => { editor.redo(); updateUi(); }}><Redo2 size={16} /></ToolButton>
        </div>
        <div className={styles.toolbarGroup}>
          <select
            aria-label="Tipo de bloque"
            title="Tipo de bloque"
            disabled={disabled || !currentBlock}
            value={currentBlock?.type === "heading" ? `heading-${currentBlock.props.level}` : currentBlock?.type ?? "paragraph"}
            onChange={(event) => applyBlockType(event.target.value)}
            className={`${styles.toolSelect} ${styles.blockSelect}`}
          >
            <option value="paragraph">Texto</option>
            <option value="heading-1">Heading 1</option>
            <option value="heading-2">Heading 2</option>
            <option value="heading-3">Heading 3</option>
            <option value="bulletListItem">Lista con viñetas</option>
            <option value="numberedListItem">Lista numerada</option>
            <option value="quote">Cita</option>
            <option value="mathBlock">Fórmula</option>
          </select>
        </div>
        <div className={styles.toolbarGroup}>
          {(["bold", "italic", "underline", "strike"] as const).map((style) => {
            const Icon = style === "bold" ? Bold : style === "italic" ? Italic : style === "underline" ? Underline : Strikethrough;
            const label = style === "bold" ? "Negrita" : style === "italic" ? "Cursiva" : style === "underline" ? "Subrayado" : "Tachado";
            return <ToolButton key={style} label={label} active={activeStyles[style] === true} disabled={disabled} onClick={() => { editor.toggleStyles({ [style]: true }); updateUi(); }}><Icon size={16} /></ToolButton>;
          })}
        </div>
        <div className={styles.toolbarGroup}>
          <input
            type="url"
            value={linkUrl}
            disabled={disabled}
            onChange={(event) => setLinkUrl(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); applyLink(); } }}
            placeholder="https://…"
            aria-label="URL del enlace"
            className={styles.linkInput}
          />
          <ToolButton label="Aplicar enlace HTTP o HTTPS" disabled={disabled || !isSafeWebUrl(linkUrl.trim())} onClick={applyLink}><LinkIcon size={16} /></ToolButton>
        </div>
        <div className={styles.toolbarGroup}>
          <ToolButton label="Anidar bloque" disabled={disabled || !editor.canNestBlock()} onClick={() => { editor.nestBlock(); updateUi(); }}><CornerDownRight size={16} /></ToolButton>
          <ToolButton label="Desanidar bloque" disabled={disabled || !editor.canUnnestBlock()} onClick={() => { editor.unnestBlock(); updateUi(); }}><CornerDownLeft size={16} /></ToolButton>
        </div>
        <div className={styles.toolbarGroup}>
          {alignmentOptions.map(({ value, label, Icon }) => (
            <ToolButton
              key={value}
              label={label}
              active={((currentProps.textAlignment as string | undefined) ?? "left") === value}
              disabled={disabled || !currentBlock || !("textAlignment" in currentBlock.props)}
              onClick={() => {
                if (currentBlock) editor.updateBlock(currentBlock, { props: { textAlignment: value } });
                updateUi();
              }}
            >
              <Icon size={16} />
            </ToolButton>
          ))}
        </div>
        <div className={styles.toolbarGroup}>
          <ToolButton
            label="Insertar imagen"
            disabled={disabled}
            onClick={() => {
              insertOrUpdateBlockForSlashMenu(
                editor as unknown as Parameters<typeof insertOrUpdateBlockForSlashMenu>[0],
                { type: "image" } as Parameters<typeof insertOrUpdateBlockForSlashMenu>[1],
              );
              updateUi();
            }}
          >
            <ImageIcon size={16} />
          </ToolButton>
          <ToolButton
            label="Insertar fórmula"
            disabled={disabled}
            onClick={() => {
              insertMathBlock(editor);
              updateUi();
            }}
          >
            <Sigma size={16} />
          </ToolButton>
          <ToolButton
            label="Insertar emoji"
            disabled={disabled}
            onClick={() => editor.getExtension(SuggestionMenu)?.openSuggestionMenu(":", { ignoreQueryLength: true })}
          >
            <Smile size={16} />
          </ToolButton>
        </div>
        <div className={styles.toolbarGroup}>
          <select
            aria-label="Color de texto"
            title="Color de texto"
            disabled={disabled}
            value={typeof activeStyles.textColor === "string" ? activeStyles.textColor : "default"}
            onChange={(event) => { editor.addStyles({ textColor: event.target.value }); updateUi(); }}
            className={`${styles.toolSelect} ${styles.textColorSelect}`}
          >
            <option value="default">Color</option><option value="gray">Gris</option><option value="purple">Violeta</option><option value="blue">Azul</option><option value="green">Verde</option><option value="yellow">Ámbar</option><option value="red">Rojo</option>
          </select>
          <select
            aria-label="Resaltado de texto"
            title="Resaltado de texto"
            disabled={disabled}
            value={typeof activeStyles.backgroundColor === "string" ? activeStyles.backgroundColor : "default"}
            onChange={(event) => { editor.addStyles({ backgroundColor: event.target.value }); updateUi(); }}
            className={`${styles.toolSelect} ${styles.highlightSelect}`}
          >
            <option value="default">Resaltado</option><option value="yellow">Amarillo</option><option value="green">Verde</option><option value="blue">Azul</option><option value="purple">Violeta</option><option value="red">Rojo</option><option value="gray">Gris</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function ImageSettings({
  editor,
  disabled,
  revision,
}: {
  editor: ResourceEditor;
  disabled: boolean;
  revision: number;
}) {
  let block: ReturnType<ResourceEditor["getBlock"]>;
  try {
    block = editor.getSelection()?.blocks[0] ?? editor.getTextCursorPosition().block;
  } catch {
    return null;
  }
  if (!block || block.type !== "image" || !block.props.imageId) return null;

  const updateProps = (props: Partial<typeof block.props>) => {
    editor.updateBlock(block, { props });
  };
  const needsAccessibilityChoice =
    !block.props.decorative && !block.props.altText.trim();

  return (
    <fieldset
      className={styles.imageSettings}
      disabled={disabled}
      data-selection-revision={revision}
    >
      <legend>Opciones de la imagen</legend>
      <label>
        Texto alternativo
        <input
          type="text"
          maxLength={300}
          value={block.props.altText}
          disabled={disabled || block.props.decorative}
          aria-invalid={needsAccessibilityChoice}
          placeholder="Describe lo importante de la imagen"
          onChange={(event) =>
            updateProps({ altText: event.target.value, decorative: false })
          }
        />
      </label>
      <label className={styles.decorativeChoice}>
        <input
          type="checkbox"
          checked={block.props.decorative}
          onChange={(event) =>
            updateProps({
              decorative: event.target.checked,
              altText: event.target.checked ? "" : block.props.altText,
            })
          }
        />
        Es decorativa
      </label>
      <label>
        Leyenda <span>(opcional)</span>
        <input
          type="text"
          maxLength={500}
          value={block.props.caption}
          placeholder="Texto visible debajo de la imagen"
          onChange={(event) => updateProps({ caption: event.target.value })}
        />
      </label>
      <label>
        Alineación
        <select
          value={block.props.textAlignment}
          onChange={(event) =>
            updateProps({
              textAlignment: event.target.value as "left" | "center" | "right",
            })
          }
        >
          <option value="left">Izquierda</option>
          <option value="center">Centro</option>
          <option value="right">Derecha</option>
        </select>
      </label>
      <label>
        Ancho
        <select
          value={block.props.previewWidth}
          onChange={(event) => updateProps({ previewWidth: Number(event.target.value) })}
        >
          <option value={360}>Pequeño</option>
          <option value={560}>Mediano</option>
          <option value={720}>Grande</option>
          <option value={1200}>Ancho completo</option>
        </select>
      </label>
      {needsAccessibilityChoice ? (
        <p role="alert">Describe la imagen o márcala como decorativa.</p>
      ) : null}
    </fieldset>
  );
}

export type ResourceImageUploadContext = {
  editorSessionId: string;
  moduleId?: string;
  resourceId?: string;
};

export default function ResourceDocumentEditor({
  initialValue,
  imageUploadContext,
  disabled = false,
  describedBy,
  invalid = false,
  onChange,
}: {
  initialValue: string | null | undefined;
  imageUploadContext?: ResourceImageUploadContext;
  disabled?: boolean;
  describedBy?: string;
  invalid?: boolean;
  onChange: (serialized: string, error: string | null) => void;
}) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [serialized, setSerialized] = useState(() => initialSerializedContent(initialValue));
  const [validationError, setValidationError] = useState<string | null>(() =>
    parseResourceContent(initialValue).kind === "invalid"
      ? "El contenido existente no tiene un formato compatible."
      : null,
  );
  const normalizingPaste = useRef(false);
  const { resolvedTheme } = useTheme();
  const [selectionRevision, setSelectionRevision] = useState(0);
  const [stableInitialBlocks] = useState(() => initialBlocks(initialValue));
  const imageUploadContextRef = useRef(imageUploadContext);
  useEffect(() => {
    imageUploadContextRef.current = imageUploadContext;
  }, [imageUploadContext]);
  const editor = useCreateBlockNote({
    schema: resourceEditorSchema,
    extensions: [syntaxHighlighter],
    initialContent: stableInitialBlocks,
    dictionary,
    tabBehavior: "prefer-navigate-ui",
    links: { isValidLink: isSafeWebUrl },
    pasteHandler: ({ defaultPasteHandler }) =>
      defaultPasteHandler({ prioritizeMarkdownOverHTML: false, plainTextAsMarkdown: false }),
    tables: { headers: true, splitCells: true },
    uploadFile: async (file) => {
      const context = imageUploadContextRef.current;
      if (!context) {
        throw new Error("La carga de imágenes no está disponible aquí.");
      }
      if (!context.resourceId && !context.moduleId) {
        throw new Error("Selecciona primero el módulo del contenido.");
      }
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size <= 0 ||
        file.size > 10 * 1024 * 1024
      ) {
        throw new Error("Solo se admiten imágenes JPEG, PNG o WebP de hasta 10 MiB.");
      }

      const intentResponse = await fetch("/api/content-images/intents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...context,
          originalName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });
      const intent = (await intentResponse.json()) as {
        imageId?: string;
        uploadUrl?: string;
        message?: string;
      };
      if (!intentResponse.ok || !intent.imageId || !intent.uploadUrl) {
        throw new Error(intent.message ?? "No se pudo preparar la imagen.");
      }

      const uploadResponse = await fetch(intent.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error("No se pudo subir la imagen a R2.");
      }

      const confirmationResponse = await fetch(
        `/api/content-images/${encodeURIComponent(intent.imageId)}/confirm`,
        { method: "POST" },
      );
      const confirmation = (await confirmationResponse.json()) as {
        state?: string;
        imageId?: string;
        message?: string;
      };
      if (
        !confirmationResponse.ok ||
        confirmation.state !== "CONFIRMED" ||
        !confirmation.imageId
      ) {
        throw new Error(confirmation.message ?? "No se pudo confirmar la imagen.");
      }

      return {
        props: {
          imageId: confirmation.imageId,
          altText: "",
          decorative: false,
          caption: "",
          textAlignment: "center",
          previewWidth: 720,
        },
      };
    },
  });

  const publishDocument = useCallback(() => {
    try {
      const document = normalizeResourceDocument(editor.document);
      const nextSerialized = isResourceDocumentSemanticallyEmpty(document)
        ? ""
        : serializeResourceDocument(document);
      setSerialized(nextSerialized);
      setValidationError(null);
      onChange(nextSerialized, null);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "El documento educativo no tiene un formato válido.";
      setValidationError(message);
      onChange(serialized, message);
    }
  }, [editor, onChange, serialized]);

  const normalizePaste = () => {
    window.setTimeout(() => {
      if (normalizingPaste.current) return;
      try {
        const document = normalizeResourceDocument(editor.document);
        if (JSON.stringify(editor.document) !== JSON.stringify(document.blocks)) {
          normalizingPaste.current = true;
          editor.replaceBlocks(editor.document, document.blocks as unknown as Parameters<ResourceEditor["replaceBlocks"]>[1]);
          normalizingPaste.current = false;
        }
        publishDocument();
      } catch (error) {
        const message = (error as ResourceDocumentValidationError).message ?? "No se pudo normalizar el contenido pegado.";
        setValidationError(message);
        onChange(serialized, message);
      }
    }, 0);
  };

  return (
    <div className={styles.shell} aria-invalid={invalid || Boolean(validationError)} aria-describedby={describedBy}>
      <div className={styles.header}>
        <div className={styles.tabs} role="tablist" aria-label="Modo del contenido">
          <button type="button" role="tab" aria-selected={mode === "edit"} onClick={() => setMode("edit")} className={`${styles.tab} ${mode === "edit" ? styles.tabActive : ""}`}>Editar</button>
          <button type="button" role="tab" aria-selected={mode === "preview"} onClick={() => setMode("preview")} className={`${styles.tab} ${mode === "preview" ? styles.tabActive : ""}`}>Vista previa</button>
        </div>
        <p className={styles.pasteHint}>Puedes pegar contenido desde Word o Google Docs</p>
      </div>
      <div className={mode === "edit" ? undefined : styles.hidden} aria-hidden={mode !== "edit"}>
        <StaticToolbar editor={editor} disabled={disabled} />
        <ImageSettings
          editor={editor}
          disabled={disabled}
          revision={selectionRevision}
        />
        <div className={styles.editorPane} onPaste={normalizePaste}>
          <BlockNoteView
            editor={editor}
            theme={resolvedTheme === "dark" ? "dark" : "light"}
            editable={!disabled}
            formattingToolbar={false}
            slashMenu={false}
            sideMenu={false}
            filePanel={false}
            emojiPicker
            comments={false}
            onChange={publishDocument}
            onSelectionChange={() => setSelectionRevision((revision) => revision + 1)}
          >
            <SideMenuController sideMenu={RightOpeningSideMenu} />
            <SuggestionMenuController
              triggerCharacter="/"
              getItems={async (query) => filterSuggestionItems(getSlashMenuItems(editor), query)}
            />
          </BlockNoteView>
        </div>
      </div>
      <div className={mode === "preview" ? styles.preview : styles.hidden} role="tabpanel" aria-hidden={mode !== "preview"}>
        <ResourceContentRenderer
          content={serialized}
          emptyFallback={<p className={styles.previewEmpty}>La vista previa aparecerá cuando agregues contenido.</p>}
        />
      </div>
      {validationError ? <p role="alert" className={styles.error}>{validationError}</p> : null}
    </div>
  );
}
