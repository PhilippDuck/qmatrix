/**
 * Demo catalog generator for Manage — collapsed accordion above danger zone.
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
  Accordion,
  Box,
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
    <Card withBorder shadow="sm" radius="md" p={0} padding={0}>
      <Accordion chevronPosition="right" variant="default" radius="md">
        <Accordion.Item value="demo" style={{ border: "none" }}>
          <Accordion.Control
            icon={
              <IconFlask
                size={18}
                style={{ color: "var(--mantine-color-dimmed)" }}
              />
            }
          >
            <Group gap="xs" wrap="nowrap">
              <Title order={5} c="dimmed" fw={600}>
                Erweiterte Optionen
              </Title>
              <Badge size="xs" variant="outline" color="gray">
                Demo
              </Badge>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Box>
              <Text size="sm" fw={600} mb={4}>
                Demo-Katalog erzeugen
              </Text>
              <Text size="xs" c="dimmed" mb="sm">
                Realistischer IT-Katalog für Präsentationen (
                {summary.categories} Kategorien, {summary.skills} Skills,{" "}
                {summary.roles} Rollen). Ohne freigegebene Version — Manage
                bleibt Versions-SoT.
              </Text>
              <List size="xs" spacing={2} mb="sm" c="dimmed">
                <List.Item>
                  {summary.subcategories} Unterkategorien · IDs mit{" "}
                  <Code>demo-</Code>
                </List.Item>
                <List.Item>
                  Rollen: Junior/Senior Dev, Scrum Master, Product Owner
                </List.Item>
              </List>
              <Alert
                icon={<IconInfoCircle size={14} />}
                color="gray"
                variant="light"
                mb="sm"
                p="xs"
              >
                <Text size="xs">
                  Nur für Demos. Bei bestehenden Daten wählbar: Ersetzen oder
                  Mergen.
                </Text>
              </Alert>
              <Button
                size="xs"
                leftSection={<IconPlayerPlay size={14} />}
                color="gray"
                variant="light"
                loading={busy}
                onClick={openChooser}
              >
                {hasData ? "Demo-Katalog laden…" : "Demo-Katalog erzeugen"}
              </Button>
            </Box>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Card>
  );
};
