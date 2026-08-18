/**
 * Import catalog / skills / roles as an interactive merge (select what to take).
 */
import React, { useRef, useState } from "react";
import {
  Title,
  Group,
  Button,
  Stack,
  Card,
  Text,
  Box,
  Modal,
  ScrollArea,
  Badge,
  Table,
  Checkbox,
  ThemeIcon,
  Alert,
  Textarea,
  Menu,
  Accordion,
  Code,
} from "@mantine/core";
import {
  IconPackageImport,
  IconPlus,
  IconTrash,
  IconEdit,
  IconInfoCircle,
  IconChevronDown,
  IconFileUpload,
  IconClipboardText,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useStore, useShallow, useAppStoreApi } from "../store/hooks";
import {
  summarizeDiffCounts,
  type CatalogDiffItem,
  type CatalogDiffResult,
} from "../services/catalogDiff";
import { diffCatalogEntities } from "../services/catalogDiff";
import {
  buildSelectiveMergePackage,
  selectionKey,
} from "../services/catalogMerge";
import {
  parseExternalCatalogImport,
  scopeKinds,
  type CatalogMergeScope,
  type ExternalImportMode,
} from "../services/catalogExternalImport";
import type { CatalogEntities, CatalogPackage } from "../types/catalog";
import type { CatalogEntityKind } from "../types/catalog";
import { useCatalogAuthoring } from "../hooks/useCatalogAuthoring";

/** Formats the paste parser actually accepts — shown as copyable examples. */
const SKILL_EXAMPLE_MARKDOWN = `## Technik
### Backend
- Node.js
- PostgreSQL

### Frontend
- React
`;

const SKILL_EXAMPLE_LIST = `Kubernetes
Terraform
Observability
`;

const ROLE_EXAMPLE_MARKDOWN = `## Entwickler
- React (75)
- TypeScript (50)

## Senior Entwickler
_Erbt von: Entwickler_
- Architektur (100)
`;

const ROLE_EXAMPLE_LIST = `Product Owner
Scrum Master
`;

const KIND_LABEL: Record<string, string> = {
  categories: "Kategorie",
  subcategories: "Unterkategorie",
  skills: "Skill",
  roles: "Rolle",
};

const CHANGE_META: Record<
  string,
  { label: string; suggestionLabel: string; color: string; icon: React.ElementType }
> = {
  added: {
    label: "Neu im Import",
    suggestionLabel: "Vorschlag (neu)",
    color: "green",
    icon: IconPlus,
  },
  changed: {
    label: "Import aktualisiert",
    suggestionLabel: "Vorschlag (Änderung)",
    color: "blue",
    icon: IconEdit,
  },
  removed: {
    label: "Nur lokal (nicht im Import)",
    suggestionLabel: "Nur lokal",
    color: "red",
    icon: IconTrash,
  },
};

function liveEntities(state: {
  categories: unknown[];
  subcategories: unknown[];
  skills: unknown[];
  roles: unknown[];
}): CatalogEntities {
  return {
    categories: state.categories as CatalogEntities["categories"],
    subcategories: state.subcategories as CatalogEntities["subcategories"],
    skills: state.skills as CatalogEntities["skills"],
    roles: state.roles as CatalogEntities["roles"],
  };
}

export interface CatalogMergeImportProps {
  /** Card on the system/release page, or compact toolbar control. */
  variant?: "card" | "toolbar";
  /** Limit visible kinds (skills page vs roles page). */
  scope?: CatalogMergeScope;
  buttonLabel?: string;
}

