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
  IconAlertTriangle,
  IconAlertCircle,
  IconCalendar,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useData, QualificationPlan as QualificationPlanType } from "../../context/DataContext";
import { usePrivacy } from "../../context/PrivacyContext";
import { PlanForm } from "./PlanForm";
import { PlanDetail } from "./PlanDetail";
import { PlanCard } from "./PlanCard";
import { GanttTimeline } from "./GanttTimeline";
import { ForecastView } from "./ForecastView";

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
    getSkillGapsForEmployee,
    assessments, // Import this
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
  const [targetEmployeeId, setTargetEmployeeId] = useState<string | null>(null); // Local state to persist initialEmployeeId
  const [filterEmployee, setFilterEmployee] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleViewPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setActiveTab("detail");
  };

  const handlePlanCreated = (planId: string) => {
    // Refresh data is handled by context, we just need to select local state
    // Wait for the plan to be available in state? 
    // Usually context update is fast but async. 
    // However, since we just got the ID, setting it as selectedPlanId is safe.
    // The PlanDetail component might render null briefly if plan is not in qualificationPlans yet.
    // But since we await addQualificationPlan in PlanForm and it awaits refreshAllData, we should be good.
    setSelectedPlanId(planId);
    setActiveTab("detail");
    closeDrawer();
  };

  // Handle cross-module navigation
  useEffect(() => {
    if (initialEmployeeId) {
      // Check if active plan exists
      const activePlan = qualificationPlans.find(p => p.employeeId === initialEmployeeId && p.status === 'active');
      if (activePlan) {
        handleViewPlan(activePlan.id!);
      } else {
        // Open creation drawer pre-filled
        setEditingPlan(null); // Ensure "New" mode
        setTargetEmployeeId(initialEmployeeId); // Store locally
        openDrawer();
      }

      // Clear the params so this doesn't run again on next render/tab switch
      if (onClearParams) {
        onClearParams();
      }
    }
  }, [initialEmployeeId, qualificationPlans, onClearParams, openDrawer]);

  useEffect(() => {
    if (activeTab && activeTab !== "detail") {
      localStorage.setItem("qualification-plan-tab", activeTab);
    }
  }, [activeTab]);

  const handleNewPlan = () => {
    setEditingPlan(null);
    setTargetEmployeeId(null); // Clear any target employee
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
    filteredPlans.filter(p => p.status === 'active'),
    [filteredPlans]);

  const archivedPlans = useMemo(() =>
    filteredPlans.filter(p => p.status === 'archived' || p.status === 'completed'),
    [filteredPlans]);

  // Calculate deficit statistics
  const deficitStats = useMemo(() => {
    let employeesWithDeficit = 0;
    let employeesWithDeficitNoPlan = 0;

    employees.forEach(emp => {
      // Check if employee has any active plan
      const hasActivePlan = qualificationPlans.some(p => p.employeeId === emp.id && p.status === 'active');

      // Check for deficits (gaps)
      // We need to use the getSkillGapsForEmployee helper, but it's not directly exposed as a pure function we can call in loop easily without context overhead?
      // Actually it is exposed from useData. Let's use the one from context if available or recreate logic.
      // The one in context `getSkillGapsForEmployee` is available.
      // However, calling it for every employee might be heavy if not optimized.
      // Let's assume it's fast enough for client-side < 100 employees.

      // We check against the employee's primary role (first role in the list)
      const primaryRoleId = emp.roles && emp.roles.length > 0 ? emp.roles[0] : null;
      const gaps = getSkillGapsForEmployee(emp.id!, primaryRoleId);

      if (gaps && gaps.length > 0) {
        employeesWithDeficit++;
        if (!hasActivePlan) {
          employeesWithDeficitNoPlan++;
        }
      }
    });

    return { employeesWithDeficit, employeesWithDeficitNoPlan };
  }, [employees, qualificationPlans, assessments, roles]); // Add dependencies


  // If a plan is selected for detail view, show the detail component
  if (activeTab === "detail" && selectedPlanId) {
    const selectedPlan = qualificationPlans.find((p) => p.id === selectedPlanId);
    if (selectedPlan) {
      return (
        <>
          <PlanDetail
            plan={selectedPlan}
            onBack={() => {
              setSelectedPlanId(null);
              setActiveTab("overview");
            }}
            onEdit={() => handleEditPlan(selectedPlan)}
          />
          <PlanForm
            opened={drawerOpened}
            onClose={closeDrawer}
            editingPlan={editingPlan}
            initialEmployeeId={targetEmployeeId}
            onPlanCreated={handlePlanCreated}
          />
        </>
      );
    }
  }

  return (
    <Box style={{ width: "100%", maxWidth: "100%" }} pr="md">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Qualifizierungspläne</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={handleNewPlan}>
          Neuer Plan
        </Button>
      </Group>

      <Paper shadow="xs" p="md" radius="md" withBorder>
        <Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
          <Tabs.List mb="lg">
            <Tabs.Tab
              value="overview"
              leftSection={<IconChartBar size={16} />}
              rightSection={
                qualificationPlans.filter((p) => p.status === "active").length > 0 && (
                  <Badge size="xs" variant="filled" color="blue">
                    {qualificationPlans.filter((p) => p.status === "active").length}
                  </Badge>
                )
              }
            >
              Übersicht
            </Tabs.Tab>
            <Tabs.Tab
              value="timeline"
              leftSection={<IconCalendar size={16} />}
            >
              Timeline
            </Tabs.Tab>
            <Tabs.Tab
              value="forecast"
              leftSection={<IconTrendingUp size={16} />}
            >
              Prognose
            </Tabs.Tab>

            <Tabs.Tab value="archived" leftSection={<IconArchive size={16} />}>
              Archiv
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview">
            <Stack gap="lg">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group>
                    <ThemeIcon
                      variant="light"
                      size="xl"
                      radius="md"
                      color={deficitStats.employeesWithDeficit > 0 ? "orange" : "green"}
                    >
                      {deficitStats.employeesWithDeficit > 0 ? <IconAlertTriangle size={24} /> : <IconCertificate size={24} />}
                    </ThemeIcon>
                    <div>
                      <Text size="xl" fw={700}>
                        {deficitStats.employeesWithDeficit}
                      </Text>
                      <Text size="sm" c="dimmed">
                        MA im Defizit
                      </Text>
                    </div>
                  </Group>
                </Card>

                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group>
                    <ThemeIcon
                      variant="light"
                      size="xl"
                      radius="md"
                      color={deficitStats.employeesWithDeficitNoPlan > 0 ? "red" : "green"}
                    >
                      {deficitStats.employeesWithDeficitNoPlan > 0 ? <IconAlertCircle size={24} /> : <IconCertificate size={24} />}
                    </ThemeIcon>
                    <div>
                      <Text size="xl" fw={700}>
                        {deficitStats.employeesWithDeficitNoPlan}
                      </Text>
                      <Text size="sm" c="dimmed">
                        Defizit ohne Plan
                      </Text>
                    </div>
                  </Group>
                </Card>
              </SimpleGrid>

              <Divider label="Aktuelle Pläne" labelPosition="left" />

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

          <Tabs.Panel value="timeline">
            <GanttTimeline onViewPlan={handleViewPlan} />
          </Tabs.Panel>

          <Tabs.Panel value="forecast">
            <ForecastView />
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
        initialEmployeeId={targetEmployeeId}
        onPlanCreated={handlePlanCreated}
      />
    </Box>
  );
};
