import React, { useRef } from "react";
import {
  Box,
  Stack,
  Text,
  Title,
  Button,
  Group,
  rem,
  Center,
  Anchor,
  Card,
} from "@mantine/core";
import {
  IconRocket,
  IconUpload,
  IconUserPlus,
  IconBulb,
  IconX,
  IconPackageImport,
} from "@tabler/icons-react";
import { Dropzone, FileRejection } from "@mantine/dropzone";
import classes from "./EmptyState.module.css";
import {
  useCatalogAuthoring,
  useCatalogImport,
} from "../../hooks/useCatalogAuthoring";

interface EmptyStateProps {
  onAddEmployee: () => void;
  onAddSkill: () => void;
  /** Load catalog package (Manage release JSON). */
  onLoadCatalog?: () => void;
  onImport: (file: File) => Promise<void>;
  /** Employees already present — focus on catalog, not first-employee CTA. */
  hasEmployees?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onAddEmployee,
  onAddSkill,
  onLoadCatalog,
  onImport,
  hasEmployees = false,
}) => {
  const openRef = useRef<() => void>(null);
  const catalogAuthoring = useCatalogAuthoring();
  const catalogImport = useCatalogImport();
  // Team / Full: offer Manage catalog package when import is allowed
  const showCatalogLoad = catalogImport && !!onLoadCatalog;

  const handleDrop = async (files: File[]) => {
    if (files.length > 0) {
      await onImport(files[0]);
    }
  };

  const title = hasEmployees
    ? "Skill-Katalog fehlt"
    : "Herzlich willkommen";

  const description = (() => {
    if (showCatalogLoad && hasEmployees) {
      return "Es sind bereits Mitarbeiter vorhanden, aber noch keine Skills oder Kategorien. Laden Sie den Skill-Katalog aus SkillGrid Manage, um die Matrix zu füllen.";
    }
    if (showCatalogLoad && !hasEmployees) {
      return "Ihre Skill-Matrix ist noch leer. Laden Sie zuerst den Katalog aus SkillGrid Manage, dann legen Sie Mitarbeiter an.";
    }
    if (hasEmployees) {
      return "Mitarbeiter sind vorhanden, aber noch keine Skills. Erstellen Sie Skills oder importieren Sie einen Katalog.";
    }
    return "Ihre Skill-Matrix ist noch leer. Fügen Sie Mitarbeiter und Skills hinzu, um zu beginnen.";
  })();

  return (
    <Box h="100%" style={{ display: "flex", flexDirection: "column" }}>
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
              borderRadius: "50%",
              backgroundColor: "var(--mantine-color-primary-light)",
              color: "var(--mantine-color-primary-filled)",
            }}
          >
            <IconRocket size={48} stroke={1.5} />
          </Center>

          <Stack align="center" gap={0}>
            <Title order={3} ta="center">
              {title}
            </Title>
            <Text size="md" c="dimmed" ta="center" maw={420}>
              {description}
            </Text>
          </Stack>

          <Group>
            {showCatalogLoad && (
              <Button
                leftSection={<IconPackageImport size={20} />}
                size="md"
                variant={hasEmployees || !catalogAuthoring ? "filled" : "default"}
                onClick={onLoadCatalog}
              >
                Katalog laden
              </Button>
            )}
            {!hasEmployees && (
              <Button
                leftSection={<IconUserPlus size={20} />}
                size="md"
                variant={showCatalogLoad ? "default" : "filled"}
                onClick={onAddEmployee}
              >
                Ersten Mitarbeiter anlegen
              </Button>
            )}
            {catalogAuthoring && (
              <Button
                leftSection={<IconBulb size={20} />}
                variant="default"
                size="md"
                onClick={onAddSkill}
              >
                {hasEmployees ? "Skill erstellen" : "Ersten Skill erstellen"}
              </Button>
            )}
          </Group>

          <Box w="100%" mt="lg">
            <Dropzone
              openRef={openRef}
              onDrop={handleDrop}
              onReject={(files: FileRejection[]) =>
                console.log("rejected files", files)
              }
              maxSize={5 * 1024 ** 2}
              accept={["application/json"]}
              radius="md"
              classNames={{ root: classes.dropzone }}
            >
              <Stack
                align="center"
                gap="xs"
                style={{
                  minHeight: rem(100),
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <Dropzone.Accept>
                  <IconUpload
                    style={{
                      width: rem(40),
                      height: rem(40),
                      color: "var(--mantine-color-blue-6)",
                    }}
                    stroke={1.5}
                  />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX
                    style={{
                      width: rem(40),
                      height: rem(40),
                      color: "var(--mantine-color-red-6)",
                    }}
                    stroke={1.5}
                  />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconPackageImport
                    style={{
                      width: rem(40),
                      height: rem(40),
                      color: "var(--mantine-color-dimmed)",
                    }}
                    stroke={1.5}
                  />
                </Dropzone.Idle>

                <Text size="sm" c="dimmed" inline>
                  Daten aus einem{" "}
                  <Anchor
                    component="button"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRef.current?.();
                    }}
                    style={{ pointerEvents: "all" }}
                  >
                    Backup wiederherstellen
                  </Anchor>
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
