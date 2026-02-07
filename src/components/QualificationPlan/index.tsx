import React, { useState, useEffect, useMemo } from "react";
import {
  Tabs,
  Title,
  Box,
  Paper,
  Button,
  Group,
  Text,
  Badge,
  Stack,
  Card,
  Select,
  TextInput,
  SimpleGrid,
  ThemeIcon,
  Divider,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import {
  IconPlus,
  IconList,
  IconArchive,
  IconChartBar,
  IconSearch,
  IconFilter,
  IconCertificate,
  IconTarget,
  IconUser,
} from "@tabler/icons-react";
import { useData, QualificationPlan as QualificationPlanType } from "../../context/DataContext";
import { usePrivacy } from "../../context/PrivacyContext";
import { PlanForm } from "./PlanForm";
import { PlanDetail } from "./PlanDetail";
import { PlanCard } from "./PlanCard";

interface QualificationPlanProps {
  initialEmployeeId?: string | null;
  onClearParams?: () => void;
}

export const QualificationPlan: React.FC<QualificationPlanProps> = ({ initialEmployeeId, onClearParams }) => {
  const {
    qualificationPlans,
    qualificationMeasures,
    employees,
    roles,
    deleteQualificationPlan,
    updateQualificationPlan,
  } = useData();
  const { anonymizeName } = usePrivacy();

  const [activeTab, setActiveTab] = useState<string | null>(() => {
    const saved = localStorage.getItem("qualification-plan-tab");
    // Prevent restoring "detail" state since we don't persist selectedPlanId
    if (saved === "detail" || !saved) return "overview";
    return saved;
  });

  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [editingPlan, setEditingPlan] = useState<QualificationPlanType | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [filterEmployee, setFilterEmployee] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleViewPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setActiveTab("detail");
  };

  // Handle cross-module navigation
  useEffect(() => {
    if (initialEmployeeId) {
      // Check if active plan exists
      const activePlan = qualificationPlans.find(p => p.employeeId === initialEmployeeId && (p.status === 'active' || p.status === 'draft'));
      if (activePlan) {
        handleViewPlan(activePlan.id!);
      } else {
        // Open creation drawer pre-filled
        setEditingPlan(null); // Ensure "New" mode
        openDrawer();
      }

      // Clear the params so this doesn't run again on next render/tab switch
      if (onClearParams) {
        onClearParams();
      }
    }
  }, [initialEmployeeId, qualificationPlans, onClearParams]);

  useEffect(() => {
    if (activeTab && activeTab !== "detail") {
      localStorage.setItem("qualification-plan-tab", activeTab);
    }
  }, [activeTab]);

  const handleNewPlan = () => {
    setEditingPlan(null);
    openDrawer();
  };

  const handleEditPlan = (plan: QualificationPlanType) => {
    setEditingPlan(plan);
    openDrawer();
  };

  const handleDeletePlan = async (planId: string) => {
    modals.openConfirmModal({
      title: 'Plan löschen',
      centered: true,
      children: (
        <Text size="sm">
          Möchten Sie diesen Qualifizierungsplan wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
        </Text>
      ),
      labels: { confirm: 'Plan löschen', cancel: 'Abbrechen' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await deleteQualificationPlan(planId);
      },
    });
  };

  const handleArchivePlan = async (planId: string) => {
    await updateQualificationPlan(planId, { status: "archived" });
  };

  const filteredPlans = useMemo(() => {
    return qualificationPlans.filter((plan) => {
      // Status filter from dropdown
      if (filterStatus && plan.status !== filterStatus) return false;

      // Employee filter
      if (filterEmployee && plan.employeeId !== filterEmployee) return false;

      // Search filter
      if (searchTerm) {
        const employee = employees.find((e) => e.id === plan.employeeId);
        const role = roles.find((r) => r.id === plan.targetRoleId);
        const searchLower = searchTerm.toLowerCase();
        if (
          !employee?.name.toLowerCase().includes(searchLower) &&
          !role?.name.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [qualificationPlans, filterStatus, filterEmployee, searchTerm, employees, roles]);

  const activePlans = useMemo(() =>
    filteredPlans.filter(p => p.status === 'active' || p.status === 'draft'),
    [filteredPlans]);

  const archivedPlans = useMemo(() =>
    filteredPlans.filter(p => p.status === 'archived' || p.status === 'completed'),
    [filteredPlans]);

  // If a plan is selected for detail view, show the detail component
  if (activeTab === "detail" && selectedPlanId) {
    const selectedPlan = qualificationPlans.find((p) => p.id === selectedPlanId);
    if (selectedPlan) {
      return (
        <PlanDetail
          plan={selectedPlan}
          onBack={() => {
            setSelectedPlanId(null);
            setActiveTab("active");
          }}
          onEdit={() => handleEditPlan(selectedPlan)}
        />
      );
    }
  }

  return (
    <Box style={{ width: "100%", maxWidth: "100%" }}>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Qualifizierungspläne</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={handleNewPlan}>
          Neuer Plan
        </Button>
      </Group>

      <Paper shadow="xs" p="md" radius="md" withBorder>
        <Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
          <Tabs.List mb="lg">
            <Tabs.Tab value="overview" leftSection={<IconChartBar size={16} />}>
              Übersicht
            </Tabs.Tab>
            <Tabs.Tab
              value="active"
              leftSection={<IconList size={16} />}
              rightSection={
                activePlans.length > 0 && (
                  <Badge size="xs" variant="filled" color="blue">
                    {activePlans.length}
                  </Badge>
                )
              }
            >
              Aktive Pläne
            </Tabs.Tab>
            <Tabs.Tab value="archived" leftSection={<IconArchive size={16} />}>
              Archiv
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview">
            <Stack gap="lg">
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group>
                    <ThemeIcon variant="light" size="xl" radius="md" color="blue">
                      <IconCertificate size={24} />
                    </ThemeIcon>
                    <div>
                      <Text size="xl" fw={700}>
                        {qualificationPlans.length}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Gesamte Pläne
                      </Text>
                    </div>
                  </Group>
                </Card>

                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group>
                    <ThemeIcon variant="light" size="xl" radius="md" color="green">
                      <IconTarget size={24} />
                    </ThemeIcon>
                    <div>
                      <Text size="xl" fw={700}>
                        {qualificationPlans.filter((p) => p.status === "active").length}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Aktive Pläne
                      </Text>
                    </div>
                  </Group>
                </Card>

                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group>
                    <ThemeIcon variant="light" size="xl" radius="md" color="teal">
                      <IconList size={24} />
                    </ThemeIcon>
                    <div>
                      <Text size="xl" fw={700}>
                        {qualificationMeasures.length}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Maßnahmen
                      </Text>
                    </div>
                  </Group>
                </Card>

                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group>
                    <ThemeIcon variant="light" size="xl" radius="md" color="orange">
                      <IconUser size={24} />
                    </ThemeIcon>
                    <div>
                      <Text size="xl" fw={700}>
                        {new Set(qualificationPlans.map((p) => p.employeeId)).size}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Mitarbeiter
                      </Text>
                    </div>
                  </Group>
                </Card>
              </SimpleGrid>

              <Divider label="Aktuelle Pläne" labelPosition="left" />

              {activePlans.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                  Keine aktiven Qualifizierungspläne vorhanden.
                </Text>
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                  {activePlans.slice(0, 6).map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      onView={handleViewPlan}
                      onEdit={handleEditPlan}
                      onArchive={handleArchivePlan}
                      onDelete={handleDeletePlan}
                    />
                  ))}
                </SimpleGrid>
              )}

              {activePlans.length > 6 && (
                <Button
                  variant="subtle"
                  onClick={() => setActiveTab("active")}
                  mx="auto"
                >
                  Alle {activePlans.length} aktiven Pläne anzeigen
                </Button>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="active">
            <Stack gap="md">
              <Group>
                <TextInput
                  placeholder="Suchen..."
                  leftSection={<IconSearch size={16} />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.currentTarget.value)}
                  style={{ flex: 1, maxWidth: 300 }}
                />
                <Select
                  placeholder="Mitarbeiter filtern"
                  clearable
                  leftSection={<IconFilter size={16} />}
                  data={employees.map((e) => ({ value: e.id!, label: anonymizeName(e.name, e.id) }))}
                  value={filterEmployee}
                  onChange={setFilterEmployee}
                  style={{ maxWidth: 200 }}
                />
                <Select
                  placeholder="Status filtern"
                  clearable
                  data={[
                    { value: "draft", label: "Entwurf" },
                    { value: "active", label: "Aktiv" },
                  ]}
                  value={filterStatus}
                  onChange={setFilterStatus}
                  style={{ maxWidth: 150 }}
                />
              </Group>

              {activePlans.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                  Keine aktiven Qualifizierungspläne gefunden.
                </Text>
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                  {activePlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      onView={handleViewPlan}
                      onEdit={handleEditPlan}
                      onArchive={handleArchivePlan}
                      onDelete={handleDeletePlan}
                    />
                  ))}
                </SimpleGrid>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="archived">
            <Stack gap="md">
              {archivedPlans.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                  Keine archivierten Qualifizierungspläne vorhanden.
                </Text>
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                  {archivedPlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      onView={handleViewPlan}
                      onEdit={handleEditPlan}
                      onArchive={handleArchivePlan}
                      onDelete={handleDeletePlan}
                    />
                  ))}
                </SimpleGrid>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Paper>

      <PlanForm
        opened={drawerOpened}
        onClose={closeDrawer}
        editingPlan={editingPlan}
        initialEmployeeId={initialEmployeeId}
      />
    </Box>
  );
};
