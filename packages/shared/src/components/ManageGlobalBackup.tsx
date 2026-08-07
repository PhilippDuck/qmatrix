/**
 * Disaster-recovery for Manage — Full-style 3-card layout:
 * Backup | Datenabgleich | Wiederherstellen
 */
import React, { useRef, useState } from "react";
import {
  Title,
  Group,
  Button,
  Stack,
  Card,
  Text,
  Alert,
  List,
  SimpleGrid,
  Box,
  Modal,
  ScrollArea,
  Badge,
  Table,
  ThemeIcon,
} from "@mantine/core";
import {
  IconDownload,
  IconUpload,
  IconGitMerge,
  IconInfoCircle,
  IconPlus,
  IconTrash,
  IconEdit,
} from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import { useStore, useShallow } from "../store/hooks";
import {
  validateManageBackup,
  type ManageBackupPackage,
} from "../services/manageBackup";
import {
  diffCatalogEntities,
  summarizeDiffCounts,
  type CatalogDiffResult,
} from "../services/catalogDiff";
import type { CatalogEntities } from "../types/catalog";

const KIND_LABEL: Record<string, string> = {
  categories: "Kategorie",
  subcategories: "Unterkategorie",
  skills: "Skill",
  roles: "Rolle",
};

const CHANGE_META: Record<string, { label: string; color: string }> = {
  added: { label: "Nur im Backup", color: "green" },
  removed: { label: "Nur lokal", color: "red" },
  changed: { label: "Unterschiedlich", color: "blue" },
};

function liveAsCatalogEntities(state: {
  categories: { id?: string }[];
  subcategories: { id?: string }[];
  skills: { id?: string }[];
  roles: { id?: string }[];
}): CatalogEntities {
  return {
    categories: state.categories as CatalogEntities["categories"],
    subcategories: state.subcategories as CatalogEntities["subcategories"],
    skills: state.skills as CatalogEntities["skills"],
    roles: state.roles as CatalogEntities["roles"],
  };
}

function backupAsCatalogEntities(pkg: ManageBackupPackage): CatalogEntities {
  const d = pkg.data;
  return {
    categories: (d.categories || []) as CatalogEntities["categories"],
    subcategories: (d.subcategories || []) as CatalogEntities["subcategories"],
    skills: (d.skills || []) as CatalogEntities["skills"],
    roles: (d.roles || []) as CatalogEntities["roles"],
  };
}

