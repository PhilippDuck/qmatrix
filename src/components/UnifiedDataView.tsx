import React, { useState, useEffect } from "react";
import { Tabs, Title, Box, Paper } from "@mantine/core";
import {
    IconUsers,
    IconBuilding,
    IconBadge,
    IconTags,
    IconDatabase,
} from "@tabler/icons-react";

import { EmployeeList } from "./EmployeeList";
import { DepartmentManager } from "./organization/DepartmentManager";
import { RoleManager } from "./organization/RoleManager";
import { CategoryManager } from "./CategoryManager";
import { DataManagement } from "./DataManagement";

export const UnifiedDataView: React.FC = () => {
    // Try to restore active tab from localStorage or default to 'employees'
    const [activeTab, setActiveTab] = useState<string | null>(() => {
        return localStorage.getItem("unified-data-tab") || "employees";
    });

    // Save active tab to localStorage when it changes
    useEffect(() => {
        if (activeTab) {
            localStorage.setItem("unified-data-tab", activeTab);
        }
    }, [activeTab]);

    return (
        <Box style={{ width: '100%', maxWidth: '100%' }}>
            <Title order={2} mb="lg">
                Stammdaten
            </Title>

            <Paper shadow="xs" p="md" radius="md" withBorder>
                <Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
                    <Tabs.List mb="lg">
                        <Tabs.Tab value="employees" leftSection={<IconUsers size={16} />}>
                            Mitarbeiter
                        </Tabs.Tab>
                        <Tabs.Tab value="departments" leftSection={<IconBuilding size={16} />}>
                            Abteilungen
                        </Tabs.Tab>
                        <Tabs.Tab value="roles" leftSection={<IconBadge size={16} />}>
                            Rollen & Level
                        </Tabs.Tab>
                        <Tabs.Tab value="skills" leftSection={<IconTags size={16} />}>
                            Skills & Kategorien
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="employees">
                        <EmployeeList />
                    </Tabs.Panel>

                    <Tabs.Panel value="departments">
                        <DepartmentManager />
                    </Tabs.Panel>

                    <Tabs.Panel value="roles">
                        <RoleManager />
                    </Tabs.Panel>

                    <Tabs.Panel value="skills">
                        <CategoryManager />
                    </Tabs.Panel>

                </Tabs>
            </Paper>
        </Box>
    );
};
