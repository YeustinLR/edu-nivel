"use client";

import {
  BlockNoteSchema,
  defaultBlockSpecs,
  type PartialBlock,
} from "@blocknote/core";
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
  Table2,
  TriangleAlert,
  Underline,
  Undo2,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
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

const resourceEditorSchema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
    heading: defaultBlockSpecs.heading,
    bulletListItem: defaultBlockSpecs.bulletListItem,
    numberedListItem: defaultBlockSpecs.numberedListItem,
    quote: defaultBlockSpecs.quote,
    divider: defaultBlockSpecs.divider,
    table: defaultBlockSpecs.table,
    eduCallout: createEduCallout(),
  },
});

type ResourceEditor = typeof resourceEditorSchema.BlockNoteEditor;

const dictionary = {
  ...es,
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
  return [...basics, ...callouts];
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
      editor.updateBlock(currentBlock, { type: type as "paragraph" | "bulletListItem" | "numberedListItem" | "quote" });
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

export default function ResourceDocumentEditor({
  initialValue,
  disabled = false,
  describedBy,
  invalid = false,
  onChange,
}: {
  initialValue: string | null | undefined;
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
  const [, setSelectionRevision] = useState(0);
  const [stableInitialBlocks] = useState(() => initialBlocks(initialValue));
  const editor = useCreateBlockNote({
    schema: resourceEditorSchema,
    initialContent: stableInitialBlocks,
    dictionary,
    tabBehavior: "prefer-navigate-ui",
    links: { isValidLink: isSafeWebUrl },
    pasteHandler: ({ defaultPasteHandler }) =>
      defaultPasteHandler({ prioritizeMarkdownOverHTML: false, plainTextAsMarkdown: false }),
    tables: { headers: true, splitCells: true },
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
