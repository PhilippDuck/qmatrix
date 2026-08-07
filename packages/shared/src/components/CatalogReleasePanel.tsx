/**
 * Manage: version management — release catalog packages with SemVer + changelog history.
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
  Timeline,
  ThemeIcon,
  Alert,
  Code,
  Divider,
  Box,
} from "@mantine/core";
import {
  IconRocket,
  IconHistory,
  IconPackageExport,
  IconAlertCircle,
  IconTag,
  IconFingerprint,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useStore, useShallow } from "../store/hooks";
import {
  bumpSemVer,
  isValidSemVer,
  computeCatalogFingerprint,
  extractCatalogFromState,
  type SemVerBump,
} from "../services/catalog";

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

export const CatalogReleasePanel: React.FC = () => {
  const {
    projectTitle,
    installedCatalogMeta,
    categories,
    subcategories,
    skills,
    roles,
    publishCatalogRelease,
  } = useStore(
    useShallow((s) => ({
      projectTitle: s.projectTitle,
      installedCatalogMeta: s.installedCatalogMeta,
      categories: s.categories,
      subcategories: s.subcategories,
      skills: s.skills,
      roles: s.roles,
      publishCatalogRelease: s.publishCatalogRelease,
    }))
  );

  const [opened, { open, close }] = useDisclosure(false);
  const [busy, setBusy] = useState(false);
  const [catalogName, setCatalogName] = useState(
    installedCatalogMeta?.name || projectTitle || "Unternehmens-Katalog"
  );
  const [bump, setBump] = useState<SemVerBump>("minor");
  const [manualVersion, setManualVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [useManual, setUseManual] = useState(false);
  const [catalogFingerprint, setCatalogFingerprint] = useState<string>("…");

  const catalogId = useMemo(() => stableCatalogId(), []);
  const currentVersion = installedCatalogMeta?.version || "—";
  const nextPreview = useMemo(() => {
    if (useManual && manualVersion.trim()) return manualVersion.trim();
    return bumpSemVer(installedCatalogMeta?.version || "0.0.0", bump);
  }, [bump, useManual, manualVersion, installedCatalogMeta?.version]);

  const changelog = installedCatalogMeta?.changelog || [];

  // Katalog-Fingerprint: nur Skills/Rollen/Kategorien (nicht Mitarbeiter)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const extract = extractCatalogFromState(
        { categories, subcategories, skills, roles },
        {
          catalogId: "fp",
          name: "fp",
          version: "0.0.0",
        }
      );
      if (!extract.package) {
        if (!cancelled) setCatalogFingerprint("—");
        return;
      }
      const fp = await computeCatalogFingerprint(extract.package.entities);
      if (!cancelled) setCatalogFingerprint(fp);
    })();
    return () => {
      cancelled = true;
    };
  }, [categories, subcategories, skills, roles]);

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
          "JSON-Paket wurde heruntergeladen. Team-Apps können diese Version importieren.",
        color: "green",
      });
      setNotes("");
      close();
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

  return (
    <Box style={{ width: "100%" }}>
      <Title order={2} mb="lg">
        Versionen & Releases
      </Title>

      <Stack gap="lg">
        {/* Status: Katalog-Fingerprint + Zähler (ohne Mitarbeiter) */}
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
                Fingerprint aus <strong>Kategorien, Unterkategorien, Skills und
                Rollen</strong> (SHA-256, 10 Zeichen). Mitarbeiter und
                Bewertungen fließen nicht ein — nur der Katalog-Inhalt.
              </Text>
            </Stack>
            <Group gap="xl">
              <Stack gap={0} align="center" style={{ minWidth: 100 }}>
                <Text size="xs" c="dimmed" mb={2}>
                  Katalog-Fingerprint
                </Text>
                <Badge
                  variant="outline"
                  color="indigo"
                  size="lg"
                  styles={{
                    label: { fontFamily: "monospace", letterSpacing: "1px" },
                  }}
                  title="Ändert sich, sobald Skills/Rollen/Kategorien geändert werden"
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
                  Veröffentliche den aktuellen Stand von Skills, Kategorien und
                  Rollen als versioniertes Katalog-Paket. Teams importieren diese
                  Datei als verbindliche Vorlage.
                </Text>
              </Stack>
              <Stack gap={4} align="flex-end">
                <Text size="xs" c="dimmed">
                  Aktuelle freigegebene Version
                </Text>
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
              </Stack>
            </Group>

            <Group>
              <Button
                leftSection={<IconPackageExport size={16} />}
                color="indigo"
                onClick={open}
              >
                Neue Version freigeben…
              </Button>
            </Group>

            {changelog.length > 0 ? (
              <Stack gap="sm" mt="sm">
                <Group gap="xs">
                  <IconHistory size={16} />
                  <Text fw={600} size="sm">
                    Versionsverlauf
                  </Text>
                </Group>
                <Timeline active={0} bulletSize={24} lineWidth={2} color="indigo">
                  {changelog.map((entry) => (
                    <Timeline.Item
                      key={`${entry.version}-${entry.date}`}
                      bullet={
                        <ThemeIcon
                          size={22}
                          radius="xl"
                          color="indigo"
                          variant="light"
                        >
                          <IconTag size={12} />
                        </ThemeIcon>
                      }
                      title={
                        <Group gap="xs">
                          <Code>v{entry.version}</Code>
                          <Text size="xs" c="dimmed">
                            {entry.date}
                          </Text>
                        </Group>
                      }
                    >
                      <Text size="sm" mt={4}>
                        {entry.notes}
                      </Text>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Stack>
            ) : (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="gray"
                variant="light"
                title="Noch keine Releases"
              >
                Nach dem ersten Freigeben erscheint hier der Verlauf. Jede Version
                erzeugt eine JSON-Datei für SkillGrid Team.
              </Alert>
            )}
          </Stack>
        </Card>
      </Stack>

      <Modal
        opened={opened}
        onClose={close}
        title="Neue Katalog-Version freigeben"
        size="lg"
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Der aktuelle Stand der Skills und Rollen wird als{" "}
            <strong>v{nextPreview}</strong> verpackt und heruntergeladen.
          </Text>

          <TextInput
            label="Katalog-Name"
            description="Erscheint im Dateinamen und in Team-Importen"
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
            <Text size="xs" c="dimmed">
              <strong>Patch</strong> = kleine Korrekturen ·{" "}
              <strong>Minor</strong> = neue Skills/Rollen ·{" "}
              <strong>Major</strong> = harte Entfernungen / Breaking Changes
            </Text>
          </Stack>

          <Textarea
            label="Release-Notizen"
            description="Was hat sich geändert? (wird im Versionsverlauf gespeichert)"
            placeholder="z. B. Neue Rolle Senior-Dev, Skill Cloud-Basics hinzugefügt…"
            minRows={3}
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            required
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={close}>
              Abbrechen
            </Button>
            <Button
              color="indigo"
              leftSection={<IconRocket size={16} />}
              loading={busy}
              onClick={handlePublish}
            >
              v{nextPreview} freigeben & herunterladen
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};
