import React, { useMemo } from "react";
import {
  Alert,
  Badge,
  Button,
  Collapse,
  Group,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconChevronRight,
  IconPackageExport,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useStore, useShallow } from "../../store/hooks";
import { useCatalogBlueprintAuthoring } from "../../hooks/useCatalogAuthoring";
import {
  buildTeamBlueprintExport,
  countBlueprints,
  downloadTeamBlueprintJson,
  listBlueprintProposals,
  type BlueprintProposal,
  type BlueprintProposalKind,
} from "../../utils/catalogBlueprint";

const KIND_LABEL: Record<BlueprintProposalKind, string> = {
  categories: "Kategorien",
  subcategories: "Bereiche",
  skills: "Skills",
  roles: "Rollen",
};

const KIND_ORDER: BlueprintProposalKind[] = [
  "categories",
  "subcategories",
  "skills",
  "roles",
];

function groupProposals(
  items: BlueprintProposal[]
): { kind: BlueprintProposalKind; items: BlueprintProposal[] }[] {
  return KIND_ORDER.map((kind) => ({
    kind,
    items: items.filter((i) => i.kind === kind),
  })).filter((g) => g.items.length > 0);
}

export const BlueprintExportBar: React.FC = () => {
  const canBlueprint = useCatalogBlueprintAuthoring();
  const [opened, { toggle }] = useDisclosure(false);
  const { categories, subcategories, skills, roles, projectTitle } = useStore(
    useShallow((s) => ({
      categories: s.categories,
      subcategories: s.subcategories,
      skills: s.skills,
      roles: s.roles,
      projectTitle: s.projectTitle,
    }))
  );

  const proposals = useMemo(
    () =>
      listBlueprintProposals(categories, subcategories, skills, roles),
    [categories, subcategories, skills, roles]
  );
  const groups = useMemo(() => groupProposals(proposals), [proposals]);

  if (!canBlueprint) return null;
  const count = countBlueprints(categories, subcategories, skills, roles);
  if (count === 0) {
    return (
      <Alert color="grape" variant="light" mb="md">
        <Text size="sm">
          Neue Kategorien, Skills und Rollen sind Blaupausen — sie erscheinen
          nicht in der Matrix. Sobald Vorschläge bereit sind, hier nach Manage
          exportieren.
        </Text>
      </Alert>
    );
  }

  const handleExport = () => {
    const payload = buildTeamBlueprintExport(
      categories,
      subcategories,
      skills,
      roles,
      projectTitle
    );
    downloadTeamBlueprintJson(payload, projectTitle);
    notifications.show({
      title: "Blaupausen exportiert",
      message: `${count} Vorschlag/Vorschläge für SkillGrid Manage. Dort unter Katalog importieren (Merge).`,
      color: "grape",
    });
  };

  return (
    <Alert color="grape" variant="light" mb="md">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Text size="sm">
          {count} Blaupause(n) — nicht in der Matrix. Export nach Manage, dort
          als Merge übernehmen.
        </Text>
        <Group gap="xs">
          <Button
            size="xs"
            color="grape"
            variant="subtle"
            leftSection={
              opened ? (
                <IconChevronDown size={14} />
              ) : (
                <IconChevronRight size={14} />
              )
            }
            onClick={toggle}
          >
            {opened ? "Vorschläge ausblenden" : "Vorschläge anzeigen"}
          </Button>
          <Button
            size="xs"
            color="grape"
            variant="light"
            leftSection={<IconPackageExport size={14} />}
            onClick={handleExport}
          >
            Blaupausen exportieren
          </Button>
        </Group>
      </Group>

      <Collapse in={opened}>
        <ScrollArea.Autosize mah={280} mt="sm" offsetScrollbars type="auto">
          <Stack gap="sm">
            {groups.map((group) => (
              <Stack key={group.kind} gap={4}>
                <Group gap={6}>
                  <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                    {KIND_LABEL[group.kind]}
                  </Text>
                  <Badge size="xs" variant="light" color="grape">
                    {group.items.length}
                  </Badge>
                </Group>
                {group.items.map((item) => (
                  <Text key={item.id} size="sm" pl={4}>
                    {item.path}
                  </Text>
                ))}
              </Stack>
            ))}
          </Stack>
        </ScrollArea.Autosize>
      </Collapse>
    </Alert>
  );
};