export const ManageGlobalBackup: React.FC = () => {
  const mergeInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [diffOpened, { open: openDiff, close: closeDiff }] = useDisclosure(false);
  const [compareDiff, setCompareDiff] = useState<CatalogDiffResult | null>(null);
  const [comparePkg, setComparePkg] = useState<ManageBackupPackage | null>(null);
  const [compareLabel, setCompareLabel] = useState("");

  const {
    exportManageBackup,
    importManageBackup,
    storedCatalogReleases,
    categories,
    subcategories,
    skills,
    roles,
  } = useStore(
    useShallow((s) => ({
      exportManageBackup: s.exportManageBackup,
      importManageBackup: s.importManageBackup,
      storedCatalogReleases: s.storedCatalogReleases,
      categories: s.categories,
      subcategories: s.subcategories,
      skills: s.skills,
      roles: s.roles,
    }))
  );

  const handleExport = async () => {
    setBusy(true);
    try {
      await exportManageBackup();
      notifications.show({
        title: "Backup erstellt",
        message:
          "JSON heruntergeladen. Bitte sicher ablegen (OneDrive, Git, …).",
        color: "green",
      });
    } catch (e) {
      notifications.show({
        title: "Backup fehlgeschlagen",
        message: e instanceof Error ? e.message : String(e),
        color: "red",
      });
    } finally {
      setBusy(false);
    }
  };

  const confirmRestore = (file: File | null, title: string) => {
    if (!file) return;
    modals.openConfirmModal({
      title,
      centered: true,
      children: (
        <Stack gap="sm">
          <Text size="sm">
            Der <strong>komplette</strong> Manage-Stand wird überschrieben:
          </Text>
          <List size="sm" spacing={4}>
            <List.Item>Live-Katalog (Skills, Kategorien, Rollen)</List.Item>
            <List.Item>
              Archiv der freigegebenen Versionen (bis 10 Snapshots)
            </List.Item>
            <List.Item>Einstellungen / Versions-Meta</List.Item>
          </List>
          <Text size="sm" c="red">
            Aktuelle lokale Daten gehen verloren, sofern sie nicht zuvor
            exportiert wurden.
          </Text>
        </Stack>
      ),
      labels: { confirm: "Wiederherstellen", cancel: "Abbrechen" },
      confirmProps: { color: "orange" },
      onConfirm: async () => {
        setBusy(true);
        try {
          const text = await file.text();
          await importManageBackup(text);
          notifications.show({
            title: "Backup wiederhergestellt",
            message: "Katalog und Versionsarchiv wurden geladen.",
            color: "green",
          });
          closeDiff();
          setTimeout(() => window.location.reload(), 800);
        } catch (e) {
          notifications.show({
            title: "Wiederherstellung fehlgeschlagen",
            message: e instanceof Error ? e.message : String(e),
            color: "red",
          });
        } finally {
          setBusy(false);
          if (restoreInputRef.current) restoreInputRef.current.value = "";
          if (mergeInputRef.current) mergeInputRef.current.value = "";
        }
      },
    });
  };

  const handleCompare = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const raw = JSON.parse(await file.text());
      const validation = validateManageBackup(raw);
      if (!validation.ok || !validation.package) {
        notifications.show({
          title: "Kein Manage-Backup",
          message: validation.errors.join("; ") || "Ungültige Datei",
          color: "red",
        });
        return;
      }
      const pkg = validation.package;
      const live = liveAsCatalogEntities({
        categories,
        subcategories,
        skills,
        roles,
      });
      // Diff: Backup vs lokal — "added" = im Backup, nicht lokal; "removed" = lokal, nicht im Backup
      const diff = diffCatalogEntities(backupAsCatalogEntities(pkg), live);
      setCompareDiff(diff);
      setComparePkg(pkg);
      setCompareLabel(
        pkg.label ||
          file.name ||
          `Backup ${pkg.exportedAt?.slice(0, 16) || ""}`
      );
      openDiff();
    } catch (e) {
      notifications.show({
        title: "Abgleich fehlgeschlagen",
        message: e instanceof Error ? e.message : String(e),
        color: "red",
      });
    } finally {
      setBusy(false);
      if (mergeInputRef.current) mergeInputRef.current.value = "";
    }
  };

  const counts = compareDiff ? summarizeDiffCounts(compareDiff) : null;

  return (
    <Stack gap="lg">
      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
        <Text size="xs">
          Aktuell: <strong>{categories.length}</strong> Kategorien,{" "}
          <strong>{skills.length}</strong> Skills,{" "}
          <strong>{roles.length}</strong> Rollen,{" "}
          <strong>{storedCatalogReleases?.length ?? 0}</strong> gespeicherte
          Versionen im Archiv. Globales Backup sichert den gesamten Manage-Stand
          (unabhängig von einzelnen Katalog-Releases).
        </Text>
      </Alert>

      {/* Same card grid as Full DataManagement */}
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
        <Card withBorder shadow="sm" radius="md">
          <Stack gap="md" h="100%" justify="space-between">
            <Box>
              <Group gap="xs" mb="sm">
                <IconDownload
                  size={20}
                  style={{ color: "var(--mantine-color-blue-filled)" }}
                />
                <Title order={4}>Backup</Title>
              </Group>
              <Text size="xs" c="dimmed">
                Exportiere den kompletten Manage-Stand (Live-Katalog,
                Versionsarchiv und Einstellungen) als JSON-Datei.
              </Text>
            </Box>
            <Button
              leftSection={<IconDownload size={16} />}
              onClick={handleExport}
              loading={busy}
              variant="light"
              color="blue"
            >
              Export starten
            </Button>
          </Stack>
        </Card>

        <Card withBorder shadow="sm" radius="md">
          <Stack gap="md" h="100%" justify="space-between">
            <Box>
              <Group gap="xs" mb="sm">
                <IconGitMerge
                  size={20}
                  style={{ color: "var(--mantine-color-grape-filled)" }}
                />
                <Title order={4}>Datenabgleich</Title>
              </Group>
              <Text size="xs" c="dimmed">
                Vergleicht ein globales Manage-Backup mit dem aktuellen Katalog.
                Zeigt, was nur lokal, nur im Backup oder unterschiedlich ist.
              </Text>
            </Box>
            <Button
              leftSection={<IconGitMerge size={16} />}
              onClick={() => mergeInputRef.current?.click()}
              variant="light"
              color="grape"
              loading={busy}
            >
              Abgleich starten
            </Button>
            <input
              type="file"
              ref={mergeInputRef}
              onChange={(e) =>
                handleCompare(e.target.files ? e.target.files[0] : null)
              }
              style={{ display: "none" }}
              accept=".json,application/json"
            />
          </Stack>
        </Card>

        <Card withBorder shadow="sm" radius="md">
          <Stack gap="md" h="100%" justify="space-between">
            <Box>
              <Group gap="xs" mb="sm">
                <IconUpload
                  size={20}
                  style={{ color: "var(--mantine-color-orange-filled)" }}
                />
                <Title order={4}>Wiederherstellen</Title>
              </Group>
              <Text size="xs" c="dimmed">
                Lade ein Manage-Backup hoch. Bestehende lokale Daten werden
                vollständig überschrieben (Katalog + Versionsarchiv).
              </Text>
            </Box>
            <Button
              leftSection={<IconUpload size={16} />}
              onClick={() => restoreInputRef.current?.click()}
              variant="light"
              color="orange"
              loading={busy}
            >
              Überschreiben
            </Button>
            <input
              type="file"
              ref={restoreInputRef}
              onChange={(e) =>
                confirmRestore(
                  e.target.files ? e.target.files[0] : null,
                  "Globales Backup wiederherstellen?"
                )
              }
              style={{ display: "none" }}
              accept=".json,application/json"
            />
          </Stack>
        </Card>
      </SimpleGrid>

      <Text size="xs" c="dimmed">
        Tipp: Nach wichtigen Releases zusätzlich das globale Backup an einem
        sicheren Ort ablegen (nicht nur im Browser). Schnellbackup auch über das
        Disketten-Symbol oben rechts.
      </Text>

      {/* Compare result — Full-style modal */}
      <Modal
        opened={diffOpened}
        onClose={closeDiff}
        title="Datenabgleich"
        size="90%"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Vergleich von <strong>{compareLabel}</strong> mit dem aktuellen
            Live-Katalog
            {comparePkg?.exportedAt
              ? ` (Backup vom ${new Date(comparePkg.exportedAt).toLocaleString("de-DE")})`
              : ""}
            .
          </Text>

          {counts && (
            <Group gap="xs">
              <Badge color="green" variant="light">
                +{counts.added} nur im Backup
              </Badge>
              <Badge color="red" variant="light">
                −{counts.removed} nur lokal
              </Badge>
              <Badge color="blue" variant="light">
                {counts.changed} unterschiedlich
              </Badge>
              <Text size="xs" c="dimmed">
                {counts.total} Unterschiede · Archiv im Backup:{" "}
                {comparePkg?.data.catalogReleases?.length ?? 0} Versionen
              </Text>
            </Group>
          )}

          <ScrollArea h={400} offsetScrollbars>
            <Table withColumnBorders verticalSpacing="xs" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 40 }} />
                  <Table.Th>Element</Table.Th>
                  <Table.Th style={{ width: 160 }}>Status</Table.Th>
                  <Table.Th>Art</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {!compareDiff || compareDiff.items.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={4} align="center">
                      <Text size="sm" c="dimmed" py="md">
                        Keine Katalog-Unterschiede — Live entspricht dem Backup
                        (Katalog-Teil).
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  compareDiff.items.map((item) => {
                    const meta = CHANGE_META[item.change] || CHANGE_META.changed;
                    const Icon =
                      item.change === "added"
                        ? IconPlus
                        : item.change === "removed"
                          ? IconTrash
                          : IconEdit;
                    return (
                      <Table.Tr key={`${item.kind}-${item.id}-${item.change}`}>
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
                          <Badge color={meta.color} size="sm">
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

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={closeDiff}>
              Schließen
            </Button>
            <Button
              color="orange"
              leftSection={<IconUpload size={16} />}
              loading={busy}
              disabled={!comparePkg}
              onClick={() => {
                if (!comparePkg) return;
                // Re-serialize package for import path
                const blob = new Blob([JSON.stringify(comparePkg, null, 2)], {
                  type: "application/json",
                });
                const file = new File(
                  [blob],
                  "manage-backup-restore.json",
                  { type: "application/json" }
                );
                confirmRestore(
                  file,
                  "Backup aus Abgleich vollständig wiederherstellen?"
                );
              }}
            >
              Backup wiederherstellen
            </Button>
          </Group>
        </Stack>
      </Modal>

    </Stack>
  );
};
