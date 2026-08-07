import React from "react";
import {
  Title,
  Group,
  Button,
  Stack,
  Card,
  Text,
  Box,
  Alert,
  Accordion,
} from "@mantine/core";
import { IconAlertCircle, IconTrash } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useStore, useCapabilities } from "../store/hooks";

interface SystemDangerZoneProps {
  /** Manage: only catalog entities are relevant; wording differs. */
  catalogOnly?: boolean;
}

export const SystemDangerZone: React.FC<SystemDangerZoneProps> = ({
  catalogOnly = false,
}) => {
  const clearAllData = useStore((s) => s.clearAllData);
  const { displayName } = useCapabilities();

  const handleReset = () => {
    modals.openConfirmModal({
      title: catalogOnly ? "Katalog zurücksetzen" : "System zurücksetzen",
      centered: true,
      children: (
        <Text size="sm">
          {catalogOnly
            ? "ACHTUNG: Alle Skills, Kategorien und Rollen in dieser Manage-Datenbank werden gelöscht. Versionsverlauf und freigegebene Meta-Daten gehen ebenfalls verloren."
            : "ACHTUNG: Möchten Sie wirklich ALLE Daten löschen? Dies kann nicht rückgängig gemacht werden!"}
        </Text>
      ),
      labels: {
        confirm: catalogOnly ? "Katalog leeren" : "Alles löschen",
        cancel: "Abbrechen",
      },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await clearAllData();
          notifications.show({
            title: "Zurückgesetzt",
            message: catalogOnly
              ? "Katalog-Datenbank wurde geleert."
              : "Datenbank wurde vollständig geleert.",
            color: "blue",
          });
          setTimeout(() => window.location.reload(), 1000);
        } catch {
          notifications.show({
            title: "Fehler",
            message: "Fehler beim Zurücksetzen.",
            color: "red",
          });
        }
      },
    });
  };

  return (
    <Stack gap="lg">
      <Card
        withBorder
        shadow="sm"
        radius="md"
        style={{ borderColor: "var(--mantine-color-red-filled)" }}
        p={0}
        padding={0}
      >
        {/* Accordion = same chevron placement as Full RoleManager */}
        <Accordion chevronPosition="right" variant="default" radius="md">
          <Accordion.Item value="danger" style={{ border: "none" }}>
            <Accordion.Control
              icon={
                <IconAlertCircle
                  size={20}
                  style={{ color: "var(--mantine-color-red-filled)" }}
                />
              }
            >
              <Title order={4} c="red">
                Gefahrenzone
              </Title>
            </Accordion.Control>
            <Accordion.Panel>
              <Box>
                <Text fw={600} size="sm">
                  {catalogOnly
                    ? "Katalog-Datenbank leeren"
                    : "Datenbank vollständig leeren"}
                </Text>
                <Text size="xs" c="dimmed" mb="sm">
                  {catalogOnly
                    ? `Löscht Skills, Kategorien und Rollen in ${displayName} unwiderruflich (lokaler Browser-Speicher).`
                    : "Löscht alle Inhalte (Mitarbeiter, Kategorien, Skills und Assessments) unwiderruflich aus der lokalen Datenbank."}
                </Text>
                <Button
                  variant="outline"
                  color="red"
                  size="xs"
                  leftSection={<IconTrash size={14} />}
                  onClick={handleReset}
                >
                  {catalogOnly ? "Katalog zurücksetzen" : "System zurücksetzen"}
                </Button>
              </Box>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Card>

      <Alert icon={<IconAlertCircle size={16} />} color="gray" radius="md">
        <Text size="xs">
          <strong>Wichtig:</strong> Daten liegen nur in diesem Browser. Nach
          Änderungen am Katalog immer eine{" "}
          <strong>Version freigeben</strong> und die Datei sichern bzw. an Teams
          verteilen.
        </Text>
      </Alert>
    </Stack>
  );
};
