import React, { useRef, useState, useEffect } from "react";
import {
  Title,
  Group,
  Button,
  Stack,
  Card,
  Text,
  Alert,
  Box,
  Divider,
  SimpleGrid,
  Modal,
  Table,
  Badge,
  Checkbox,
  ScrollArea,
} from "@mantine/core";
import {
  IconDownload,
  IconUpload,
  IconAlertCircle,
  IconHistory,
  IconTrash,
  IconGitMerge,
  IconArrowsDiff,
  IconCheck,
} from "@tabler/icons-react";
import { useData, MergeReport, MergeDiff, MergeItemDiff } from "../context/DataContext";
import { useDisclosure } from "@mantine/hooks";

interface ActionInfo {
  type: string;
  date: string;
}

export const DataManagement = () => {
  const { exportData, importData, mergeData, diffData, applyMerge, employees, skills } = useData();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mergeInputRef = useRef<HTMLInputElement>(null);
  const [lastAction, setLastAction] = useState<ActionInfo | null>(null);
  const [mergeReport, setMergeReport] = useState<MergeReport | null>(null);
  const [currentDiff, setCurrentDiff] = useState<MergeDiff | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [resultOpened, { open: openResult, close: closeResult }] = useDisclosure(false);
  const [diffOpened, { open: openDiff, close: closeDiff }] = useDisclosure(false);

  useEffect(() => {
    const savedAction = localStorage.getItem("last_data_action");
    if (savedAction) {
      setLastAction(JSON.parse(savedAction));
    }
  }, []);

  const updateTimestamp = (type: string) => {
    const actionInfo: ActionInfo = {
      type,
      date: new Date().toLocaleString("de-DE"),
    };
    localStorage.setItem("last_data_action", JSON.stringify(actionInfo));
    setLastAction(actionInfo);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      await importData(text);
      updateTimestamp("Import");
      alert("Daten erfolgreich importiert!");
      window.location.reload();
    } catch (error: any) {
      alert("Import fehlgeschlagen: " + error.message);
    }
  };

  const handleMerge = async (file: File | null) => {
    if (!file) return;
    setIsMerging(true);
    try {
      const text = await file.text();
      const diff = await diffData(text);

      // Filter out identical items and select everything that is newer by default
      const relevantItems = diff.items.filter(item => item.type !== 'identical');
      setCurrentDiff({ items: relevantItems });

      // Auto-select everything that is NOT a conflict
      const autoSelected = relevantItems
        .filter(item => item.type === 'new' || item.type === 'update')
        .map(item => `${item.storeName}-${item.id}`);

      setSelectedIds(autoSelected);
      openDiff();
    } catch (error: any) {
      alert("Fehler beim Analysieren: " + error.message);
    } finally {
      setIsMerging(false);
    }
  };

  const executeMerge = async () => {
    if (!currentDiff) return;
    setIsMerging(true);
    try {
      const report = await applyMerge(currentDiff, selectedIds);
      setMergeReport(report);
      updateTimestamp("Merge");
      closeDiff();
      openResult();
    } catch (error: any) {
      alert("Fehler beim Abgleich: " + error.message);
    } finally {
      setIsMerging(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(current =>
      current.includes(id) ? current.filter(i => i !== id) : [...current, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === (currentDiff?.items.length || 0)) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentDiff?.items.map(i => `${i.storeName}-${i.id}`) || []);
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
              <Stack gap={0} align="center" style={{ minWidth: 100 }}>
                <Text size="xs" c="dimmed" mb={2}>Daten-Fingerprint</Text>
                <Badge
                  variant="outline"
                  color="gray"
                  size="lg"
                  styles={{ label: { fontFamily: 'monospace', letterSpacing: '1px' } }}
                  title="Dieser Hash-Code ist identisch, wenn zwei Personen denselben Datenstand haben."
                >
                  {useData().dataHash || "CALC..."}
                </Badge>
              </Stack>
              <Divider orientation="vertical" />
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

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
          {/* Export Bereich */}
          <Card withBorder shadow="sm" radius="md">
            <Stack gap="md" h="100%" justify="space-between">
              <Box>
                <Group gap="xs" mb="sm">
                  <IconDownload size={20} style={{ color: "var(--mantine-color-blue-filled)" }} />
                  <Title order={4}>Backup</Title>
                </Group>
                <Text size="xs" c="dimmed">
                  Exportiere alle Mitarbeiter, Kategorien, Skills und Bewertungen
                  als JSON-Datei.
                </Text>
              </Box>
              <Button
                leftSection={<IconDownload size={16} />}
                onClick={() =>
                  exportData().then(() => updateTimestamp("Export"))
                }
                variant="light"
                color="blue"
              >
                Export starten
              </Button>
            </Stack>
          </Card>

          {/* Merge Bereich */}
          <Card withBorder shadow="sm" radius="md">
            <Stack gap="md" h="100%" justify="space-between">
              <Box>
                <Group gap="xs" mb="sm">
                  <IconGitMerge size={20} style={{ color: "var(--mantine-color-grape-filled)" }} />
                  <Title order={4}>Datenabgleich</Title>
                </Group>
                <Text size="xs" c="dimmed">
                  Vergleicht ein Backup mit der aktuellen Datenbank. Nur neuere oder
                  fehlende Daten werden hinzugefügt.
                </Text>
              </Box>
              <Button
                leftSection={<IconGitMerge size={16} />}
                onClick={() => mergeInputRef.current?.click()}
                variant="light"
                color="grape"
                loading={isMerging}
              >
                Abgleich starten
              </Button>
              <input
                type="file"
                ref={mergeInputRef}
                onChange={(e) => handleMerge(e.target.files ? e.target.files[0] : null)}
                style={{ display: "none" }}
                accept=".json"
              />
            </Stack>
          </Card>

          {/* Import Bereich */}
          <Card withBorder shadow="sm" radius="md">
            <Stack gap="md" h="100%" justify="space-between">
              <Box>
                <Group gap="xs" mb="sm">
                  <IconUpload size={20} style={{ color: "var(--mantine-color-orange-filled)" }} />
                  <Title order={4}>Wiederherstellen</Title>
                </Group>
                <Text size="xs" c="dimmed">
                  Lade eine JSON-Datei hoch. Bestehende Daten werden dabei vollständig
                  überschrieben.
                </Text>
              </Box>
              <Button
                leftSection={<IconUpload size={16} />}
                onClick={handleImportClick}
                variant="light"
                color="orange"
              >
                Überschreiben
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleImport(e.target.files ? e.target.files[0] : null)}
                style={{ display: "none" }}
                accept=".json"
              />
            </Stack>
          </Card>
        </SimpleGrid>

        {/* Modal für die Auswahl der Änderungen */}
        <Modal
          opened={diffOpened}
          onClose={closeDiff}
          title="Änderungen auswählen"
          size="90%"
          centered
        >
          <Stack gap="md">
            <Text size="sm">
              Folgende Unterschiede wurden gefunden. Bitte wählen Sie aus, welche Änderungen übernommen werden sollen.
            </Text>

            <ScrollArea h={400} offsetScrollbars>
              <Table withColumnBorders verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 40 }}>
                      <Checkbox
                        checked={selectedIds.length === (currentDiff?.items.length || 0) && (currentDiff?.items.length || 0) > 0}
                        indeterminate={selectedIds.length > 0 && selectedIds.length < (currentDiff?.items.length || 0)}
                        onChange={toggleAll}
                      />
                    </Table.Th>
                    <Table.Th>Element</Table.Th>
                    <Table.Th style={{ width: 150 }}>Status</Table.Th>
                    <Table.Th style={{ minWidth: 200 }}>Details (Zeitstempel)</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {currentDiff?.items.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={4} align="center">
                        <Text size="sm" c="dimmed" py="md">Keine relevanten Unterschiede gefunden.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    currentDiff?.items.map((item) => {
                      const fullId = `${item.storeName}-${item.id}`;
                      const isSelected = selectedIds.includes(fullId);

                      return (
                        <Table.Tr key={fullId}>
                          <Table.Td>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleSelection(fullId)}
                            />
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={500}>{item.label}</Text>
                            <Text size="xs" c="dimmed">{item.storeName}</Text>
                          </Table.Td>
                          <Table.Td>
                            {item.type === 'new' && <Badge color="green" size="sm">Neu</Badge>}
                            {item.type === 'update' && <Badge color="blue" size="sm">Update</Badge>}
                            {item.type === 'conflict' && <Badge color="orange" size="sm">Konflikt</Badge>}
                          </Table.Td>
                          <Table.Td>
                            <Stack gap={2}>
                              {item.localTimestamp ? (
                                <Text size="xs" c="dimmed">
                                  Lokal: {new Date(item.localTimestamp).toLocaleString("de-DE")}
                                </Text>
                              ) : (
                                <Text size="xs" fs="italic" c="dimmed">Lokal: - nicht vorhanden -</Text>
                              )}
                              {item.remoteTimestamp ? (
                                <Text size="xs" c="blue" fw={500}>
                                  Backup: {new Date(item.remoteTimestamp).toLocaleString("de-DE")}
                                </Text>
                              ) : (
                                <Text size="xs" fs="italic" c="dimmed">Backup: - kein Zeitstempel -</Text>
                              )}
                            </Stack>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={closeDiff}>Abbrechen</Button>
              <Button
                onClick={executeMerge}
                loading={isMerging}
                disabled={selectedIds.length === 0}
              >
                Auswahl übernehmen ({selectedIds.length})
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Modal für das Ergebnis */}
        <Modal opened={resultOpened} onClose={closeResult} title="Ergebnis des Datenabgleichs" centered size="md">
          <Stack gap="md">
            <Table withColumnBorders withTableBorder verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 40 }}></Table.Th>
                  <Table.Th>Aktion</Table.Th>
                  <Table.Th ta="right">Anzahl</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><IconCheck size={16} color="green" /></Table.Td>
                  <Table.Td><Text size="sm">Neu hinzugefügt</Text></Table.Td>
                  <Table.Td ta="right"><Badge color="green">{mergeReport?.added || 0}</Badge></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><IconArrowsDiff size={16} color="blue" /></Table.Td>
                  <Table.Td><Text size="sm">Aktualisiert</Text></Table.Td>
                  <Table.Td ta="right"><Badge color="blue">{mergeReport?.updated || 0}</Badge></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><IconHistory size={16} color="gray" /></Table.Td>
                  <Table.Td><Text size="sm">Übersprungen</Text></Table.Td>
                  <Table.Td ta="right"><Badge color="gray">{mergeReport?.skipped || 0}</Badge></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><IconAlertCircle size={16} color="orange" /></Table.Td>
                  <Table.Td><Text size="sm">Konflikte ignoriert</Text></Table.Td>
                  <Table.Td ta="right"><Badge color="orange">{mergeReport?.conflicts || 0}</Badge></Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Alert color="blue" variant="light">
              Die ausgewählten Änderungen wurden erfolgreich übernommen und die Datenbank wurde aktualisiert.
            </Alert>

            <Button onClick={() => { closeResult(); window.location.reload(); }} fullWidth>
              Fertig
            </Button>
          </Stack>
        </Modal>

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
      </Stack >
    </Box >
  );
};
