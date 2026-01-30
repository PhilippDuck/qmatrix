import React, { useRef, useState, useEffect } from "react";
import {
  Title,
  Group,
  Button,
  Stack,
  Card,
  Text,
  FileInput,
  Alert,
  Box,
  Divider,
} from "@mantine/core";
import {
  IconDownload,
  IconUpload,
  IconAlertCircle,
  IconHistory,
  IconTrash,
} from "@tabler/icons-react";
import { useData } from "../context/DataContext";

export const DataManagement = () => {
  const { exportData, importData, employees, skills } = useData();

  const fileInputRef = useRef(null);
  const [lastAction, setLastAction] = useState(null);

  useEffect(() => {
    const savedAction = localStorage.getItem("last_data_action");
    if (savedAction) {
      setLastAction(JSON.parse(savedAction));
    }
  }, []);

  const updateTimestamp = (type) => {
    const actionInfo = {
      type,
      date: new Date().toLocaleString("de-DE"),
    };
    localStorage.setItem("last_data_action", JSON.stringify(actionInfo));
    setLastAction(actionInfo);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      await importData(text);
      updateTimestamp("Import");
      alert("Daten erfolgreich importiert!");
      window.location.reload();
    } catch (error) {
      alert("Import fehlgeschlagen: " + error.message);
    }
  };

  const handleReset = async () => {
    if (
      window.confirm(
        "ACHTUNG: Möchten Sie wirklich ALLE Daten löschen? Dies kann nicht rückgängig gemacht werden!",
      )
    ) {
      try {
        await importData(
          JSON.stringify({
            employees: [],
            categories: [],
            subcategories: [],
            skills: [],
            assessments: [],
          }),
        );
        updateTimestamp("Reset");
        alert("Datenbank wurde vollständig geleert.");
        window.location.reload();
      } catch (error) {
        alert("Fehler beim Zurücksetzen.");
      }
    }
  };

  return (
    <Box style={{ width: "100%" }}>
      <Title order={2} mb="lg">
        Datenverwaltung
      </Title>

      <Stack gap="lg" style={{ width: "100%" }}>
        {/* System-Status Card */}
        <Card withBorder shadow="xs" radius="md">
          <Group justify="space-between">
            <Stack gap={2}>
              <Group gap="xs">
                <IconHistory size={18} style={{ color: "var(--mantine-color-dimmed)" }} />
                <Text fw={600} size="sm">
                  System-Status
                </Text>
              </Group>
              {lastAction ? (
                <Text size="xs" c="dimmed">
                  Letzte Aktion: {lastAction.type} am {lastAction.date}
                </Text>
              ) : (
                <Text size="xs" c="dimmed">
                  Keine Aktivitäten aufgezeichnet.
                </Text>
              )}
            </Stack>
            <Group gap="xl">
              <Stack gap={0} align="center">
                <Text fw={700} size="xl">
                  {employees.length}
                </Text>
                <Text size="xs" c="dimmed">
                  Mitarbeiter
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
            </Group>
          </Group>
        </Card>

        <Group grow align="flex-start">
          {/* Export Bereich */}
          <Card withBorder shadow="sm" radius="md">
            <Stack gap="md">
              <Group gap="xs">
                <IconDownload size={20} style={{ color: "var(--mantine-color-dimmed)" }} />
                <Title order={4}>Backup</Title>
              </Group>
              <Text size="xs" c="dimmed">
                Exportiere alle Mitarbeiter, Kategorien, Skills und Bewertungen
                als JSON-Datei.
              </Text>
              <Button
                leftSection={<IconDownload size={16} />}
                onClick={() =>
                  exportData().then(() => updateTimestamp("Export"))
                }
                variant="light"
              >
                Export starten
              </Button>
            </Stack>
          </Card>

          {/* Import Bereich */}
          <Card withBorder shadow="sm" radius="md">
            <Stack gap="md">
              <Group gap="xs">
                <IconUpload size={20} style={{ color: "var(--mantine-color-dimmed)" }} />
                <Title order={4}>Wiederherstellen</Title>
              </Group>
              <Text size="xs" c="dimmed">
                Lade eine JSON-Datei hoch. Bestehende Daten werden dabei
                überschrieben.
              </Text>
              <Button
                leftSection={<IconUpload size={16} />}
                onClick={handleImportClick}
                variant="light"
              >
                Datei wählen
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleImport(e.target.files[0])}
                style={{ display: "none" }}
                accept=".json"
              />
            </Stack>
          </Card>
        </Group>

        {/* Danger Zone */}
        <Card
          withBorder
          shadow="sm"
          radius="md"
          style={{ borderColor: "var(--mantine-color-red-filled)" }}
        >
          <Stack gap="md">
            <Group gap="xs">
              <IconAlertCircle size={20} style={{ color: "var(--mantine-color-red-filled)" }} />
              <Title order={4} c="red">
                Gefahrenzone
              </Title>
            </Group>

            <Divider />

            <Box>
              <Text fw={600} size="sm">
                Datenbank vollständig leeren
              </Text>
              <Text size="xs" c="dimmed" mb="sm">
                Löscht alle Inhalte (Mitarbeiter, Kategorien, Skills und
                Assessments) unwiderruflich aus der lokalen Datenbank.
              </Text>
              <Button
                variant="outline"
                color="red"
                size="xs"
                leftSection={<IconTrash size={14} />}
                onClick={handleReset}
              >
                System zurücksetzen
              </Button>
            </Box>
          </Stack>
        </Card>

        <Alert icon={<IconAlertCircle size={16} />} color="gray" radius="md">
          <Text size="xs">
            <strong>Wichtig:</strong> Da die Daten lokal im Browser gespeichert
            werden, sollten Sie regelmäßig ein Backup (Export) erstellen, um
            Datenverlust zu vermeiden.
          </Text>
        </Alert>
      </Stack>
    </Box>
  );
};
