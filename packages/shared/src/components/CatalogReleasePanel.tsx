/**
 * Manage: version archive (last 10), dirty indicator, diff & rollback.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  Title,
  Group,
  Button,
  Stack,
  Card,
  Text,
  Badge,
  TextInput,
  Textarea,
  SegmentedControl,
  Modal,
  ThemeIcon,
  Alert,
  Code,
  Divider,
  Box,
  Table,
  ScrollArea,
  Tooltip,
  Accordion,
} from "@mantine/core";
import {
  IconRocket,
  IconHistory,
  IconPackageExport,
  IconAlertCircle,
  IconTag,
  IconFingerprint,
  IconGitCompare,
  IconArrowBackUp,
  IconDownload,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { useStore, useShallow } from "../store/hooks";
import {
  bumpSemVer,
  isValidSemVer,
  computeCatalogFingerprint,
  extractCatalogFromState,
  type SemVerBump,
} from "../services/catalog";
import type { CatalogDiffResult } from "../services/catalogDiff";
import { summarizeDiffCounts } from "../services/catalogDiff";
import type { StoredCatalogRelease } from "../services/indexeddb";
import {
  OPEN_PUBLISH_SESSION_KEY,
  UnpublishedCatalogBadge,
} from "./UnpublishedCatalogBadge";

function stableCatalogId(): string {
  const key = "skillgrid-manage-catalog-id";
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** Date + local time for release archive rows. */
function formatReleasePublishedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10) || iso;
  return d.toLocaleString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const KIND_LABEL: Record<string, string> = {
  categories: "Kategorie",
  subcategories: "Unterkategorie",
  skills: "Skill",
  roles: "Rolle",
};

const CHANGE_LABEL: Record<string, { label: string; color: string }> = {
  added: { label: "Neu", color: "green" },
  removed: { label: "Entfernt", color: "red" },
  changed: { label: "Geändert", color: "blue" },
};

