import React, { useEffect, useState } from "react";
import { Modal, Text, ScrollArea, Group, ThemeIcon, Code, Accordion, Title, Divider, Stack } from "@mantine/core";
import { IconCheck, IconExclamationCircle, IconList, IconRocket } from "@tabler/icons-react";

interface ChangelogModalProps {
    opened: boolean;
    onClose: () => void;
}

// Simple markdown parsing for the changelog
// Assumes format: 
// ## vX.X.X
// - [x] Feature A
// - [ ] Todo B
const ChangelogRenderer = ({ content }: { content: string }) => {
    if (!content) return null;

    // Split content by "## " but keep the structure predictable
    // We want to find blocks starting with "## "
    // Using split, the first element is usually the file title (# Changelog) which we want to skip if it's not a version
    const rawParts = content.split(/^## /gm);

    // Filter out parts that are clearly not versions (like the title "Changelog\n")
    // A version line usually looks like "[2.4.1]..." or "v1.0.0..."
    const parts = rawParts.filter(p => {
        const firstLine = p.split('\n')[0].trim();
        return firstLine.startsWith('[') || firstLine.startsWith('v') || /\d/.test(firstLine);
    });

    const parseLine = (text: string) => {
        // Simple bold parser: **text** -> <Text span fw={700}>text</Text>
        const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <Text span fw={700} key={i}>{part.slice(2, -2)}</Text>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
                return <Code key={i}>{part.slice(1, -1)}</Code>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    return (
        <Accordion defaultValue={parts[0]?.split('\n')[0].trim()} variant="separated">
            {parts.map((part, index) => {
                const lines = part.split('\n');
                const version = lines[0].trim();
                const bodyLines = lines.slice(1);

                // Check if version is current or recent
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

                                    // Parse list items
                                    if (trimmedLine.startsWith('- [x]')) {
                                        return (
                                            <Group key={i} gap="xs" align="flex-start">
                                                <ThemeIcon size="xs" color="teal" variant="light" mt={4}>
                                                    <IconCheck size={10} />
                                                </ThemeIcon>
                                                <Text size="sm" style={{ flex: 1 }}>{parseLine(trimmedLine.replace('- [x]', '').trim())}</Text>
                                            </Group>
                                        );
                                    } else if (trimmedLine.startsWith('- [ ]')) {
                                        return (
                                            <Group key={i} gap="xs" align="flex-start">
                                                <ThemeIcon size="xs" color="gray" variant="light" mt={4}>
                                                    <IconList size={10} />
                                                </ThemeIcon>
                                                <Text size="sm" c="dimmed" style={{ flex: 1 }}>{parseLine(trimmedLine.replace('- [ ]', '').trim())}</Text>
                                            </Group>
                                        );
                                    } else if (trimmedLine.startsWith('###')) {
                                        return <Text key={i} fw={700} mt="sm" size="sm" tt="uppercase" c="dimmed">{trimmedLine.replace(/#+/g, '').trim()}</Text>
                                    } else if (trimmedLine.startsWith('-')) {
                                        return (
                                            <Group key={i} gap="xs" align="flex-start">
                                                <ThemeIcon size="xs" color="blue" variant="light" mt={4}>
                                                    <IconRocket size={10} />
                                                </ThemeIcon>
                                                <Text size="sm" style={{ flex: 1 }}>{parseLine(trimmedLine.replace('-', '').trim())}</Text>
                                            </Group>
                                        )
                                    }

                                    return <Text key={i} size="sm">{parseLine(trimmedLine)}</Text>;
                                })}
                            </Stack>
                        </Accordion.Panel>
                    </Accordion.Item>
                );
            })}
        </Accordion>
    );
};

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ opened, onClose }) => {
    const [content, setContent] = useState("");

    useEffect(() => {
        // Import using raw loader or fetch
        // Since we copied CHANGELOG.md to src/CHANGELOG.md, we can try to import it or fetch it.
        // If it's pure logic, we might need a raw import.
        // In Vite, ?raw is supported.
        import("../../CHANGELOG.md?raw")
            .then(module => setContent(module.default))
            .catch(err => {
                console.error("Failed to load changelog", err);
                setContent("Changelog konnte nicht geladen werden.");
            });
    }, [opened]);

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Group><IconRocket color="var(--mantine-color-blue-6)" /><Title order={3}>Changelog & Updates</Title></Group>}
            size="lg"
            scrollAreaComponent={ScrollArea.Autosize}
        >
            <Text c="dimmed" size="sm" mb="md">
                Alle Änderungen, Verbesserungen und Bugfixes im Überblick.
            </Text>
            <ChangelogRenderer content={content} />
        </Modal>
    );
};
