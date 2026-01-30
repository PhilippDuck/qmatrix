import React, { useRef } from "react";
import {
  Container,
  Title,
  Group,
  Button,
  Stack,
  Card,
  Text,
  FileInput,
  Alert,
} from "@mantine/core";
import { IconDownload, IconUpload, IconAlertCircle } from "@tabler/icons-react";
import { useData } from "../context/DataContext";

export const DataManagement: React.FC = () => {
  const { exportData, importData } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      await exportData();
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export fehlgeschlagen");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (file: File | null) => {
    if (!file) return;

    try {
      const text = await file.text();
      await importData(text);
      alert("Daten erfolgreich importiert!");
    } catch (error) {
      console.error("Import failed:", error);
      alert(
        "Import fehlgeschlagen: " +
          (error instanceof Error ? error.message : "Unbekannter Fehler"),
      );
    }
  };

  return (
    <>
      <Title order={2} mb="lg">
        Datenverwaltung
      </Title>

      <Stack gap="lg" style={{ width: "100%" }}>
        <Card withBorder style={{ width: "100%" }}>
          <Stack gap="md">
            <div>
              <Title order={4} mb="sm">
                Daten Backup
              </Title>
              <Text size="sm" c="dimmed" mb="md">
                Exportiere alle Mitarbeiter, Kategorien, Skills und Bewertungen
                als JSON-Datei.
              </Text>
              <Button
                leftSection={<IconDownload size={16} />}
                onClick={handleExport}
                fullWidth
              >
                Daten Exportieren
              </Button>
            </div>
          </Stack>
        </Card>

        <Card withBorder style={{ width: "100%" }}>
          <Stack gap="md">
            <div>
              <Title order={4} mb="sm">
                Daten Wiederherstellen
              </Title>
              <Text size="sm" c="dimmed" mb="md">
                Importiere Daten aus einer zuvor exportierten JSON-Datei. Dies
                wird alle vorhandenen Daten ersetzen.
              </Text>
              <Button
                leftSection={<IconUpload size={16} />}
                onClick={handleImportClick}
                color="orange"
                fullWidth
              >
                Daten Importieren
              </Button>
              <FileInput
                ref={fileInputRef}
                accept="application/json"
                onChange={handleImport}
                style={{ display: "none" }}
              />
            </div>
          </Stack>
        </Card>

        <Alert icon={<IconAlertCircle size={16} />} color="yellow">
          <strong>Wichtig:</strong> Beim Import werden alle vorhandenen Daten
          überschrieben! Erstellen Sie vorher ein Backup.
        </Alert>
      </Stack>
    </>
  );
};
