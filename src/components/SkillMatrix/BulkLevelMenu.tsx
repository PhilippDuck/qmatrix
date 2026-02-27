import React from "react";
import { Menu, Badge, Text, Group, Stack, Divider, Tooltip } from "@mantine/core";
import { LEVELS } from "../../constants/skillLevels";

interface BulkLevelMenuProps {
  label: string;
  onSelectLevel: (level: number) => void;
  onSelectTargetLevel?: (targetLevel: number | undefined) => void;
  children: React.ReactNode;
}

export const BulkLevelMenu: React.FC<BulkLevelMenuProps> = ({
  label,
  onSelectLevel,
  onSelectTargetLevel,
  children,
}) => {
  return (
    <Menu shadow="md" width="auto">
      <Menu.Target>{children}</Menu.Target>
      <Menu.Dropdown p="sm">
        <Stack gap="sm">
          <Text size="xs" fw={700} c="dimmed">
            {label}
          </Text>

          {/* Ist-Level Section */}
          <div>
            <Text size="xs" c="dimmed" fw={500} mb={4}>
              Ist-Level setzen
            </Text>
            <Group gap="xs">
              {LEVELS.map((lvl) => (
                <Tooltip
                  key={`ist-${lvl.value}`}
                  label={
                    <Stack gap={2}>
                      <Text size="xs" fw={700}>
                        {lvl.title}
                      </Text>
                      {lvl.description && <Text size="xs">{lvl.description}</Text>}
                    </Stack>
                  }
                  position="top"
                  withArrow
                  openDelay={200}
                >
                  <Badge
                    color={lvl.value === -1 ? "gray.3" : lvl.color}
                    variant={lvl.value <= 0 ? "light" : "filled"}
                    onClick={() => onSelectLevel(lvl.value)}
                    style={{
                      cursor: "pointer",
                      minWidth: 42,
                      fontSize: "10px",
                      opacity: lvl.value === -1 ? 0.6 : 1,
                      border:
                        lvl.value === -1
                          ? "1px dashed var(--mantine-color-default-border)"
                          : "none",
                    }}
                  >
                    {lvl.label}
                  </Badge>
                </Tooltip>
              ))}
            </Group>
          </div>

          {/* Soll-Level Section */}
          {onSelectTargetLevel && (
            <>
              <Divider mb={-4} mt={-4} />
              <div>
                <Text size="xs" c="dimmed" fw={500} mb={4}>
                  Soll-Level setzen
                </Text>
                <Group gap="xs">
                  <Tooltip label="Alle individuellen Ziele entfernen" position="top" withArrow openDelay={200}>
                    <Badge
                      color="gray"
                      variant="light"
                      onClick={() => onSelectTargetLevel(undefined)}
                      style={{ cursor: "pointer", minWidth: 42, fontSize: "10px" }}
                    >
                      Kein
                    </Badge>
                  </Tooltip>
                  {LEVELS.filter((l) => l.value > 0).map((lvl) => (
                    <Tooltip
                      key={`soll-${lvl.value}`}
                      label={
                        <Stack gap={2}>
                          <Text size="xs" fw={700}>
                            {lvl.title}
                          </Text>
                          {lvl.description && <Text size="xs">{lvl.description}</Text>}
                        </Stack>
                      }
                      position="top"
                      withArrow
                      openDelay={200}
                    >
                      <Badge
                        color={lvl.color}
                        variant="light"
                        onClick={() => onSelectTargetLevel(lvl.value)}
                        style={{ cursor: "pointer", minWidth: 42, fontSize: "10px" }}
                      >
                        {lvl.label}
                      </Badge>
                    </Tooltip>
                  ))}
                </Group>
              </div>
            </>
          )}
        </Stack>
      </Menu.Dropdown>
    </Menu>
  );
};
