/**
 * Demo catalog generator for Manage (System tab).
 */
import React, { useState } from "react";
import {
  Title,
  Group,
  Button,
  Stack,
  Card,
  Text,
  List,
  Badge,
  Alert,
  Code,
} from "@mantine/core";
import { IconFlask, IconPlayerPlay, IconInfoCircle } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useStore, useShallow } from "../store/hooks";
import {
  buildManageDemoCatalogPackage,
  manageDemoCatalogSummary,
} from "../services/manageDemoCatalog";
import { withContentHash } from "../services/catalog";

const summary = manageDemoCatalogSummary();

export const ManageDemoGenerator: React.FC = () => {
  const [busy, setBusy] = useState(false);

  const {
    categories,
    skills,
    roles,
    importCatalog,
    clearAllData,
    updateProjectTitle,
    refreshCatalogDirtyState,
    refreshCatalogReleases,
  } = useStore(
    useShallow((s) => ({
      categories: s.categories,
      skills: s.skills,
      roles: s.roles,
      importCatalog: s.importCatalog,
      clearAllData: s.clearAllData,
      updateProjectTitle: s.updateProjectTitle,
      refreshCatalogDirtyState: s.refreshCatalogDirtyState,
      refreshCatalogReleases: s.refreshCatalogReleases,
    }))
  );

  const hasData = categories.length + skills.length + roles.length > 0;

  const runSeed = async (clearFirst: boolean) => {
    setBusy(true);
    try {
      if (clearFirst) {
        await clearAllData();
      }

      let pkg = buildManageDemoCatalogPackage();
      pkg = await withContentHash(pkg);

      const result = await importCatalog(pkg, {
        missingPolicy: clearFirst ? "soft" : "keep",
        allowDowngrade: true,
        allowCatalogIdChange: true,
        // Demo is content only — Manage remains version SoT
        updateInstalledMeta: false,
      });

      if (!result.ok) {
        notifications.show({
          title: "Demo-Generator fehlgeschlagen",
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
        message: `${summary.categories} Kategorien · ${summary.skills} Skills · ${summary.roles} Rollen. Optional unter Versionen freigeben.`,
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

  const openChooser = () => {
    if (!hasData) {
      void runSeed(false);
      return;
    }
    modals.open({
      title: "Demo-Katalog erzeugen",
      centered: true,
      children: (
        <Stack gap="md">
          <Text size="sm">
            Es sind bereits Daten vorhanden (
            <strong>{categories.length}</strong> Kategorien,{" "}
            <strong>{skills.length}</strong> Skills,{" "}
            <strong>{roles.length}</strong> Rollen).
          </Text>
          <Group grow>
            <Button
              variant="light"
              color="orange"
              loading={busy}
              onClick={() => {
                modals.closeAll();
                void runSeed(true);
              }}
            >
              Ersetzen
            </Button>
            <Button
              variant="light"
              color="teal"
              loading={busy}
              onClick={() => {
                modals.closeAll();
                void runSeed(false);
              }}
            >
              Ergänzen / Mergen
            </Button>
          </Group>
          <Button variant="subtle" onClick={() => modals.closeAll()}>
            Abbrechen
          </Button>
        </Stack>
      ),
    });
  };

  return (
    <Card withBorder shadow="sm" radius="md">
      <Stack gap="md">
        <Group gap="xs" wrap="wrap">
          <IconFlask
            size={20}
            style={{ color: "var(--mantine-color-violet-filled)" }}
          />
          <Title order={4}>Demo-Generator</Title>
          <Badge size="sm" variant="light" color="violet">
            Präsentation
          </Badge>
        </Group>

        <Text size="sm" c="dimmed">
          Erzeugt einen realistischen IT-Katalog (Kategorien, Skills, Rollen mit
          Soll-Levels) für Demos und Screenshots. Keine Mitarbeiter und keine
          freigegebene Version — die vergibt ihr unter Versionen & Releases.
        </Text>

        <List size="sm" spacing={4}>
          <List.Item>
            <strong>{summary.categories}</strong> Kategorien ·{" "}
            <strong>{summary.subcategories}</strong> Unterkategorien
          </List.Item>
          <List.Item>
            <strong>{summary.skills}</strong> Skills ·{" "}
            <strong>{summary.roles}</strong> Rollen (Junior/Senior Dev, SM, PO)
          </List.Item>
        </List>

        <Alert icon={<IconInfoCircle size={16} />} color="violet" variant="light">
          <Text size="xs">
            Demo-IDs beginnen mit <Code>demo-</Code>. Nach dem Laden ggf.
            „ungesichert“ und unter Versionen freigeben.
          </Text>
        </Alert>

        <Button
          leftSection={<IconPlayerPlay size={16} />}
          color="violet"
          variant="light"
          loading={busy}
          onClick={openChooser}
        >
          {hasData ? "Demo-Katalog laden…" : "Demo-Katalog erzeugen"}
        </Button>
      </Stack>
    </Card>
  );
};
