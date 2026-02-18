import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Title,
  Group,
  Button,
  Text,
  Badge,
  Stack,
  Tabs,
  ActionIcon,
  Menu,
  Select,
  Alert,
  ThemeIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import {
  IconArrowLeft,
  IconEdit,
  IconPlus,
  IconList,
  IconTimeline,
  IconChartBar,
  IconDotsVertical,
  IconArchive,
  IconCheck,
  IconAlertCircle,
  IconDownload,
} from "@tabler/icons-react";
import {
  useData,
  QualificationPlan,
  QualificationMeasure,
} from "../../context/DataContext";
import { exportQualificationPlanPDF } from "../../services/pdfReportService";
import { usePrivacy } from "../../context/PrivacyContext";
import { SkillGapAnalysis } from "./SkillGapAnalysis";
import { MeasureForm } from "./MeasureForm";
import { GanttTimeline } from "./GanttTimeline";
import { PlanProgressStats } from "./PlanProgressStats";
import { SkillMeasureGroup } from "./SkillMeasureGroup";

interface PlanDetailProps {
  plan: QualificationPlan;
  onBack: () => void;
  onEdit: () => void;
}

const statusLabels: Record<QualificationPlan["status"], string> = {
  active: "Aktiv",
  completed: "Abgeschlossen",
  archived: "Archiviert",
};

const statusColors: Record<QualificationPlan["status"], string> = {
  active: "blue",
  completed: "green",
  archived: "orange",
};

