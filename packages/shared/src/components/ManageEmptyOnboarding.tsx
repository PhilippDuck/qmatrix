/**
 * First-run / empty catalog welcome for SkillGrid Manage.
 */
import React, { useState } from "react";
import {
  Stack,
  Title,
  Text,
  Button,
  Group,
  Paper,
  ThemeIcon,
  SimpleGrid,
  Card,
  List,
} from "@mantine/core";
import {
  IconFlask,
  IconPlus,
  IconPackageImport,
  IconTags,
  IconRocket,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useStore, useShallow } from "../store/hooks";
import {
  buildManageDemoCatalogPackage,
  manageDemoCatalogSummary,
} from "../services/manageDemoCatalog";
import { withContentHash } from "../services/catalog";

const demoSummary = manageDemoCatalogSummary();

export interface ManageEmptyOnboardingProps {
  onStartSkills: () => void;
  onStartImport: () => void;
}

export const ManageEmptyOnboarding: React.FC<ManageEmptyOnboardingProps> = ({
  onStartSkills,
  onStartImport,
}) => {
  const [busy, setBusy] = useState(false);

  const {
    importCatalog,
    updateProjectTitle,
    refreshCatalogDirtyState,
    refreshCatalogReleases,
  } = useStore(
    useShallow((s) => ({
      importCatalog: s.importCatalog,
      updateProjectTitle: s.updateProjectTitle,
      refreshCatalogDirtyState: s.refreshCatalogDirtyState,
      refreshCatalogReleases: s.refreshCatalogReleases,
    }))
  );

  const loadDemo = async () => {
    setBusy(true);
    try {
      let pkg = buildManageDemoCatalogPackage();
      pkg = await withContentHash(pkg);
      const result = await importCatalog(pkg, {
        missingPolicy: "keep",
        allowDowngrade: true,
        allowCatalogIdChange: true,
        updateInstalledMeta: false,
      });
      if (!result.ok) {
        notifications.show({
          title: "Demo konnte nicht geladen werden",
          message: result.errors.map((e) => e.message).join("; "),
          color: "red",
        });
        return;
      }
      try {
        await updateProjectTitle("Demo-Katalog IT");
      } catch {
        /* optional */
      }
      await refreshCatalogReleases();
      await refreshCatalogDirtyState();
      notifications.show({
        title: "Demo-Katalog geladen",
        message: `${demoSummary.skills} Skills · ${demoSummary.roles} Rollen — unter Skills & Kategorien weiterarbeiten.`,
        color: "green",
      });
      onStartSkills();
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
    <Stack
      gap="xl"
      align="center"
      justify="center"
      py="xl"
      px="md"
      style={{ minHeight: "60vh", maxWidth: 720, margin: "0 auto" }}
    >
      <Stack gap="xs" align="center" ta="center">
        <ThemeIcon size={56} radius="xl" variant="light" color="blue">
          <IconTags size={28} />
        </ThemeIcon>
        <Title order={2}>Willkommen in SkillGrid Manage</Title>
        <Text c="dimmed" maw={480}>
          Hier pflegst du den <strong>Skill- & Rollen-Katalog</strong> und gibst
          Versionen frei. Der Katalog ist noch leer — starte mit einer der
          Optionen:
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" w="100%">
        <Card withBorder shadow="sm" radius="md" padding="lg">
          <Stack gap="md" h="100%" justify="space-between">
            <Stack gap="xs">
              <ThemeIcon size={36} radius="md" variant="light" color="violet">
                <IconFlask size={20} />
              </ThemeIcon>
              <Text fw={600}>Demo laden</Text>
              <Text size="sm" c="dimmed">
                Fertiger IT-Beispielkatalog (
                {demoSummary.categories} Kategorien, {demoSummary.skills}{" "}
                Skills, {demoSummary.roles} Rollen) zum Ausprobieren.
              </Text>
            </Stack>
            <Button
              color="violet"
              variant="light"
              leftSection={<IconFlask size={16} />}
              loading={busy}
              onClick={() => void loadDemo()}
              fullWidth
              styles={{
                root: { height: "auto", minHeight: 36, paddingBlock: 8 },
                label: { whiteSpace: "normal", lineHeight: 1.3 },
                inner: { flexWrap: "wrap" },
              }}
            >
              Demo laden
            </Button>
          </Stack>
        </Card>

        <Card withBorder shadow="sm" radius="md" padding="lg">
          <Stack gap="md" h="100%" justify="space-between">
            <Stack gap="xs">
              <ThemeIcon size={36} radius="md" variant="light" color="blue">
                <IconPlus size={20} />
              </ThemeIcon>
              <Text fw={600}>Selbst anlegen</Text>
              <Text size="sm" c="dimmed">
                Leeren Katalog von Hand aufbauen: Kategorien, Skills und Rollen
                selbst definieren.
              </Text>
            </Stack>
            <Button
              color="blue"
              variant="light"
              leftSection={<IconPlus size={16} />}
              onClick={onStartSkills}
              fullWidth
              disabled={busy}
              styles={{
                root: { height: "auto", minHeight: 36, paddingBlock: 8 },
                label: { whiteSpace: "normal", lineHeight: 1.3 },
                inner: { flexWrap: "wrap" },
              }}
            >
              Skills öffnen
            </Button>
          </Stack>
        </Card>

        <Card withBorder shadow="sm" radius="md" padding="lg">
          <Stack gap="md" h="100%" justify="space-between">
            <Stack gap="xs">
              <ThemeIcon size={36} radius="md" variant="light" color="teal">
                <IconPackageImport size={20} />
              </ThemeIcon>
              <Text fw={600}>Katalog importieren</Text>
              <Text size="sm" c="dimmed">
                Bestehenden Katalog (z. B. aus Full) per Merge-Import
                einspielen.
              </Text>
            </Stack>
            <Button
              color="teal"
              variant="light"
              leftSection={<IconPackageImport size={16} />}
              onClick={onStartImport}
              fullWidth
              disabled={busy}
              styles={{
                root: { height: "auto", minHeight: 36, paddingBlock: 8 },
                label: { whiteSpace: "normal", lineHeight: 1.3 },
                inner: { flexWrap: "wrap" },
              }}
            >
              Import öffnen
            </Button>
          </Stack>
        </Card>
      </SimpleGrid>

      <Paper withBorder p="md" radius="md" w="100%" bg="var(--mantine-color-default-hover)">
        <Group gap="sm" align="flex-start" wrap="nowrap">
          <ThemeIcon size={28} radius="md" variant="light" color="gray">
            <IconRocket size={16} />
          </ThemeIcon>
          <Stack gap={4}>
            <Text size="sm" fw={600}>
              Typischer Ablauf
            </Text>
            <List size="xs" c="dimmed" spacing={2}>
              <List.Item>Katalog pflegen (Skills & Rollen)</List.Item>
              <List.Item>
                Unter Versionen freigeben → JSON + Änderungs-TXT
              </List.Item>
              <List.Item>
                Datei in Team/Full importieren (dort nur Inhalte, Version steuert
                Manage)
              </List.Item>
            </List>
          </Stack>
        </Group>
      </Paper>
    </Stack>
  );
};