export const CatalogReleasePanel: React.FC = () => {
  const {
    projectTitle,
    installedCatalogMeta,
    categories,
    subcategories,
    skills,
    roles,
    storedCatalogReleases,
    hasUnpublishedCatalogChanges,
    publishCatalogRelease,
    refreshCatalogReleases,
    refreshCatalogDirtyState,
    diffAgainstRelease,
    rollbackToRelease,
    redownloadRelease,
  } = useStore(
    useShallow((s) => ({
      projectTitle: s.projectTitle,
      installedCatalogMeta: s.installedCatalogMeta,
      categories: s.categories,
      subcategories: s.subcategories,
      skills: s.skills,
      roles: s.roles,
      storedCatalogReleases: s.storedCatalogReleases,
      hasUnpublishedCatalogChanges: s.hasUnpublishedCatalogChanges,
      publishCatalogRelease: s.publishCatalogRelease,
      refreshCatalogReleases: s.refreshCatalogReleases,
      refreshCatalogDirtyState: s.refreshCatalogDirtyState,
      diffAgainstRelease: s.diffAgainstRelease,
      rollbackToRelease: s.rollbackToRelease,
      redownloadRelease: s.redownloadRelease,
    }))
  );

  const [publishOpen, { open: openPublish, close: closePublish }] =
    useDisclosure(false);

  // Opened from header "ungesichert" HoverCard → Version freigeben
  useEffect(() => {
    try {
      if (sessionStorage.getItem(OPEN_PUBLISH_SESSION_KEY) === "1") {
        sessionStorage.removeItem(OPEN_PUBLISH_SESSION_KEY);
        if (hasUnpublishedCatalogChanges) {
          openPublish();
        }
      }
    } catch {
      /* ignore */
    }
  }, [hasUnpublishedCatalogChanges, openPublish]);
  const [diffOpen, { open: openDiff, close: closeDiff }] = useDisclosure(false);
  const [busy, setBusy] = useState(false);
  const [catalogName, setCatalogName] = useState(
    installedCatalogMeta?.name || projectTitle || "Unternehmens-Katalog"
  );
  const [bump, setBump] = useState<SemVerBump>("minor");
  const [manualVersion, setManualVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [useManual, setUseManual] = useState(false);
  const [catalogFingerprint, setCatalogFingerprint] = useState<string>("…");
  const [activeDiff, setActiveDiff] = useState<CatalogDiffResult | null>(null);
  const [diffTitle, setDiffTitle] = useState("");

  const canPublish = hasUnpublishedCatalogChanges;
  const canDiffLatest =
    hasUnpublishedCatalogChanges && (storedCatalogReleases?.length ?? 0) > 0;

  const catalogId = useMemo(() => stableCatalogId(), []);
  const currentVersion = installedCatalogMeta?.version || "—";
  const nextPreview = useMemo(() => {
    if (useManual && manualVersion.trim()) return manualVersion.trim();
    return bumpSemVer(installedCatalogMeta?.version || "0.0.0", bump);
  }, [bump, useManual, manualVersion, installedCatalogMeta?.version]);

  const releases: StoredCatalogRelease[] = storedCatalogReleases || [];

  /** Live freigegebene Version (nach Publish/Rollback) — nicht „neueste im Archiv“. */
  const isActiveRelease = (release: StoredCatalogRelease): boolean => {
    if (!installedCatalogMeta?.version) return false;
    if (release.version === installedCatalogMeta.version) return true;
    // id is stored as version string on publish
    return release.id === installedCatalogMeta.version;
  };

  // Fingerprint + dirty when catalog entities change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const extract = extractCatalogFromState(
        { categories, subcategories, skills, roles },
        { catalogId: "fp", name: "fp", version: "0.0.0" }
      );
      if (!extract.package) {
        if (!cancelled) setCatalogFingerprint("—");
        return;
      }
      const fp = await computeCatalogFingerprint(extract.package.entities);
      if (!cancelled) setCatalogFingerprint(fp);
      await refreshCatalogDirtyState();
    })();
    return () => {
      cancelled = true;
    };
  }, [categories, subcategories, skills, roles, refreshCatalogDirtyState]);

  useEffect(() => {
    void refreshCatalogReleases();
  }, [refreshCatalogReleases]);

  const handlePublish = async () => {
    if (useManual && !isValidSemVer(manualVersion.trim())) {
      notifications.show({
        title: "Ungültige Version",
        message: "Bitte SemVer verwenden, z. B. 1.2.0",
        color: "red",
      });
      return;
    }
    if (!notes.trim()) {
      notifications.show({
        title: "Release-Notizen fehlen",
        message: "Kurz beschreiben, was sich in dieser Version geändert hat.",
        color: "orange",
      });
      return;
    }

    setBusy(true);
    try {
      const result = await publishCatalogRelease({
        catalogId,
        name: catalogName.trim() || "Unternehmens-Katalog",
        bump: useManual ? undefined : bump,
        version: useManual ? manualVersion.trim() : undefined,
        releaseNotes: notes.trim(),
        publisher: projectTitle || "SkillGrid Manage",
        download: true,
      });

      if (!result.ok) {
        notifications.show({
          title: "Release fehlgeschlagen",
          message:
            result.errors.map((e) => e.message).join("; ") ||
            "Unbekannter Fehler",
          color: "red",
        });
        return;
      }

      notifications.show({
        title: `Version ${result.package?.meta.version} freigegeben`,
        message:
          "Snapshot lokal gespeichert (max. 10) und JSON heruntergeladen.",
        color: "green",
      });
      setNotes("");
      closePublish();
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

  const showDiff = async (releaseId?: string, label?: string) => {
    setBusy(true);
    try {
      const diff = await diffAgainstRelease(releaseId);
      if (!diff) {
        notifications.show({
          title: "Kein Vergleich möglich",
          message: "Keine gespeicherte Version zum Vergleichen.",
          color: "orange",
        });
        return;
      }
      setActiveDiff(diff);
      setDiffTitle(label || (releaseId ? `vs. v${releaseId}` : "vs. letzte Version"));
      openDiff();
    } finally {
      setBusy(false);
    }
  };

  const handleRollback = (release: StoredCatalogRelease) => {
    modals.openConfirmModal({
      title: `Rollback auf v${release.version}?`,
      centered: true,
      children: (
        <Text size="sm">
          Der Live-Katalog wird auf den Stand von <strong>v{release.version}</strong>{" "}
          ({formatReleasePublishedAt(release.publishedAt)}) zurückgesetzt. Skills/Rollen, die
          in dieser Version nicht enthalten sind, werden als{" "}
          <em>veraltet</em> markiert (nicht hart gelöscht).
        </Text>
      ),
      labels: { confirm: "Rollback ausführen", cancel: "Abbrechen" },
      confirmProps: { color: "orange" },
      onConfirm: async () => {
        setBusy(true);
        try {
          const result = await rollbackToRelease(release.id);
          if (!result.ok) {
            notifications.show({
              title: "Rollback fehlgeschlagen",
              message: result.errors.map((e) => e.message).join("; "),
              color: "red",
            });
            return;
          }
          notifications.show({
            title: `Rollback auf v${release.version}`,
            message: "Katalog wiederhergestellt.",
            color: "green",
          });
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const diffCounts = activeDiff ? summarizeDiffCounts(activeDiff) : null;

  return (
    <Box style={{ width: "100%" }}>
      <Group justify="space-between" mb="lg" align="flex-start">
        <Title order={2}>Versionen & Releases</Title>
        {hasUnpublishedCatalogChanges ? (
          <UnpublishedCatalogBadge
            size="lg"
            label="Unveröffentlichte Änderungen"
            onPublish={() => {
              if (canPublish) openPublish();
            }}
          />
        ) : releases.length > 0 ? (
          <Badge size="lg" color="green" variant="light">
            Entspricht letzter Version
          </Badge>
        ) : null}
      </Group>

      <Stack gap="lg">
        {hasUnpublishedCatalogChanges && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            color="orange"
            variant="light"
            title="Änderungen noch nicht freigegeben"
          >
            Der Live-Katalog weicht von der zuletzt gespeicherten Version ab.
            Bitte eine neue Version freigeben, sobald die Änderungen fertig
            sind.{" "}
            <Button
              variant="subtle"
              size="compact-xs"
              disabled={!canDiffLatest}
              onClick={() => showDiff(undefined, "Aktuell vs. letzte Version")}
            >
              Unterschiede anzeigen
            </Button>
          </Alert>
        )}

        <Card withBorder shadow="xs" radius="md">
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Group gap="xs">
                <IconFingerprint
                  size={18}
                  style={{ color: "var(--mantine-color-dimmed)" }}
                />
                <Text fw={600} size="sm">
                  Katalog-Status
                </Text>
              </Group>
              <Text size="xs" c="dimmed" maw={420}>
                Fingerprint nur aus <strong>Kategorien, Skills und Rollen</strong>{" "}
                (SHA-256). Die letzten <strong>10 freigegebenen Versionen</strong>{" "}
                werden vollständig im Browser archiviert.
              </Text>
            </Stack>
            <Group gap="xl">
              <Stack gap={0} align="center" style={{ minWidth: 100 }}>
                <Text size="xs" c="dimmed" mb={2}>
                  Katalog-Fingerprint
                </Text>
                <Badge
                  variant="outline"
                  color={hasUnpublishedCatalogChanges ? "orange" : "indigo"}
                  size="lg"
                  styles={{
                    label: { fontFamily: "monospace", letterSpacing: "1px" },
                  }}
                >
                  {catalogFingerprint}
                </Badge>
              </Stack>
              <Divider orientation="vertical" />
              <Stack gap={0} align="center">
                <Text fw={700} size="xl">
                  {categories.length}
                </Text>
                <Text size="xs" c="dimmed">
                  Kategorien
                </Text>
              </Stack>
              <Stack gap={0} align="center">
                <Text fw={700} size="xl">
                  {skills.length}
                </Text>
                <Text size="xs" c="dimmed">
                  Skills
                </Text>
              </Stack>
              <Stack gap={0} align="center">
                <Text fw={700} size="xl">
                  {roles.length}
                </Text>
                <Text size="xs" c="dimmed">
                  Rollen
                </Text>
              </Stack>
            </Group>
          </Group>
        </Card>

        <Card withBorder shadow="sm" radius="md">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Stack gap={4}>
                <Group gap="xs">
                  <IconRocket
                    size={20}
                    style={{ color: "var(--mantine-color-indigo-filled)" }}
                  />
                  <Title order={4}>Version freigeben</Title>
                </Group>
                <Text size="sm" c="dimmed" maw={560}>
                  Snapshot speichern (max. 10), JSON herunterladen und
                  Versionsverlauf fortschreiben.
                </Text>
              </Stack>
              <Badge
                size="xl"
                variant="light"
                color="indigo"
                leftSection={<IconTag size={14} />}
              >
                {currentVersion === "—"
                  ? "Noch kein Release"
                  : `v${currentVersion}`}
              </Badge>
            </Group>

            <Group>
              <Tooltip
                label={
                  canPublish
                    ? "Aktuellen Katalogstand als Version speichern"
                    : releases.length === 0
                      ? "Zuerst Skills/Rollen anlegen"
                      : "Keine Änderungen seit der letzten Version"
                }
              >
                <Button
                  leftSection={<IconPackageExport size={16} />}
                  color="indigo"
                  onClick={openPublish}
                  disabled={!canPublish}
                >
                  Neue Version freigeben…
                </Button>
              </Tooltip>
              {releases[0] && (
                <Tooltip
                  label={
                    canDiffLatest
                      ? "Unterschiede zur zuletzt freigegebenen Version"
                      : "Keine unveröffentlichten Änderungen"
                  }
                >
                  <Button
                    variant="light"
                    color="gray"
                    leftSection={<IconGitCompare size={16} />}
                    loading={busy}
                    disabled={!canDiffLatest}
                    onClick={() =>
                      showDiff(
                        releases[0].id,
                        `Aktuell vs. v${releases[0].version}`
                      )
                    }
                  >
                    Diff zur letzten Version
                  </Button>
                </Tooltip>
              )}
            </Group>
          </Stack>
        </Card>

        {/* Archiv — Mantine Accordion (chevron right, same as Full RoleManager) */}
        <Card withBorder shadow="sm" radius="md" p={0}>
          <Accordion
            chevronPosition="right"
            multiple
            defaultValue={["archive"]}
            variant="default"
            radius="md"
          >
            <Accordion.Item value="archive" style={{ border: "none" }}>
              <Accordion.Control
                icon={
                  <IconHistory
                    size={18}
                    style={{ color: "var(--mantine-color-dimmed)" }}
                  />
                }
              >
                <Text fw={600} size="sm">
                  Archiv (letzte {releases.length}/10 Versionen)
                </Text>
              </Accordion.Control>
              <Accordion.Panel>
                {releases.length === 0 ? (
                  <Alert
                    icon={<IconAlertCircle size={16} />}
                    color="gray"
                    variant="light"
                    title="Noch keine Releases"
                  >
                    Nach dem ersten Freigeben erscheinen hier bis zu 10
                    vollständige Snapshots zum Diff, erneuten Download und
                    Rollback.
                  </Alert>
                ) : (
                  <Accordion
                    chevronPosition="right"
                    multiple
                    variant="separated"
                    radius="sm"
                  >
                    {releases.map((release) => {
                      const active = isActiveRelease(release);
                      return (
                      <Accordion.Item key={release.id} value={release.id}>
                        <Accordion.Control
                          icon={
                            <ThemeIcon
                              size={22}
                              radius="xl"
                              color={active ? "green" : "indigo"}
                              variant={active ? "filled" : "light"}
                            >
                              <IconTag size={12} />
                            </ThemeIcon>
                          }
                        >
                          <Group gap="xs" wrap="wrap">
                            <Code>v{release.version}</Code>
                            <Text size="xs" c="dimmed">
                              {release.publishedAt.slice(0, 10)}
                            </Text>
                            {active && (
                              <Badge size="xs" variant="light" color="green">
                                Aktuell freigegeben
                              </Badge>
                            )}
                          </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                          <Stack gap="xs">
                            <Text size="sm">{release.notes}</Text>
                            <Group gap="xs">
                              <Tooltip label="Unterschiede zum Live-Katalog">
                                <Button
                                  size="compact-xs"
                                  variant="light"
                                  leftSection={<IconGitCompare size={12} />}
                                  onClick={() =>
                                    showDiff(
                                      release.id,
                                      `Aktuell vs. v${release.version}`
                                    )
                                  }
                                >
                                  Diff
                                </Button>
                              </Tooltip>
                              <Tooltip label="JSON erneut herunterladen">
                                <Button
                                  size="compact-xs"
                                  variant="light"
                                  leftSection={<IconDownload size={12} />}
                                  onClick={async () => {
                                    try {
                                      await redownloadRelease(release.id);
                                      notifications.show({
                                        title: "Download",
                                        message: `v${release.version}`,
                                        color: "blue",
                                      });
                                    } catch (e) {
                                      notifications.show({
                                        title: "Fehler",
                                        message:
                                          e instanceof Error
                                            ? e.message
                                            : String(e),
                                        color: "red",
                                      });
                                    }
                                  }}
                                >
                                  Download
                                </Button>
                              </Tooltip>
                              <Tooltip
                                label={
                                  active
                                    ? "Bereits der aktuelle Live-Stand"
                                    : "Live-Katalog auf diesen Stand setzen"
                                }
                              >
                                <Button
                                  size="compact-xs"
                                  variant="light"
                                  color="orange"
                                  leftSection={<IconArrowBackUp size={12} />}
                                  disabled={active || busy}
                                  onClick={() => handleRollback(release)}
                                >
                                  Rollback
                                </Button>
                              </Tooltip>
                            </Group>
                          </Stack>
                        </Accordion.Panel>
                      </Accordion.Item>
                      );
                    })}
                  </Accordion>
                )}
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Card>
      </Stack>

      {/* Publish modal */}
      <Modal
        opened={publishOpen}
        onClose={closePublish}
        title="Neue Katalog-Version freigeben"
        size="lg"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Snapshot als <strong>v{nextPreview}</strong> speichern (Archiv +
            Download).
          </Text>

          <TextInput
            label="Katalog-Name"
            value={catalogName}
            onChange={(e) => setCatalogName(e.currentTarget.value)}
          />

          <Stack gap={6}>
            <Text size="sm" fw={500}>
              Versionsnummer
            </Text>
            <SegmentedControl
              fullWidth
              value={useManual ? "manual" : bump}
              onChange={(v) => {
                if (v === "manual") setUseManual(true);
                else {
                  setUseManual(false);
                  setBump(v as SemVerBump);
                }
              }}
              data={[
                {
                  value: "patch",
                  label: `Patch → ${bumpSemVer(installedCatalogMeta?.version || "0.0.0", "patch")}`,
                },
                {
                  value: "minor",
                  label: `Minor → ${bumpSemVer(installedCatalogMeta?.version || "0.0.0", "minor")}`,
                },
                {
                  value: "major",
                  label: `Major → ${bumpSemVer(installedCatalogMeta?.version || "0.0.0", "major")}`,
                },
                { value: "manual", label: "Manuell" },
              ]}
            />
            {useManual && (
              <TextInput
                label="SemVer"
                placeholder="1.4.0"
                value={manualVersion}
                onChange={(e) => setManualVersion(e.currentTarget.value)}
              />
            )}
          </Stack>

          <Textarea
            label="Release-Notizen"
            minRows={3}
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            required
            placeholder="Was hat sich geändert?"
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={closePublish}>
              Abbrechen
            </Button>
            <Button
              color="indigo"
              leftSection={<IconRocket size={16} />}
              loading={busy}
              onClick={handlePublish}
            >
              v{nextPreview} freigeben
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Diff modal */}
      <Modal
        opened={diffOpen}
        onClose={closeDiff}
        title={`Unterschiede — ${diffTitle}`}
        size="xl"
        centered
      >
        {activeDiff && diffCounts && (
          <Stack gap="md">
            {activeDiff.isIdentical ? (
              <Alert color="green" icon={<IconAlertCircle size={16} />}>
                Keine Unterschiede — Live-Katalog entspricht dieser Version.
              </Alert>
            ) : (
              <>
                <Group gap="md">
                  <Badge color="green">+{diffCounts.added} neu</Badge>
                  <Badge color="red">−{diffCounts.removed} entfernt</Badge>
                  <Badge color="blue">~{diffCounts.changed} geändert</Badge>
                </Group>
                <ScrollArea h={360}>
                  <Table striped highlightOnHover withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Änderung</Table.Th>
                        <Table.Th>Typ</Table.Th>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Detail</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {activeDiff.items.map((item) => (
                        <Table.Tr key={`${item.kind}-${item.change}-${item.id}`}>
                          <Table.Td>
                            <Badge
                              size="sm"
                              color={CHANGE_LABEL[item.change].color}
                            >
                              {CHANGE_LABEL[item.change].label}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{KIND_LABEL[item.kind] || item.kind}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={500}>
                              {item.label}
                            </Text>
                            <Text size="xs" c="dimmed" ff="monospace">
                              {item.id.slice(0, 8)}…
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed">
                              {item.detail || "—"}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </>
            )}
            <Button onClick={closeDiff} fullWidth variant="default">
              Schließen
            </Button>
          </Stack>
        )}
      </Modal>
    </Box>
  );
};
