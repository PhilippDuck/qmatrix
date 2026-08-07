/**
 * Manage: import a catalog package as interactive merge (select what to take).
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
} from "@mantine/core";
import {
  IconPackageImport,
  IconPlus,
  IconTrash,
  IconEdit,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useStore, useShallow, useAppStoreApi } from "../store/hooks";
import {
  diffCatalogEntities,
  summarizeDiffCounts,
  type CatalogDiffItem,
  type CatalogDiffResult,
} from "../services/catalogDiff";
import {
  buildSelectiveMergePackage,
  parseImportAsCatalogPackage,
  selectionKey,
} from "../services/catalogMerge";
import type { CatalogEntities, CatalogPackage } from "../types/catalog";
import type { CatalogEntityKind } from "../types/catalog";

const KIND_LABEL: Record<string, string> = {
  categories: "Kategorie",
  subcategories: "Unterkategorie",
  skills: "Skill",
  roles: "Rolle",
};

const CHANGE_META: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  added: { label: "Neu im Import", color: "green", icon: IconPlus },
  changed: { label: "Import aktualisiert", color: "blue", icon: IconEdit },
  removed: {
    label: "Nur lokal (nicht im Import)",
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

export const CatalogMergeImport: React.FC = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [opened, { open, close }] = useDisclosure(false);
  const [sourcePkg, setSourcePkg] = useState<CatalogPackage | null>(null);
  const [diff, setDiff] = useState<CatalogDiffResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [fileLabel, setFileLabel] = useState("");

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

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const raw = JSON.parse(await file.text());
      const parsed = parseImportAsCatalogPackage(raw);
      if (!parsed.ok) {
        notifications.show({
          title: "Import nicht möglich",
          message: parsed.errors.join("; "),
          color: "red",
        });
        return;
      }
      const pkg = parsed.package;
      const live = liveEntities({
        categories,
        subcategories,
        skills,
        roles,
      });
      // incoming vs live: added = only in import, removed = only local, changed = both
      const d = diffCatalogEntities(pkg.entities, live);
      setSourcePkg(pkg);
      setDiff(d);
      setFileLabel(
        `${file.name} · v${pkg.meta.version}${pkg.meta.name ? ` · ${pkg.meta.name}` : ""}`
      );
      // Pre-select all take-over candidates (added + changed); leave "only local" unchecked
      setSelected(
        d.items
          .filter((i) => i.change === "added" || i.change === "changed")
          .map(selectionKey)
      );
      open();
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

      // Soft-deprecate selected "only local" entities (not in import)
      if (softDeprecate.length > 0) {
        await applySoftDeprecations(softDeprecate);
      }

      await refreshAllData();
      await refreshCatalogDirtyState();
      close();
      notifications.show({
        title: "Katalog-Merge übernommen",
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

  /** Soft-deprecate local entities selected as "only local" (not in import). */
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

  return (
    <>
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
              Importiert eine Katalog-JSON (oder Manage-Backup) immer als{" "}
              <strong>Merge</strong>: Alle Unterschiede werden angezeigt, Sie
              wählen, was übernommen wird. Nichts wird ohne Bestätigung
              überschrieben.
            </Text>
          </Box>
          <Group>
            <Button
              leftSection={<IconPackageImport size={16} />}
              onClick={() => fileRef.current?.click()}
              variant="light"
              color="teal"
              loading={busy}
            >
              Katalog-Datei wählen…
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={(e) =>
                handleFile(e.target.files ? e.target.files[0] : null)
              }
            />
          </Group>
        </Stack>
      </Card>

      <Modal
        opened={opened}
        onClose={close}
        title="Katalog-Merge — Änderungen auswählen"
        size="90%"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Datei: <strong>{fileLabel}</strong>
          </Text>
          <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
            <Text size="xs">
              <strong>Neu / aktualisiert:</strong> wird aus dem Import in den
              Live-Katalog geschrieben.{" "}
              <strong>Nur lokal:</strong> wenn gewählt, wird der lokale Eintrag
              als veraltet markiert (nicht hart gelöscht). Eltern-Kategorien
              werden bei Skills automatisch mitübernommen.
            </Text>
          </Alert>

          {counts && (
            <Group gap="xs">
              <Badge color="green" variant="light">
                +{counts.added} neu
              </Badge>
              <Badge color="blue" variant="light">
                {counts.changed} aktualisiert
              </Badge>
              <Badge color="red" variant="light">
                {counts.removed} nur lokal
              </Badge>
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
                        Keine Unterschiede — Katalog entspricht bereits dem
                        Import.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  diff.items.map((item) => {
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
                            {meta.label}
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
