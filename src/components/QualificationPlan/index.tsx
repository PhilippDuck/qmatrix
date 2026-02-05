import React, { useState, useEffect } from "react";
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
  Progress,
  ActionIcon,
  Menu,
  Tooltip,
  Select,
  TextInput,
  SimpleGrid,
  ThemeIcon,
  Divider,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconList,
  IconArchive,
  IconChartBar,
  IconSearch,
  IconFilter,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconEye,
  IconUser,
  IconTarget,
  IconCertificate,
} from "@tabler/icons-react";
import { useData, QualificationPlan as QualificationPlanType } from "../../context/DataContext";
import { usePrivacy } from "../../context/PrivacyContext";
import { PlanForm } from "./PlanForm";
import { PlanDetail } from "./PlanDetail";

const statusLabels: Record<QualificationPlanType["status"], string> = {
  draft: "Entwurf",
  active: "Aktiv",
  completed: "Abgeschlossen",
  archived: "Archiviert",
};

const statusColors: Record<QualificationPlanType["status"], string> = {
  draft: "gray",
  active: "blue",
  completed: "green",
  archived: "orange",
};

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
    if (window.confirm("Möchten Sie diesen Qualifizierungsplan wirklich löschen?")) {
      await deleteQualificationPlan(planId);
    }
  };

  const handleArchivePlan = async (planId: string) => {
    await updateQualificationPlan(planId, { status: "archived" });
  };

  const getFilteredPlans = (statusFilter?: QualificationPlanType["status"][]) => {
    return qualificationPlans.filter((plan) => {
      // Status filter from parameter
      if (statusFilter && !statusFilter.includes(plan.status)) return false;

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
  };

  const getPlanProgress = (planId: string) => {
    const measures = qualificationMeasures.filter((m) => m.planId === planId);
    if (measures.length === 0) return { completed: 0, total: 0, percent: 0 };
    const completed = measures.filter((m) => m.status === "completed").length;
    return {
      completed,
      total: measures.length,
      percent: Math.round((completed / measures.length) * 100),
    };
  };

  const activePlans = getFilteredPlans(["active", "draft"]);
  const archivedPlans = getFilteredPlans(["archived", "completed"]);

  const PlanCard: React.FC<{ plan: QualificationPlanType }> = ({ plan }) => {
    const employee = employees.find((e) => e.id === plan.employeeId);
    const role = roles.find((r) => r.id === plan.targetRoleId);
    const progress = getPlanProgress(plan.id!);

    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Card.Section withBorder inheritPadding py="xs">
          <Group justify="space-between">
            <Group gap="sm">
              <ThemeIcon variant="light" size="lg" radius="md">
                <IconUser size={18} />
              </ThemeIcon>
              <div>
                <Text fw={600}>{employee ? anonymizeName(employee.name, employee.id) : "Unbekannt"}</Text>
                <Text size="xs" c="dimmed">
                  Zielrolle: {role?.name || "Keine"}
                </Text>
              </div>
            </Group>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray">
                  <IconDotsVertical size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconEye size={14} />}
                  onClick={() => handleViewPlan(plan.id!)}
                >
                  Details anzeigen
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconEdit size={14} />}
                  onClick={() => handleEditPlan(plan)}
                >
                  Bearbeiten
                </Menu.Item>
                <Menu.Divider />
                {plan.status !== "archived" && (
                  <Menu.Item
                    leftSection={<IconArchive size={14} />}
                    onClick={() => handleArchivePlan(plan.id!)}
                  >
                    Archivieren
                  </Menu.Item>
                )}
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => handleDeletePlan(plan.id!)}
                >
                  Löschen
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Card.Section>

        <Stack gap="xs" mt="md">
          <Group justify="space-between">
            <Badge color={statusColors[plan.status]} variant="light">
              {statusLabels[plan.status]}
            </Badge>
            <Text size="xs" c="dimmed">
              {progress.completed} / {progress.total} Maßnahmen
            </Text>
          </Group>

          <Progress
            value={progress.percent}
            color={progress.percent === 100 ? "green" : "blue"}
            size="sm"
            radius="xl"
          />

          <Text size="xs" c="dimmed">
            Erstellt: {new Date(plan.createdAt).toLocaleDateString("de-DE")}
          </Text>
        </Stack>

        <Button
          variant="light"
          fullWidth
          mt="md"
          radius="md"
          onClick={() => handleViewPlan(plan.id!)}
        >
          Details anzeigen
        </Button>
      </Card>
    );
  };

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
                    <PlanCard key={plan.id} plan={plan} />
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
                    <PlanCard key={plan.id} plan={plan} />
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
                    <PlanCard key={plan.id} plan={plan} />
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
