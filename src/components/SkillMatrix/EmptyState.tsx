import React, { useRef } from "react";
import { Box, Card, Stack, Text, Title, Button, Group, useMantineTheme, rem } from "@mantine/core";
import { IconDatabaseOff, IconUpload, IconUserPlus, IconBulb, IconX } from "@tabler/icons-react";
import { Dropzone, MIME_TYPES, FileRejection } from "@mantine/dropzone";

interface EmptyStateProps {
  onAddEmployee: () => void;
  onAddSkill: () => void;
  onImport: (file: File) => Promise<void>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onAddEmployee, onAddSkill, onImport }) => {
  const theme = useMantineTheme();
  const openRef = useRef<() => void>(null);

  const handleDrop = async (files: File[]) => {
    if (files.length > 0) {
      await onImport(files[0]);
    }
  };

  return (
    <Box h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
      <Group mb="lg" justify="space-between">
        <Title order={2}>Skill-Matrix</Title>
      </Group>

      <Card
        withBorder
        radius="md"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          borderStyle: "dashed",
          backgroundColor: "var(--mantine-color-body)",
        }}
      >
        <Stack align="center" gap="xl" style={{ maxWidth: 500 }}>
          <Stack align="center" gap="xs">
            <IconDatabaseOff
              size={64}
              style={{ color: "var(--mantine-color-dimmed)" }}
              stroke={1.5}
            />
            <Text fw={700} size="xl" ta="center">
              Willkommen bei SkillGrid
            </Text>
            <Text size="md" c="dimmed" ta="center">
              Aktuell sind keine Daten vorhanden. Du kannst direkt loslegen oder ein Backup wiederherstellen.
            </Text>
          </Stack>

          <Group>
            <Button
              leftSection={<IconUserPlus size={20} />}
              size="md"
              onClick={onAddEmployee}
            >
              Mitarbeiter anlegen
            </Button>
            <Button
              leftSection={<IconBulb size={20} />}
              variant="light"
              size="md"
              onClick={onAddSkill}
            >
              Skill erstellen
            </Button>
          </Group>

          <Box w="100%">
            <Text size="sm" fw={500} mb="xs" ta="center" c="dimmed">
              Oder Backup wiederherstellen
            </Text>
            <Dropzone
              openRef={openRef}
              onDrop={handleDrop}
              onReject={(files: FileRejection[]) => console.log('rejected files', files)}
              maxSize={5 * 1024 ** 2}
              accept={[MIME_TYPES.json]}
              radius="md"
              styles={{
                root: {
                  borderColor: 'var(--mantine-color-dimmed)',
                  borderStyle: 'dashed',
                  borderWidth: 1,
                  backgroundColor: 'var(--mantine-color-body)',
                  '&:hover': {
                    backgroundColor: 'var(--mantine-color-gray-0)',
                  },
                }
              }}
            >
              <Group justify="center" gap="xl" style={{ minHeight: rem(80), pointerEvents: 'none' }}>
                <Dropzone.Accept>
                  <IconUpload
                    style={{ width: rem(40), height: rem(40), color: 'var(--mantine-color-blue-6)' }}
                    stroke={1.5}
                  />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX
                    style={{ width: rem(40), height: rem(40), color: 'var(--mantine-color-red-6)' }}
                    stroke={1.5}
                  />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconUpload
                    style={{ width: rem(40), height: rem(40), color: 'var(--mantine-color-dimmed)' }}
                    stroke={1.5}
                  />
                </Dropzone.Idle>

                <div style={{ textAlign: 'center' }}>
                  <Text size="sm" inline>
                    Backup-Datei hierher ziehen oder klicken
                  </Text>
                </div>
              </Group>
            </Dropzone>
          </Box>
        </Stack>
      </Card>
    </Box>
  );
};
