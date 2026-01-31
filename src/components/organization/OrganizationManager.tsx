import React, { useState } from "react";
import { Tabs, Title, Container } from "@mantine/core";
import { IconBuilding, IconBadge } from "@tabler/icons-react";
import { DepartmentManager } from "./DepartmentManager";
import { RoleManager } from "./RoleManager";

export const OrganizationManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string | null>("departments");

    return (
        <Container size="xl">
            <Title order={2} mb="lg">
                Organisation
            </Title>

            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List mb="lg">
                    <Tabs.Tab value="departments" leftSection={<IconBuilding size={16} />}>
                        Abteilungen
                    </Tabs.Tab>
                    <Tabs.Tab value="roles" leftSection={<IconBadge size={16} />}>
                        Rollen
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="departments">
                    <DepartmentManager />
                </Tabs.Panel>

                <Tabs.Panel value="roles">
                    <RoleManager />
                </Tabs.Panel>
            </Tabs>
        </Container>
    );
};
