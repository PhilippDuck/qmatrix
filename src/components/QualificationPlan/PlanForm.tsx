import React, { useState, useEffect } from "react";
import {
  Drawer,
  Stack,
  Select,
  Group,
  Button,
  Text,
  Divider,
  Textarea,
  Alert,
  Badge,
  Box,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconPlus, IconAlertCircle, IconTarget, IconUser } from "@tabler/icons-react";
import { useData, QualificationPlan, SkillGap } from "../../context/DataContext";
import { usePrivacy } from "../../context/PrivacyContext";
import { SkillGapAnalysis } from "./SkillGapAnalysis";

interface PlanFormProps {
  opened: boolean;
  onClose: () => void;
  editingPlan?: QualificationPlan | null;
}

export const PlanForm: React.FC<PlanFormProps> = ({
  opened,
  onClose,
  editingPlan,
}) => {
  const {
    employees,
    roles,
    addQualificationPlan,
    updateQualificationPlan,
    updateEmployee,
    getSkillGapsForEmployee,
  } = useData();
  const { anonymizeName } = usePrivacy();

  const [formData, setFormData] = useState({
    employeeId: "",
    targetRoleId: "",
    status: "draft" as QualificationPlan["status"],
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([]);

  // Reset form when opened or editing plan changes
  useEffect(() => {
    if (opened) {
      if (editingPlan) {
        setFormData({
          employeeId: editingPlan.employeeId,
          targetRoleId: editingPlan.targetRoleId,
          status: editingPlan.status,
          notes: editingPlan.notes || "",
        });
      } else {
        setFormData({
          employeeId: "",
          targetRoleId: "",
          status: "draft",
          notes: "",
        });
      }
    }
  }, [opened, editingPlan]);

  // Update skill gaps when employee or target role changes
  useEffect(() => {
    if (formData.employeeId && formData.targetRoleId) {
      const gaps = getSkillGapsForEmployee(formData.employeeId, formData.targetRoleId);
      setSkillGaps(gaps);
    } else {
      setSkillGaps([]);
    }
  }, [formData.employeeId, formData.targetRoleId, getSkillGapsForEmployee]);

  // Auto-select employee's current role when employee is selected
  useEffect(() => {
    if (formData.employeeId && !editingPlan) {
      const employee = employees.find((e) => e.id === formData.employeeId);
      if (employee?.role) {
        const role = roles.find((r) => r.name === employee.role);
        if (role) {
          setFormData((prev) => ({ ...prev, targetRoleId: role.id! }));
        }
      }
    }
  }, [formData.employeeId, employees, roles, editingPlan]);

  const handleSave = async () => {
    if (!formData.employeeId || !formData.targetRoleId) return;

    setLoading(true);
    try {
      const targetRole = roles.find((r) => r.id === formData.targetRoleId);

      if (editingPlan) {
        await updateQualificationPlan(editingPlan.id!, {
          targetRoleId: formData.targetRoleId,
          status: formData.status,
          notes: formData.notes || undefined,
        });
      } else {
        // Update employee's role to the target role
        const employee = employees.find((e) => e.id === formData.employeeId);
        if (employee && targetRole) {
          await updateEmployee(formData.employeeId, {
            name: employee.name,
            department: employee.department,
            role: targetRole.name,
          });
        }

        await addQualificationPlan({
          employeeId: formData.employeeId,
          targetRoleId: formData.targetRoleId,
          status: formData.status,
          notes: formData.notes || undefined,
        });
      }
      onClose();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    } finally {
      setLoading(false);
    }
  };

  useHotkeys(
    [
      [
        "mod+Enter",
        (event) => {
          event.preventDefault();
          handleSave();
        },
      ],
    ],
    ["INPUT", "TEXTAREA", "SELECT"]
  );

  const isEditing = !!editingPlan;
  const selectedEmployee = employees.find((e) => e.id === formData.employeeId);
  const selectedRole = roles.find((r) => r.id === formData.targetRoleId);

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="lg"
      overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
      title={
        <Text fw={700} size="lg">
          {isEditing ? "Qualifizierungsplan bearbeiten" : "Neuen Qualifizierungsplan erstellen"}
        </Text>
      }
    >
      <Stack gap="md">
        <Divider label="Grunddaten" labelPosition="center" />

        <Select
          label="Mitarbeiter"
          placeholder="Mitarbeiter auswählen"
          leftSection={<IconUser size={16} />}
          data={employees.map((e) => ({
            value: e.id!,
            label: `${anonymizeName(e.name, e.id)}${e.role ? ` (${e.role})` : ""}`,
          }))}
          value={formData.employeeId}
          onChange={(value) =>
            setFormData({ ...formData, employeeId: value || "" })
          }
          searchable
          required
          disabled={isEditing}
        />

        <Select
          label="Zielrolle"
          placeholder="Zielrolle auswählen"
          leftSection={<IconTarget size={16} />}
          data={roles.map((r) => ({ value: r.id!, label: r.name }))}
          value={formData.targetRoleId}
          onChange={(value) =>
            setFormData({ ...formData, targetRoleId: value || "" })
          }
          searchable
          required
          description={
            selectedEmployee?.role
              ? `Aktuelle Rolle: ${selectedEmployee.role}`
              : undefined
          }
        />

        <Select
          label="Status"
          data={[
            { value: "draft", label: "Entwurf" },
            { value: "active", label: "Aktiv" },
            { value: "completed", label: "Abgeschlossen" },
            { value: "archived", label: "Archiviert" },
          ]}
          value={formData.status}
          onChange={(value) =>
            setFormData({
              ...formData,
              status: (value as QualificationPlan["status"]) || "draft",
            })
          }
        />

        <Textarea
          label="Notizen"
          placeholder="Optionale Notizen zum Plan..."
          value={formData.notes}
          onChange={(e) =>
            setFormData({ ...formData, notes: e.currentTarget.value })
          }
          minRows={3}
        />

        {formData.employeeId && formData.targetRoleId && (
          <>
            <Divider
              label={
                <Group gap="xs">
                  <Text>Defizit-Analyse</Text>
                  {skillGaps.length > 0 && (
                    <Badge color="red" size="sm">
                      {skillGaps.length} Defizite
                    </Badge>
                  )}
                </Group>
              }
              labelPosition="center"
            />

            {skillGaps.length === 0 ? (
              <Alert color="green" icon={<IconAlertCircle size={16} />}>
                {roles.find(r => r.id === formData.targetRoleId)?.requiredSkills?.length
                  ? "Keine Skill-Defizite gefunden! Der Mitarbeiter erfüllt bereits alle Anforderungen der Zielrolle."
                  : "Diese Rolle hat keine Skill-Anforderungen definiert. Bitte definieren Sie zuerst Skill-Anforderungen unter Stammdaten > Rollen & Level."}
              </Alert>
            ) : (
              <Box style={{ maxHeight: 400, overflowY: "auto" }}>
                <SkillGapAnalysis
                  gaps={skillGaps}
                  employeeId={formData.employeeId}
                  compact
                />
              </Box>
            )}
          </>
        )}

        <Group justify="flex-end" mt="xl">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            loading={loading}
            disabled={!formData.employeeId || !formData.targetRoleId}
            leftSection={<IconPlus size={16} />}
          >
            {isEditing ? "Aktualisieren" : "Plan erstellen"}
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
};
