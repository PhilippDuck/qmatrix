import React from 'react';
import {
    Modal, Text, Stack, Title, ThemeIcon, Group, List, Box
} from '@mantine/core';
import {
    IconShieldLock, IconDeviceFloppy, IconWorldOff, IconTrash, IconEyeOff, IconDownload
} from '@tabler/icons-react';

interface PrivacyModalProps {
    opened: boolean;
    onClose: () => void;
}

export function PrivacyModal({ opened, onClose }: PrivacyModalProps) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group>
                    <ThemeIcon size="lg" variant="light" color="green" radius="md">
                        <IconShieldLock size={20} />
                    </ThemeIcon>
                    <Title order={3}>Datenschutz & Datenspeicherung</Title>
                </Group>
            }
            size="lg"
            centered
            padding="xl"
            overlayProps={{ opacity: 0.5, blur: 3 }}
            styles={{ title: { fontWeight: 700 } }}
        >
            <Stack gap="lg">
                <Box
                    p="md"
                    style={{
                        borderRadius: '8px',
                        backgroundColor: 'light-dark(var(--mantine-color-green-0), var(--mantine-color-dark-6))',
                        border: '1px solid light-dark(var(--mantine-color-green-3), var(--mantine-color-dark-4))',
                    }}
                >
                    <Group gap="xs" mb="xs">
                        <IconWorldOff size={16} color="var(--mantine-color-green-6)" />
                        <Text fw={700} size="sm" c="green">100 % lokal – keine Serververbindung</Text>
                    </Group>
                    <Text size="sm" c="dimmed">
                        SkillGrid ist eine rein lokale Webanwendung. Es werden keinerlei Daten an externe Server,
                        Dienste oder Dritte übertragen. Die gesamte Verarbeitung findet ausschließlich in Ihrem Browser statt.
                    </Text>
                </Box>

                <Stack gap="xs">
                    <Text fw={700} size="sm" tt="uppercase" c="dimmed">Wo werden Daten gespeichert?</Text>
                    <List spacing="sm" size="sm" center>
                        <List.Item icon={<ThemeIcon color="blue" variant="light" size={28} radius="md"><IconDeviceFloppy size={16} /></ThemeIcon>}>
                            <Box ml="xs">
                                <Text fw={600}>IndexedDB (Hauptdaten)</Text>
                                <Text size="xs" c="dimmed">
                                    Alle Projektdaten – Mitarbeiter, Skills, Kategorien, Qualifizierungspläne und Änderungshistorie –
                                    werden in der IndexedDB Ihres Browsers gespeichert. Diese Daten verlassen niemals Ihr Gerät.
                                </Text>
                            </Box>
                        </List.Item>
                        <List.Item icon={<ThemeIcon color="violet" variant="light" size={28} radius="md"><IconDeviceFloppy size={16} /></ThemeIcon>}>
                            <Box ml="xs">
                                <Text fw={600}>localStorage (Einstellungen)</Text>
                                <Text size="xs" c="dimmed">
                                    Benutzereinstellungen wie Farbschema, anonymer Modus, gespeicherte Ansichten und
                                    der Willkommens-Dialog-Status werden im localStorage gespeichert.
                                </Text>
                            </Box>
                        </List.Item>
                    </List>
                </Stack>

                <Stack gap="xs">
                    <Text fw={700} size="sm" tt="uppercase" c="dimmed">Ihre Kontrolle über die Daten</Text>
                    <List spacing="sm" size="sm" center>
                        <List.Item icon={<ThemeIcon color="teal" variant="light" size={28} radius="md"><IconDownload size={16} /></ThemeIcon>}>
                            <Box ml="xs">
                                <Text fw={600}>Export</Text>
                                <Text size="xs" c="dimmed">
                                    Alle Daten können jederzeit als JSON-Datei exportiert und gesichert werden.
                                </Text>
                            </Box>
                        </List.Item>
                        <List.Item icon={<ThemeIcon color="orange" variant="light" size={28} radius="md"><IconEyeOff size={16} /></ThemeIcon>}>
                            <Box ml="xs">
                                <Text fw={600}>Anonymer Modus</Text>
                                <Text size="xs" c="dimmed">
                                    Der anonyme Modus blendet Namen und persönliche Angaben in der Oberfläche aus –
                                    z. B. für Präsentationen oder Screenshots.
                                </Text>
                            </Box>
                        </List.Item>
                        <List.Item icon={<ThemeIcon color="red" variant="light" size={28} radius="md"><IconTrash size={16} /></ThemeIcon>}>
                            <Box ml="xs">
                                <Text fw={600}>Löschen</Text>
                                <Text size="xs" c="dimmed">
                                    Alle gespeicherten Daten können jederzeit über die Browser-Einstellungen
                                    (Websitedaten löschen) vollständig entfernt werden.
                                </Text>
                            </Box>
                        </List.Item>
                    </List>
                </Stack>

            </Stack>
        </Modal>
    );
}
