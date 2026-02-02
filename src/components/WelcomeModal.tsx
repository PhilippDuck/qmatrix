import React, { useEffect, useState } from 'react';
import { Modal, Text, Button, Checkbox, Stack, Group, Title, ThemeIcon, List, Box } from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { IconRocket, IconListCheck, IconUsers, IconCertificate, IconArrowRight } from '@tabler/icons-react';

export function WelcomeModal() {
    const [seen, setSeen] = useLocalStorage({ key: 'skillgrid-welcome-seen-v1', defaultValue: false });
    const [opened, setOpened] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    useEffect(() => {
        // Show modal if not marked as seen
        if (!seen) {
            // Small delay to allow app to render first
            const timer = setTimeout(() => {
                setOpened(true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [seen]);

    const handleClose = () => {
        if (dontShowAgain) {
            setSeen(true);
        }
        setOpened(false);
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={
                <Group>
                    <ThemeIcon size="lg" variant="light" radius="md">
                        <IconRocket size={20} />
                    </ThemeIcon>
                    <Title order={3} size="h3">Willkommen bei SkillGrid</Title>
                </Group>
            }
            size="lg"
            centered
            padding="xl"
            overlayProps={{ opacity: 0.5, blur: 3 }}
            styles={{ title: { fontWeight: 700 } }}
        >
            <Stack gap="lg">
                <Text size="md" c="dimmed">
                    SkillGrid unterstützt Sie dabei, die Kompetenzen Ihres Teams effektiv zu verwalten, Qualifizierungsbedarfe zu erkennen und gezielte Entwicklungspläne zu erstellen.
                </Text>

                <Stack gap="xs">
                    <Text fw={700} size="sm" tt="uppercase" c="dimmed">Funktionsübersicht</Text>
                    <List
                        spacing="md"
                        size="sm"
                        center
                        icon={
                            <ThemeIcon color="blue" size={24} radius="xl">
                                <IconListCheck size={16} />
                            </ThemeIcon>
                        }
                    >
                        <List.Item icon={<ThemeIcon color="blue" variant="light" size={32} radius="md"><IconUsers size={20} /></ThemeIcon>}>
                            <Box ml="sm">
                                <Text fw={600}>Mitarbeiter & Organisation</Text>
                                <Text size="xs" c="dimmed">Verwalten Sie Ihr Team, Rollen und Abteilungsstrukturen an einem Ort.</Text>
                            </Box>
                        </List.Item>
                        <List.Item icon={<ThemeIcon color="violet" variant="light" size={32} radius="md"><IconListCheck size={20} /></ThemeIcon>}>
                            <Box ml="sm">
                                <Text fw={600}>Skill-Matrix</Text>
                                <Text size="xs" c="dimmed">Bewerten Sie Ist- und Soll-Zustände für eine transparente Kompetenzübersicht.</Text>
                            </Box>
                        </List.Item>
                        <List.Item icon={<ThemeIcon color="teal" variant="light" size={32} radius="md"><IconCertificate size={20} /></ThemeIcon>}>
                            <Box ml="sm">
                                <Text fw={600}>Qualifizierungspläne</Text>
                                <Text size="xs" c="dimmed">Planen Sie Maßnahmen zur Weiterentwicklung und verfolgen Sie den Fortschritt in der Timeline.</Text>
                            </Box>
                        </List.Item>
                    </List>
                </Stack>

                <Box
                    p="md"
                    style={{
                        borderRadius: '8px',
                        backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))',
                        border: '1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))'
                    }}
                >
                    <Text size="sm" fw={700} mb="xs">🚀 Empfohlener Start:</Text>
                    <List type="ordered" size="sm" spacing={4} withPadding>
                        <List.Item>Definieren Sie unter <b>Stammdaten</b> Ihre Abteilungen und Rollen.</List.Item>
                        <List.Item>Erstellen Sie erste <b>Skills</b> und Kategorien.</List.Item>
                        <List.Item>Fügen Sie <b>Mitarbeiter</b> hinzu und weisen Sie ihnen Rollen zu.</List.Item>
                    </List>
                </Box>

                <Group justify="space-between" mt="md" align="center">
                    <Checkbox
                        label="Nicht mehr anzeigen"
                        checked={dontShowAgain}
                        onChange={(e) => setDontShowAgain(e.currentTarget.checked)}
                        style={{ cursor: 'pointer' }}
                    />
                    <Button size="md" rightSection={<IconArrowRight size={18} />} onClick={handleClose}>
                        SkillGrid starten
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