export const PlanDetail: React.FC<PlanDetailProps> = ({
  plan,
  onBack,
  onEdit,
}) => {
  const {
    employees,
    roles,
    skills,
    assessments,
    qualificationMeasures,
    getSkillGapsForEmployee,
    updateQualificationPlan,
    updateQualificationMeasure,
    deleteQualificationMeasure,
    setAssessment,
  } = useData();
  const { anonymizeName } = usePrivacy();

  const [activeTab, setActiveTab] = useState<string | null>("measures");
  const [measureDrawerOpened, { open: openMeasureDrawer, close: closeMeasureDrawer }] =
    useDisclosure(false);
  const [editingMeasure, setEditingMeasure] = useState<QualificationMeasure | null>(null);
  const [initialSkillId, setInitialSkillId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const employee = employees.find((e) => e.id === plan.employeeId);
  const role = roles.find((r) => r.id === plan.targetRoleId);
  const skillGaps = getSkillGapsForEmployee(plan.employeeId, plan.targetRoleId);

  // Get measures for this plan
  const planMeasures = qualificationMeasures.filter((m) => m.planId === plan.id);
  const filteredMeasures = statusFilter
    ? planMeasures.filter((m) => m.status === statusFilter)
    : planMeasures;

  // Progress calculation
  const completedMeasures = planMeasures.filter((m) => m.status === "completed").length;

  // Skills already covered by measures
  const coveredSkillIds = new Set(planMeasures.map((m) => m.skillId));
  const uncoveredGaps = skillGaps.filter((g) => !coveredSkillIds.has(g.skillId));

  // Check if all gaps are fully planned (target level reached by measures)
  const allGapsFullyPlanned = skillGaps.length > 0 && skillGaps.every(gap => {
    const gapMeasures = planMeasures.filter(m => m.skillId === gap.skillId);
    const maxPlannedLevel = Math.max(0, ...gapMeasures.map(m => m.targetLevel));
    return maxPlannedLevel >= gap.targetLevel;
  });

  const handleAddMeasure = (skillId?: string) => {
    setEditingMeasure(null);
    setInitialSkillId(skillId || null);
    openMeasureDrawer();
  };

  const handleEditMeasure = (measure: QualificationMeasure) => {
    setEditingMeasure(measure);
    openMeasureDrawer();
  };

  const handleDeleteMeasure = async (measureId: string) => {
    modals.openConfirmModal({
      title: 'Maßnahme löschen',
      centered: true,
      children: (
        <Text size="sm">
          Möchten Sie diese Maßnahme wirklich löschen?
        </Text>
      ),
      labels: { confirm: 'Löschen', cancel: 'Abbrechen' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await deleteQualificationMeasure(measureId);
      },
    });
  };

  const handleMeasureStatusChange = async (
    measureId: string,
    status: QualificationMeasure["status"]
  ) => {
    const measure = planMeasures.find((m) => m.id === measureId);
    const updateData: Partial<Omit<QualificationMeasure, "id">> = { status };

    if (status === "completed" && measure) {
      updateData.completedDate = Date.now();
      // Update the skill level in the matrix to the target level
      const targetLevel = measure.targetLevel as 0 | 25 | 50 | 75 | 100;
      if ([0, 25, 50, 75, 100].includes(targetLevel)) {
        await setAssessment(plan.employeeId, measure.skillId, targetLevel);
      }
    }
    await updateQualificationMeasure(measureId, updateData);
  };

  // Sync measure progress with actual assessment levels from the matrix
  useEffect(() => {
    const syncMeasureProgress = async () => {
      for (const measure of planMeasures) {
        if (measure.status === "completed" || measure.status === "cancelled") continue;

        const assessment = assessments.find(
          (a) => a.employeeId === plan.employeeId && a.skillId === measure.skillId
        );
        const currentLevel = assessment?.level ?? 0;
        const actualLevel = currentLevel < 0 ? 0 : currentLevel;

        // Update currentLevel if it changed
        if (actualLevel !== measure.currentLevel) {
          await updateQualificationMeasure(measure.id!, { currentLevel: actualLevel });
        }

        // Auto-complete if target reached and measure is still active
        if (actualLevel >= measure.targetLevel && (measure.status === "in_progress" || measure.status === "pending")) {
          await updateQualificationMeasure(measure.id!, {
            status: "completed",
            currentLevel: actualLevel,
            completedDate: Date.now(),
          });
        }
      }
    };

    syncMeasureProgress();
  }, [assessments, planMeasures, plan.employeeId]);

  const handlePlanStatusChange = async (status: QualificationPlan["status"]) => {
    await updateQualificationPlan(plan.id!, { status });
  };

  return (
    <Box style={{ width: "100%", maxWidth: "100%" }}>
      {/* Header */}
      <Group justify="space-between" mb="lg">
        <Group>
          <ActionIcon variant="subtle" size="lg" onClick={onBack}>
            <IconArrowLeft size={20} />
          </ActionIcon>
          <div>
            <Title order={2}>{employee ? anonymizeName(employee.name, employee.id) : "Unbekannt"}</Title>
            <Text c="dimmed" size="sm">
              Zielrolle: {role?.name || "Keine"} • Erstellt:{" "}
              {new Date(plan.createdAt).toLocaleDateString("de-DE")}
            </Text>
          </div>
        </Group>

        <Group>
          <Badge
            color={statusColors[plan.status]}
            variant="light"
            size="lg"
          >
            {statusLabels[plan.status]}
          </Badge>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            onClick={() => exportQualificationPlanPDF(plan, employee, role, planMeasures, skillGaps, skills)}
            title="Als PDF exportieren"
          >
            <IconDownload size={18} />
          </ActionIcon>
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" size="lg">
                <IconDotsVertical size={18} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Status ändern</Menu.Label>
              {plan.status !== "active" && (
                <Menu.Item onClick={() => handlePlanStatusChange("active")}>
                  Als Aktiv markieren
                </Menu.Item>
              )}
              {plan.status !== "completed" && (
                <Menu.Item
                  leftSection={<IconCheck size={14} />}
                  color="green"
                  onClick={() => handlePlanStatusChange("completed")}
                >
                  Als Abgeschlossen markieren
                </Menu.Item>
              )}
              {plan.status !== "archived" && (
                <Menu.Item
                  leftSection={<IconArchive size={14} />}
                  onClick={() => handlePlanStatusChange("archived")}
                >
                  Archivieren
                </Menu.Item>
              )}
              <Menu.Divider />
              <Menu.Item leftSection={<IconEdit size={14} />} onClick={onEdit}>
                Plan bearbeiten
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      {/* Progress Overview */}
      <PlanProgressStats
        completedCount={completedMeasures}
        totalCount={planMeasures.length}
        totalGaps={skillGaps.length}
        addressedGaps={skillGaps.length - uncoveredGaps.length}
      />

      {/* Uncovered Gaps Alert */}
      {uncoveredGaps.length > 0 && (
        <Alert
          color="orange"
          icon={<IconAlertCircle size={18} />}
          mb="lg"
          title={`${uncoveredGaps.length} Skill-Defizit${uncoveredGaps.length !== 1 ? "e" : ""} ohne Maßnahme`}
        >
          <Group gap="xs" wrap="wrap">
            {uncoveredGaps.slice(0, 5).map((gap) => (
              <Badge key={gap.skillId} variant="light" color="orange">
                {gap.skillName}
              </Badge>
            ))}
            {uncoveredGaps.length > 5 && (
              <Badge variant="light" color="gray">
                +{uncoveredGaps.length - 5} weitere
              </Badge>
            )}
          </Group>
        </Alert>
      )}

      {/* Main Content */}
      <Paper shadow="xs" p="md" radius="md" withBorder>
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List mb="lg">
            <Tabs.Tab
              value="measures"
              leftSection={<IconList size={16} />}
              rightSection={
                planMeasures.length > 0 && (
                  <Badge size="xs" variant="filled" color="blue">
                    {planMeasures.length}
                  </Badge>
                )
              }
            >
              Maßnahmen
            </Tabs.Tab>
            <Tabs.Tab value="timeline" leftSection={<IconTimeline size={16} />}>
              Timeline
            </Tabs.Tab>
            <Tabs.Tab
              value="gaps"
              leftSection={<IconChartBar size={16} />}
              rightSection={
                skillGaps.length > 0 && (
                  <Badge size="xs" variant="filled" color="red">
                    {skillGaps.length}
                  </Badge>
                )
              }
            >
              Defizit-Analyse
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="measures">
            <Stack gap="md">
              <Group justify="space-between">
                <Select
                  placeholder="Alle Status"
                  clearable
                  data={[
                    { value: "pending", label: "Geplant" },
                    { value: "in_progress", label: "In Bearbeitung" },
                    { value: "completed", label: "Abgeschlossen" },
                    { value: "cancelled", label: "Abgebrochen" },
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  style={{ maxWidth: 200 }}
                />
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => handleAddMeasure()}
                  disabled={skillGaps.length === 0 || allGapsFullyPlanned}
                  title={allGapsFullyPlanned ? "Alle Skill-Defizite sind bereits durch Maßnahmen abgedeckt" : "Maßnahme hinzufügen"}
                >
                  Maßnahme hinzufügen
                </Button>
              </Group>

              {filteredMeasures.length === 0 ? (
                <Paper p="xl" radius="md" withBorder ta="center">
                  <ThemeIcon
                    variant="light"
                    size="xl"
                    radius="xl"
                    color="gray"
                    mx="auto"
                  >
                    <IconList size={24} />
                  </ThemeIcon>
                  <Text mt="md" fw={500}>
                    Keine Maßnahmen vorhanden
                  </Text>
                  <Text size="sm" c="dimmed">
                    {skillGaps.length > 0
                      ? "Fügen Sie Maßnahmen hinzu, um die Skill-Defizite zu adressieren."
                      : role?.requiredSkills?.length
                        ? "Keine Skill-Defizite vorhanden - der Mitarbeiter erfüllt alle Anforderungen."
                        : "Die Zielrolle hat keine Skill-Anforderungen definiert. Bitte definieren Sie zuerst Skill-Anforderungen unter Stammdaten > Rollen & Level."}
                  </Text>
                  {skillGaps.length > 0 && (
                    <Button
                      mt="md"
                      onClick={() => handleAddMeasure()}
                      disabled={allGapsFullyPlanned}
                      title={allGapsFullyPlanned ? "Alle Skill-Defizite sind bereits durch Maßnahmen abgedeckt" : "Erste Maßnahme hinzufügen"}
                    >
                      Erste Maßnahme hinzufügen
                    </Button>
                  )}
                </Paper>
              ) : (
                <Stack gap="xl">
                  {/* Group measures by Skill */}
                  {Object.values(
                    filteredMeasures.reduce((acc, measure) => {
                      if (!acc[measure.skillId]) {
                        acc[measure.skillId] = [];
                      }
                      acc[measure.skillId].push(measure);
                      return acc;
                    }, {} as Record<string, QualificationMeasure[]>)
                  ).map((groupMeasures) => (
                    <SkillMeasureGroup
                      key={groupMeasures[0].skillId}
                      skillId={groupMeasures[0].skillId}
                      measures={groupMeasures}
                      skillGaps={skillGaps}
                      employeeId={plan.employeeId}
                      onAddMeasure={handleAddMeasure}
                      onEditMeasure={handleEditMeasure}
                      onDeleteMeasure={handleDeleteMeasure}
                      onStatusChange={handleMeasureStatusChange}
                      onUpdateProgress={(skillId, level) =>
                        setAssessment(plan.employeeId, skillId, level as any)
                      }
                    />
                  ))}
                </Stack>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="timeline">
            <GanttTimeline planId={plan.id!} />
          </Tabs.Panel>

          <Tabs.Panel value="gaps">
            <SkillGapAnalysis
              gaps={skillGaps}
              employeeId={plan.employeeId}
              measures={planMeasures} // Pass measures
              onAddMeasure={handleAddMeasure} // Pass add handler
            />
          </Tabs.Panel>
        </Tabs>
      </Paper>

      {/* Notes */}
      {plan.notes && (
        <Paper shadow="xs" p="md" radius="md" withBorder mt="lg">
          <Text size="sm" fw={500} mb="xs">
            Notizen
          </Text>
          <Text size="sm" c="dimmed">
            {plan.notes}
          </Text>
        </Paper>
      )}

      {/* Measure Form Drawer */}
      <MeasureForm
        opened={measureDrawerOpened}
        onClose={closeMeasureDrawer}
        planId={plan.id!}
        employeeId={plan.employeeId}
        skillGaps={skillGaps}
        editingMeasure={editingMeasure}
        initialSkillId={initialSkillId || undefined} // Fixed type mismatch
        onDelete={handleDeleteMeasure}
      />
    </Box>
  );
};
