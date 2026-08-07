import React from "react";
import { SimpleGrid, Paper, ActionIcon, Tooltip, Text, Stack, TextInput } from "@mantine/core";
import { useState } from "react";
import {
    IconUser,
    IconUsers,
    IconUserStar,
    IconUserCheck,
    IconUserCog,
    IconUserShield,
    IconBriefcase,
    IconCode,
    IconDeviceLaptop,
    IconServer,
    IconDatabase,
    IconCloud,
    IconRocket,
    IconBulb,
    IconPuzzle,
    IconTools,
    IconHammer,
    IconCpu,
    IconTerminal,
    IconBrandGit,
    IconChartBar,
    IconPresentation,
    IconSchool,
    IconCertificate,
    IconTrophy,
    IconStar,
    IconCrown,
    IconDiamond,
    IconFlame,
    IconBolt,
    IconTarget,
    IconEye,
    IconShield,
    IconLock,
    IconKey,
    IconBuilding,
    IconHome,
    IconWorld,
    IconMapPin,
    IconPhone,
    IconMail,
    IconMessage,
    IconHeadset,
    IconHeart,
    IconMoodSmile,
    IconSearch,
    // Technical & Industrial
    IconRobot,
    IconEngine,
    IconGauge,
    IconSettingsAutomation,
    IconPlug,
    IconTool,
    IconNetwork,
    IconWifi,
    IconBattery,
    IconMicroscope,
    IconPrinter,
    IconDeviceDesktop,
    IconDeviceMobile,
    IconCamera,
    IconBuildingFactory,
    IconTruck,
    IconCar,
    // Business & Office
    IconReportAnalytics,
    IconChartPie,
    IconTrendingUp,
    IconCash,
    IconScale,
    IconGavel,
    type Icon,
} from "@tabler/icons-react";

// Map of available icons
export const ROLE_ICONS: Record<string, Icon> = {
    IconUser,
    IconUsers,
    IconUserStar,
    IconUserCheck,
    IconUserCog,
    IconUserShield,
    IconBriefcase,
    IconCode,
    IconDeviceLaptop,
    IconServer,
    IconDatabase,
    IconCloud,
    IconRocket,
    IconBulb,
    IconPuzzle,
    IconTools,
    IconHammer,
    IconCpu,
    IconTerminal,
    IconBrandGit,
    IconChartBar,
    IconPresentation,
    IconSchool,
    IconCertificate,
    IconTrophy,
    IconStar,
    IconCrown,
    IconDiamond,
    IconFlame,
    IconBolt,
    IconTarget,
    IconEye,
    IconShield,
    IconLock,
    IconKey,
    IconBuilding,
    IconHome,
    IconWorld,
    IconMapPin,
    IconPhone,
    IconMail,
    IconMessage,
    IconHeadset,
    IconHeart,
    IconMoodSmile,
    IconRobot,
    IconEngine,
    IconGauge,
    IconSettingsAutomation,
    IconPlug,
    IconTool,
    IconNetwork,
    IconWifi,
    IconBattery,
    IconMicroscope,
    IconPrinter,
    IconDeviceDesktop,
    IconDeviceMobile,
    IconCamera,
    IconBuildingFactory,
    IconTruck,
    IconCar,
    IconReportAnalytics,
    IconChartPie,
    IconTrendingUp,
    IconCash,
    IconScale,
    IconGavel,
};

// Helper to get icon component by name
export const getIconByName = (iconName: string | undefined): Icon => {
    if (!iconName || !ROLE_ICONS[iconName]) {
        return IconUser; // Default icon
    }
    return ROLE_ICONS[iconName];
};

interface RoleIconPickerProps {
    value: string | undefined;
    onChange: (iconName: string) => void;
}

export const RoleIconPicker: React.FC<RoleIconPickerProps> = ({ value, onChange }) => {
    const [search, setSearch] = useState("");
    const iconEntries = Object.entries(ROLE_ICONS);

    const filteredIcons = iconEntries.filter(([name]) =>
        name.toLowerCase().includes(search.toLowerCase().replace("icon", ""))
    );

    return (
        <Stack gap="xs">
            <TextInput
                placeholder="Icon suchen..."
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                leftSection={<IconSearch size={14} />}
                size="xs"
            />
            <Paper
                p="xs"
                withBorder
                style={{ maxHeight: 200, overflowY: 'auto' }}
            >
                <SimpleGrid cols={8} spacing={4}>
                    {filteredIcons.map(([name, IconComponent]) => (
                        <Tooltip key={name} label={name.replace("Icon", "")} withArrow>
                            <ActionIcon
                                variant={value === name ? "filled" : "subtle"}
                                color={value === name ? "blue" : "gray"}
                                size="md"
                                onClick={() => onChange(name)}
                            >
                                <IconComponent size={16} />
                            </ActionIcon>
                        </Tooltip>
                    ))}
                </SimpleGrid>
                {filteredIcons.length === 0 && (
                    <Text size="xs" c="dimmed" ta="center" py="md">
                        Keine Icons gefunden
                    </Text>
                )}
            </Paper>
        </Stack>
    );
};
