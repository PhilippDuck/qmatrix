import React, { useEffect, useState } from "react";
import {
  Modal,
  Text,
  ScrollArea,
  Group,
  ThemeIcon,
  Code,
  Accordion,
  Title,
  Stack,
} from "@mantine/core";
import { IconCheck, IconList, IconRocket } from "@tabler/icons-react";
// packages/shared/src/CHANGELOG.md → symlink to repo-root CHANGELOG.md (Full app history)
import defaultChangelogMarkdown from "../CHANGELOG.md?raw";

interface ChangelogModalProps {
  opened: boolean;
  onClose: () => void;
  /**
   * App-specific changelog markdown. When omitted, falls back to the Full/repo
   * CHANGELOG (legacy single-app history). Team/Manage should pass their own file.
   */
  content?: string;
  /** Modal title suffix, e.g. "SkillGrid Team" */
  appName?: string;
}

// Simple markdown parsing for the changelog
// Assumes format:
// ## vX.X.X
// - [x] Feature A
// - [ ] Todo B
const ChangelogRenderer = ({ content }: { content: string }) => {
  if (!content) return null;

  // Split content by "## " but keep the structure predictable
  const rawParts = content.split(/^## /gm);

  // Filter out parts that are clearly not versions (like the title "Changelog\n")
  const parts = rawParts.filter((p) => {
    const firstLine = p.split("\n")[0].trim();
    return (
      firstLine.startsWith("[") ||
      firstLine.startsWith("v") ||
      /\d/.test(firstLine)
    );
  });

  const parseLine = (text: string) => {
    const segments = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return segments.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <Text span fw={700} key={i}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <Code key={i}>{part.slice(1, -1)}</Code>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (parts.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        Noch keine Changelog-Einträge vorhanden.
      </Text>
    );
  }

  return (
    <Accordion
      defaultValue={parts[0]?.split("\n")[0].trim()}
      variant="separated"
    >
      {parts.map((part, index) => {
        const lines = part.split("\n");
        const version = lines[0].trim();
        const bodyLines = lines.slice(1);
        const isLatest = index === 0;

        return (
          <Accordion.Item key={version} value={version}>
            <Accordion.Control>
              <Group>
                <Text fw={700}>{version}</Text>
                {isLatest && <Code color="green">Aktuell</Code>}
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                {bodyLines.map((line, i) => {
                  const trimmedLine = line.trim();
                  if (!trimmedLine) return <div key={i} style={{ height: 4 }} />;

                  if (trimmedLine.startsWith("- [x]")) {
                    return (
                      <Group key={i} gap="xs" align="flex-start">
                        <ThemeIcon
                          size="xs"
                          color="teal"
                          variant="light"
                          mt={4}
                        >
                          <IconCheck size={10} />
                        </ThemeIcon>
                        <Text size="sm" style={{ flex: 1 }}>
                          {parseLine(trimmedLine.replace("- [x]", "").trim())}
                        </Text>
                      </Group>
                    );
                  }
                  if (trimmedLine.startsWith("- [ ]")) {
                    return (
                      <Group key={i} gap="xs" align="flex-start">
                        <ThemeIcon
                          size="xs"
                          color="gray"
                          variant="light"
                          mt={4}
                        >
                          <IconList size={10} />
                        </ThemeIcon>
                        <Text size="sm" c="dimmed" style={{ flex: 1 }}>
                          {parseLine(trimmedLine.replace("- [ ]", "").trim())}
                        </Text>
                      </Group>
                    );
                  }
                  if (trimmedLine.startsWith("###")) {
                    return (
                      <Text
                        key={i}
                        fw={700}
                        mt="sm"
                        size="sm"
                        tt="uppercase"
                        c="dimmed"
                      >
                        {trimmedLine.replace(/#+/g, "").trim()}
                      </Text>
                    );
                  }
                  if (trimmedLine.startsWith("-")) {
                    return (
                      <Group key={i} gap="xs" align="flex-start">
                        <ThemeIcon
                          size="xs"
                          color="blue"
                          variant="light"
                          mt={4}
                        >
                          <IconRocket size={10} />
                        </ThemeIcon>
                        <Text size="sm" style={{ flex: 1 }}>
                          {parseLine(trimmedLine.replace("-", "").trim())}
                        </Text>
                      </Group>
                    );
                  }

                  return (
                    <Text key={i} size="sm">
                      {parseLine(trimmedLine)}
                    </Text>
                  );
                })}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
};

export const ChangelogModal: React.FC<ChangelogModalProps> = ({
  opened,
  onClose,
  content: contentProp,
  appName,
}) => {
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!opened) return;
    if (typeof contentProp === "string" && contentProp.length > 0) {
      setContent(contentProp);
      return;
    }
    setContent(
      typeof defaultChangelogMarkdown === "string"
        ? defaultChangelogMarkdown
        : "Changelog konnte nicht geladen werden."
    );
  }, [opened, contentProp]);

  const titleText = appName
    ? `Changelog · ${appName}`
    : "Changelog & Updates";

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <IconRocket color="var(--mantine-color-blue-6)" />
          <Title order={3}>{titleText}</Title>
        </Group>
      }
      size="lg"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Text c="dimmed" size="sm" mb="md">
        Änderungen und Verbesserungen dieser App im Überblick.
      </Text>
      <ChangelogRenderer content={content} />
    </Modal>
  );
};