export const CatalogMergeImport: React.FC<CatalogMergeImportProps> = ({
  variant = "card",
  scope = "all",
  buttonLabel,
}) => {
  const catalogAuthoring = useCatalogAuthoring();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [opened, { open, close }] = useDisclosure(false);
  const [pasteOpened, { open: openPaste, close: closePaste }] = useDisclosure(false);
  const [pasteText, setPasteText] = useState("");
  const [sourcePkg, setSourcePkg] = useState<CatalogPackage | null>(null);
  const [diff, setDiff] = useState<CatalogDiffResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [fileLabel, setFileLabel] = useState("");
  const [importMode, setImportMode] = useState<ExternalImportMode>("snapshot");
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  const storeApi = useAppStoreApi();

  const {
    categories,
    subcategories,
    skills,
    roles,
    importCatalog,
    refreshCatalogDirtyState,
    refreshAllData,
  } = useStore(
    useShallow((s) => ({
      categories: s.categories,
      subcategories: s.subcategories,
      skills: s.skills,
      roles: s.roles,
      importCatalog: s.importCatalog,
      refreshCatalogDirtyState: s.refreshCatalogDirtyState,
      refreshAllData: s.refreshAllData,
    }))
  );

  if (!catalogAuthoring) return null;

  const live = liveEntities({
    categories,
    subcategories,
    skills,
    roles,
  });

  const openFromParsed = (
    parsed: ReturnType<typeof parseExternalCatalogImport>,
    label: string
  ) => {
    if (!parsed.ok) {
      notifications.show({
        title: "Import nicht möglich",
        message: parsed.errors.join("; "),
        color: "red",
      });
      return;
    }

    const allowed = new Set(scopeKinds(scope));
    const kinds = parsed.includedKinds.filter((k) => allowed.has(k));
    const d = diffCatalogEntities(parsed.package.entities, live);
    const visibleItems =
      parsed.mode === "suggestions"
        ? d.items.filter(
            (i) =>
              kinds.includes(i.kind) &&
              (i.change === "added" || i.change === "changed")
          )
        : d.items.filter((i) => kinds.includes(i.kind));

    const summary: CatalogDiffResult["summary"] = {
      categories: { added: 0, removed: 0, changed: 0 },
      subcategories: { added: 0, removed: 0, changed: 0 },
      skills: { added: 0, removed: 0, changed: 0 },
      roles: { added: 0, removed: 0, changed: 0 },
    };
    for (const item of visibleItems) {
      summary[item.kind][item.change]++;
    }

    const filtered: CatalogDiffResult = {
      items: visibleItems,
      summary,
      isIdentical: visibleItems.length === 0,
    };

    setSourcePkg(parsed.package);
    setDiff(filtered);
    setImportMode(parsed.mode);
    setImportWarnings(parsed.warnings);
    setFileLabel(
      `${label}${parsed.sourceLabel ? ` · ${parsed.sourceLabel}` : ""}`
    );
    setSelected(
      visibleItems
        .filter((i) => i.change === "added" || i.change === "changed")
        .map(selectionKey)
    );
    open();

    if (parsed.warnings.length > 0) {
      notifications.show({
        title: "Hinweise zum Import",
        message: parsed.warnings.slice(0, 3).join(" "),
        color: "yellow",
      });
    }
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      let raw: unknown = text;
      try {
        raw = JSON.parse(text);
      } catch {
        raw = text;
      }
      const parsed = parseExternalCatalogImport(raw, live, {
        text,
        scope,
        fileName: file.name,
      });
      openFromParsed(parsed, file.name);
    } catch (e) {
      notifications.show({
        title: "Datei unlesbar",
        message: e instanceof Error ? e.message : String(e),
        color: "red",
      });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handlePasteApply = () => {
    const text = pasteText.trim();
    if (!text) {
      notifications.show({
        title: "Nichts eingefügt",
        message: "Bitte JSON, Markdown oder eine Namensliste einfügen.",
        color: "orange",
      });
      return;
    }
    let raw: unknown = text;
    try {
      raw = JSON.parse(text);
    } catch {
      raw = text;
    }
    const parsed = parseExternalCatalogImport(raw, live, {
      text,
      scope,
      fileName: "Eingefügter Text",
    });
    setPasteText("");
    closePaste();
    openFromParsed(parsed, "Eingefügter Text");
  };

  const toggle = (key: string) => {
    setSelected((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]
    );
  };

  const toggleAll = () => {
    if (!diff) return;
    const all = diff.items.map(selectionKey);
    setSelected((cur) => (cur.length === all.length ? [] : all));
  };

  const applySelection = async () => {
    if (!sourcePkg || !diff) return;
    const items = diff.items.filter((i) => selected.includes(selectionKey(i)));
    if (items.length === 0) {
      notifications.show({
        title: "Nichts ausgewählt",
        message: "Bitte mindestens eine Änderung auswählen.",
        color: "orange",
      });
      return;
    }

    setBusy(true);
    try {
      const { package: partialPkg, softDeprecate } = buildSelectiveMergePackage(
        sourcePkg,
        items
      );

      const hasUpserts =
        partialPkg.entities.categories.length +
          partialPkg.entities.subcategories.length +
          partialPkg.entities.skills.length +
          partialPkg.entities.roles.length >
        0;

      if (hasUpserts) {
        const result = await importCatalog(partialPkg, {
          missingPolicy: "keep",
          allowDowngrade: true,
          allowCatalogIdChange: true,
          updateInstalledMeta: false,
        });
        if (!result.ok) {
          notifications.show({
            title: "Merge fehlgeschlagen",
            message: result.errors.map((e) => e.message).join("; "),
            color: "red",
          });
          return;
        }
      }

      if (importMode === "snapshot" && softDeprecate.length > 0) {
        await applySoftDeprecations(softDeprecate);
      }

      await refreshAllData();
      await refreshCatalogDirtyState();
      close();
      notifications.show({
        title:
          importMode === "suggestions"
            ? "Vorschläge übernommen"
            : "Merge übernommen",
        message: `${items.length} Auswahl(en) verarbeitet.`,
        color: "green",
      });
    } catch (e) {
      notifications.show({
        title: "Fehler",
        message: e instanceof Error ? e.message : String(e),
        color: "red",
      });
    } finally {
      setBusy(false);
    }
  };

  const applySoftDeprecations = async (
    items: { kind: CatalogEntityKind; id: string }[]
  ) => {
    const state = storeApi.getState();
    for (const { kind, id } of items) {
      if (kind === "categories") {
        const cat = state.categories.find((c) => c.id === id);
        if (cat) {
          const { id: _id, ...rest } = cat;
          await state.updateCategory(id, {
            ...rest,
            catalogDeprecated: true,
          });
        }
      } else if (kind === "subcategories") {
        const sub = state.subcategories.find((s) => s.id === id);
        if (sub) {
          const { id: _id, ...rest } = sub;
          await state.updateSubCategory(id, {
            ...rest,
            catalogDeprecated: true,
          });
        }
      } else if (kind === "skills") {
        const skill = state.skills.find((s) => s.id === id);
        if (skill) {
          const { id: _id, ...rest } = skill;
          await state.updateSkill(id, {
            ...rest,
            catalogDeprecated: true,
          });
        }
      } else if (kind === "roles") {
        const role = state.roles.find((r) => r.id === id);
        if (role) {
          const { id: _id, ...rest } = role;
          await state.updateRole(id, {
            ...rest,
            catalogDeprecated: true,
          });
        }
      }
    }
  };

  const counts = diff ? summarizeDiffCounts(diff) : null;
  const allKeys = diff?.items.map(selectionKey) ?? [];

  const scopeHint =
    scope === "skills"
      ? "Kategorien, Bereiche und Skills"
      : scope === "roles"
        ? "Rollen (Skill-Zuordnungen werden mit übernommen, wenn die Skills lokal existieren)"
        : "Kategorien, Skills und Rollen";

  const defaultLabel =
    buttonLabel ||
    (scope === "roles"
      ? "Rollen importieren"
      : scope === "skills"
        ? "Skills importieren"
        : "Katalog-Datei wählen…");

  const trigger = (
    <>
      <Menu shadow="md" width={300} position="bottom-end">
        <Menu.Target>
          <Button
            leftSection={<IconPackageImport size={16} />}
            rightSection={variant === "toolbar" ? <IconChevronDown size={14} /> : undefined}
            variant="light"
            color="teal"
            size={variant === "toolbar" ? "sm" : "sm"}
            loading={busy}
          >
            {defaultLabel}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconFileUpload size={16} />}
            onClick={() => fileRef.current?.click()}
          >
            Datei wählen…
            <Text size="xs" c="dimmed">
              JSON, Markdown oder Textdatei
            </Text>
          </Menu.Item>
          <Menu.Item
            leftSection={<IconClipboardText size={16} />}
            onClick={openPaste}
          >
            Text einfügen…
            <Text size="xs" c="dimmed">
              Vorschläge aus Chat, Mail oder Notizen
            </Text>
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <input
        ref={fileRef}
        type="file"
        accept=".json,.md,.txt,application/json,text/markdown,text/plain"
        style={{ display: "none" }}
        onChange={(e) =>
          handleFile(e.target.files ? e.target.files[0] : null)
        }
      />
    </>
  );

  return (
    <>
      {variant === "card" ? (
        <Card withBorder shadow="sm" radius="md">
          <Stack gap="md" justify="space-between">
            <Box>
              <Group gap="xs" mb="sm">
                <IconPackageImport
                  size={20}
                  style={{ color: "var(--mantine-color-teal-filled)" }}
                />
                <Title order={4}>Katalog importieren</Title>
              </Group>
              <Text size="xs" c="dimmed">
                Importiert immer als <strong>Merge</strong> mit Auswahl. Unterstützte
                Dateien: Katalog-JSON, Skills-/Rollen-Export, Full-Backup,
                Manage-Backup, Markdown-Struktur oder eine Namensliste.{" "}
                <strong>Import-Versionen werden ignoriert</strong> — Versionen vergibt
                nur Manage. Nichts wird ohne Auswahl übernommen.
              </Text>
            </Box>
            <Group>{trigger}</Group>
          </Stack>
        </Card>
      ) : (
        trigger
      )}

      <Modal
        opened={pasteOpened}
        onClose={closePaste}
        title="Vorschläge einfügen"
        size="lg"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Exportierte Dateien kannst du 1:1 wieder einspielen. Für Chat-, Mail-
            oder Notiz-Vorschläge reicht Markdown oder eine Namensliste.
            Betrifft: {scopeHint}.
          </Text>

          <Accordion variant="contained" radius="md">
            {scope !== "roles" && (
              <Accordion.Item value="skills-md">
                <Accordion.Control>
                  <Text size="sm" fw={500}>
                    Markdown — Kategorien & Skills
                  </Text>
                  <Text size="xs" c="dimmed">
                    ## Kategorie · ### Bereich · - Skill
                  </Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    <Code block style={{ whiteSpace: "pre" }}>
                      {SKILL_EXAMPLE_MARKDOWN}
                    </Code>
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() => setPasteText(SKILL_EXAMPLE_MARKDOWN)}
                    >
                      Beispiel übernehmen
                    </Button>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            )}
            {scope !== "skills" && (
              <Accordion.Item value="roles-md">
                <Accordion.Control>
                  <Text size="sm" fw={500}>
                    Markdown — Rollen
                  </Text>
                  <Text size="xs" c="dimmed">
                    ## Rolle · optional _Erbt von_ · - Skill (Level)
                  </Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    <Code block style={{ whiteSpace: "pre" }}>
                      {ROLE_EXAMPLE_MARKDOWN}
                    </Code>
                    <Text size="xs" c="dimmed">
                      Level: 0, 25, 50, 75, 100 oder Titel wie „Anwender“.
                      Skills müssen lokal schon existieren, sonst wird nur die
                      Rolle vorgeschlagen.
                    </Text>
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() => setPasteText(ROLE_EXAMPLE_MARKDOWN)}
                    >
                      Beispiel übernehmen
                    </Button>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            )}
            <Accordion.Item value="list">
              <Accordion.Control>
                <Text size="sm" fw={500}>
                  Namensliste
                </Text>
                <Text size="xs" c="dimmed">
                  {scope === "roles"
                    ? "Eine Rolle pro Zeile"
                    : "Ein Skill pro Zeile — landet unter „Importierte Vorschläge“"}
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  <Code block style={{ whiteSpace: "pre" }}>
                    {scope === "roles" ? ROLE_EXAMPLE_LIST : SKILL_EXAMPLE_LIST}
                  </Code>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() =>
                      setPasteText(
                        scope === "roles" ? ROLE_EXAMPLE_LIST : SKILL_EXAMPLE_LIST
                      )
                    }
                  >
                    Beispiel übernehmen
                  </Button>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="json">
              <Accordion.Control>
                <Text size="sm" fw={500}>
                  JSON-Export
                </Text>
                <Text size="xs" c="dimmed">
                  Datei aus „Exportieren“ — kein Abtippen nötig
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="xs">
                  Nutze <strong>Datei wählen</strong> und die JSON aus dem
                  Export-Menü (Skills-Hierarchie, Rollen oder Katalog-Paket).
                  IDs werden übernommen; gleiche Namen mergen mit dem Bestand.
                </Text>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <Textarea
            label="Inhalt"
            description="Eigenen Text einfügen oder oben ein Beispiel übernehmen"
            autosize
            minRows={8}
            maxRows={18}
            value={pasteText}
            onChange={(e) => setPasteText(e.currentTarget.value)}
            placeholder={
              scope === "roles" ? ROLE_EXAMPLE_MARKDOWN : SKILL_EXAMPLE_MARKDOWN
            }
            styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)" } }}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closePaste}>
              Abbrechen
            </Button>
            <Button color="teal" onClick={handlePasteApply}>
              Vorschau
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={opened}
        onClose={close}
        title={
          importMode === "suggestions"
            ? "Vorschläge auswählen"
            : "Merge — Änderungen auswählen"
        }
        size="90%"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Quelle: <strong>{fileLabel}</strong>
          </Text>
          <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
            <Text size="xs">
              {importMode === "suggestions" ? (
                <>
                  Externe Datei als <strong>Vorschläge</strong>: gleiche Namen
                  werden dem bestehenden Eintrag zugeordnet, neue Namen erscheinen
                  als „neu“. Lokale Einträge werden nicht entfernt.
                </>
              ) : (
                <>
                  <strong>Neu / aktualisiert:</strong> Inhalte aus dem Import.{" "}
                  <strong>Nur lokal:</strong> optional als veraltet markieren.
                  Eltern-Kategorien werden bei Skills mitgezogen.
                </>
              )}{" "}
              Die freigegebene <strong>Katalog-Version bleibt unverändert</strong>;
              nach dem Merge in Manage ggf. neu freigeben.
            </Text>
          </Alert>

          {importWarnings.length > 0 && (
            <Alert color="yellow" variant="light">
              <Text size="xs">{importWarnings.slice(0, 5).join(" ")}</Text>
            </Alert>
          )}

          {counts && (
            <Group gap="xs">
              <Badge color="green" variant="light">
                +{counts.added} neu
              </Badge>
              <Badge color="blue" variant="light">
                {counts.changed} aktualisiert
              </Badge>
              {importMode === "snapshot" && (
                <Badge color="red" variant="light">
                  {counts.removed} nur lokal
                </Badge>
              )}
              <Text size="xs" c="dimmed">
                {selected.length} / {allKeys.length} ausgewählt
              </Text>
            </Group>
          )}

          <ScrollArea h={420} offsetScrollbars>
            <Table withColumnBorders verticalSpacing="xs" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 40 }}>
                    <Checkbox
                      checked={
                        allKeys.length > 0 && selected.length === allKeys.length
                      }
                      indeterminate={
                        selected.length > 0 && selected.length < allKeys.length
                      }
                      onChange={toggleAll}
                      aria-label="Alle auswählen"
                    />
                  </Table.Th>
                  <Table.Th style={{ width: 40 }} />
                  <Table.Th>Element</Table.Th>
                  <Table.Th style={{ width: 180 }}>Status</Table.Th>
                  <Table.Th style={{ width: 140 }}>Art</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {!diff || diff.items.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5} align="center">
                      <Text size="sm" c="dimmed" py="md">
                        Keine Unterschiede — der Bestand entspricht bereits dem
                        Import.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  diff.items.map((item: CatalogDiffItem) => {
                    const key = selectionKey(item);
                    const meta = CHANGE_META[item.change] || CHANGE_META.changed;
                    const Icon = meta.icon;
                    return (
                      <Table.Tr key={key}>
                        <Table.Td>
                          <Checkbox
                            checked={selected.includes(key)}
                            onChange={() => toggle(key)}
                          />
                        </Table.Td>
                        <Table.Td>
                          <ThemeIcon
                            size={22}
                            radius="sm"
                            variant="light"
                            color={meta.color}
                          >
                            <Icon size={12} />
                          </ThemeIcon>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {item.label}
                          </Text>
                          {item.detail && (
                            <Text size="xs" c="dimmed">
                              {item.detail}
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Badge size="sm" color={meta.color}>
                            {importMode === "suggestions"
                              ? meta.suggestionLabel
                              : meta.label}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">
                            {KIND_LABEL[item.kind] || item.kind}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          <Group justify="flex-end">
            <Button variant="subtle" onClick={close}>
              Abbrechen
            </Button>
            <Button
              color="teal"
              loading={busy}
              disabled={selected.length === 0}
              onClick={() => void applySelection()}
            >
              Auswahl übernehmen ({selected.length})
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};
