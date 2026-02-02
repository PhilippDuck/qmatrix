import React, { useRef } from "react";
import { Box, Stack, Text, Title, Button, Group, useMantineTheme, rem, Center, Anchor, Card } from "@mantine/core";
import { IconRocket, IconUpload, IconUserPlus, IconBulb, IconX, IconPackageImport } from "@tabler/icons-react";
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
        }}
        p="xl"
      >
        <Stack align="center" gap="xl" style={{ maxWidth: 550 }}>
            <Center
              style={{
                width: rem(80),
                height: rem(80),
                borderRadius: '50%',
                backgroundColor: 'var(--mantine-color-primary-light)',
                color: 'var(--mantine-color-primary-filled)',
              }}
            >
              <IconRocket size={48} stroke={1.5} />
            </Center>
            
            <Stack align="center" gap={0}>
                <Title order={3} ta="center">Herzlich willkommen</Title>
                <Text size="md" c="dimmed" ta="center" maw={400}>
                    Ihre Skill-Matrix ist noch leer. Fügen Sie Mitarbeiter und Skills hinzu, um zu beginnen.
                </Text>
            </Stack>

            <Group>
              <Button
                leftSection={<IconUserPlus size={20} />}
                size="md"
                onClick={onAddEmployee}
              >
                Ersten Mitarbeiter anlegen
              </Button>
              <Button
                leftSection={<IconBulb size={20} />}
                variant="default"
                size="md"
                onClick={onAddSkill}
              >
                Ersten Skill erstellen
              </Button>
            </Group>
            
            <Box w="100%" mt="lg">
                <Dropzone
                    openRef={openRef}
                    onDrop={handleDrop}
                    onReject={(files: FileRejection[]) => console.log('rejected files', files)}
                    maxSize={5 * 1024 ** 2}
                    accept={[MIME_TYPES.json]}
                    radius="md"
                     styles={(theme) => ({
                        root: {
                          border: `1px dashed ${theme.colors.gray[4]}`,
                          backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
                          transition: 'background-color 150ms ease, border-color 150ms ease',
                          '&:hover': {
                            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[1],
                          },
                          '&[data-accept]': {
                            backgroundColor: theme.colors.blue[0],
                            borderColor: theme.colors.blue[6],
                          },
                          '&[data-reject]': {
                            backgroundColor: theme.colors.red[0],
                            borderColor: theme.colors.red[6],
                          }
                        },
                     })}
                >
                    <Stack align="center" gap="xs" style={{ minHeight: rem(100), justifyContent: 'center', pointerEvents: 'none' }}>
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
                            <IconPackageImport
                              style={{ width: rem(40), height: rem(40), color: 'var(--mantine-color-dimmed)' }}
                              stroke={1.5}
                            />
                          </Dropzone.Idle>

                        <Text size="sm" c="dimmed" inline>
                            Daten aus einem <Anchor component="button" type="button" onClick={(e) => { e.stopPropagation(); openRef.current?.()}} style={{pointerEvents: 'all'}}>Backup wiederherstellen</Anchor>
                        </Text>
                         <Text size="xs" c="dimmed">
                            JSON-Datei hierher ziehen
                          </Text>
                    </Stack>
                </Dropzone>
            </Box>
        </Stack>
      </Card>
    </Box>
  );
};
