/**
 * Disaster-recovery backup for Manage: catalog + release archive + settings.
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
} from "@mantine/core";
import {
  IconDatabaseExport,
  IconDatabaseImport,
  IconInfoCircle,
} from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useStore, useShallow } from "../store/hooks";

export const ManageGlobalBackup: React.FC = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const {
    exportManageBackup,
    importManageBackup,
    storedCatalogReleases,
    categories,
    skills,
    roles,
  } = useStore(
    useShallow((s) => ({
      exportManageBackup: s.exportManageBackup,
      importManageBackup: s.importManageBackup,
      storedCatalogReleases: s.storedCatalogReleases,
      categories: s.categories,
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

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    modals.openConfirmModal({
      title: "Globales Backup wiederherstellen?",
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
          setTimeout(() => window.location.reload(), 800);
        } catch (e) {
          notifications.show({
            title: "Wiederherstellung fehlgeschlagen",
            message: e instanceof Error ? e.message : String(e),
            color: "red",
          });
        } finally {
          setBusy(false);
          if (fileRef.current) fileRef.current.value = "";
        }
      },
    });
  };

  return (
    <Card withBorder shadow="sm" radius="md">
      <Stack gap="md">
        <Group gap="xs">
          <IconDatabaseExport
            size={20}
            style={{ color: "var(--mantine-color-blue-filled)" }}
          />
          <Title order={4}>Globales Backup</Title>
        </Group>

        <Text size="sm" c="dimmed">
          Sicherungskopie für den Fall, dass Browser-Daten oder lokale
          Release-Dateien verloren gehen. Enthält den aktuellen Katalog und bis
          zu 10 archivierte Versionen.
        </Text>

        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          <Text size="xs">
            Aktuell: <strong>{categories.length}</strong> Kategorien,{" "}
            <strong>{skills.length}</strong> Skills,{" "}
            <strong>{roles.length}</strong> Rollen,{" "}
            <strong>{storedCatalogReleases?.length ?? 0}</strong> gespeicherte
            Versionen im Archiv.
          </Text>
        </Alert>

        <Group>
          <Button
            leftSection={<IconDatabaseExport size={16} />}
            onClick={handleExport}
            loading={busy}
            variant="light"
            color="blue"
          >
            Backup herunterladen
          </Button>
          <Button
            leftSection={<IconDatabaseImport size={16} />}
            onClick={() => fileRef.current?.click()}
            loading={busy}
            variant="light"
            color="orange"
          >
            Backup wiederherstellen…
          </Button>
          <input
            type="file"
            ref={fileRef}
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={(e) =>
              handleImportFile(e.target.files ? e.target.files[0] : null)
            }
          />
        </Group>

        <Text size="xs" c="dimmed">
          Tipp: Nach wichtigen Releases zusätzlich das globale Backup an einem
          sicheren Ort ablegen (nicht nur im Browser).
        </Text>
      </Stack>
    </Card>
  );
};
