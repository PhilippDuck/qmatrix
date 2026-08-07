/**
 * Additional skill-catalog overview modes: tree, flat table, role matrix.
 */
import React, { useMemo, useState } from "react";
import {
  Box,
  Text,
  TextInput,
  Group,
  Badge,
  ScrollArea,
  Table,
  Stack,
  ThemeIcon,
  UnstyledButton,
  Paper,
  SegmentedControl,
  Tooltip,
} from "@mantine/core";
import {
  IconSearch,
  IconChevronRight,
  IconChevronDown,
  IconCategory,
  IconTags,
  IconBulb,
  IconAlertCircle,
} from "@tabler/icons-react";
import type {
  Category,
  SubCategory,
  Skill,
  EmployeeRole,
} from "../../services/indexeddb";

export interface SkillOverviewData {
  categories: Category[];
  subcategories: SubCategory[];
  skills: Skill[];
  roles: EmployeeRole[];
}

// ---------------------------------------------------------------------------
// Tree
// ---------------------------------------------------------------------------

export const SkillTreeView: React.FC<SkillOverviewData> = ({
  categories,
  subcategories,
  skills,
}) => {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");

  const toggle = (id: string) =>
    setOpen((s) => ({ ...s, [id]: !s[id] }));

  const query = q.trim().toLowerCase();

  const tree = useMemo(() => {
    const match = (name: string, desc?: string) => {
      if (!query) return true;
      return (
        name.toLowerCase().includes(query) ||
        (desc || "").toLowerCase().includes(query)
      );
    };

    return [...categories]
      .sort((a, b) => a.name.localeCompare(b.name, "de"))
      .map((cat) => {
        const catSubs = subcategories
          .filter((s) => s.categoryId === cat.id && !s.parentSubCategoryId)
          .sort((a, b) => a.name.localeCompare(b.name, "de"));

        const buildSub = (sub: SubCategory): {
          sub: SubCategory;
          skills: Skill[];
          children: ReturnType<typeof buildSub>[];
          visible: boolean;
        } => {
          const childSubs = subcategories
            .filter((s) => s.parentSubCategoryId === sub.id)
            .sort((a, b) => a.name.localeCompare(b.name, "de"));
          const subSkills = skills
            .filter((sk) => sk.subCategoryId === sub.id)
            .sort((a, b) => a.name.localeCompare(b.name, "de"));
          const children = childSubs.map(buildSub);
          const skillHit = subSkills.some((sk) => match(sk.name, sk.description));
          const selfHit = match(sub.name, sub.description);
          const childHit = children.some((c) => c.visible);
          const visible = !query || selfHit || skillHit || childHit;
          return {
            sub,
            skills: query
              ? subSkills.filter(
                  (sk) =>
                    match(sk.name, sk.description) ||
                    selfHit ||
                    match(sub.name, sub.description)
                )
              : subSkills,
            children: children.filter((c) => c.visible),
            visible,
          };
        };

        const subs = catSubs.map(buildSub).filter((s) => s.visible);
        const catHit = match(cat.name, cat.description);
        const visible = !query || catHit || subs.length > 0;
        return { cat, subs, visible, skillCount: skills.filter((sk) => {
          const sub = subcategories.find((s) => s.id === sk.subCategoryId);
          return sub?.categoryId === cat.id;
        }).length };
      })
      .filter((n) => n.visible);
  }, [categories, subcategories, skills, query]);

  // Auto-expand when searching
  const isOpen = (id: string) =>
    query ? open[id] !== false : !!open[id];

  type SubNode = {
    sub: SubCategory;
    skills: Skill[];
    children: SubNode[];
    visible: boolean;
  };

  const renderSub = (node: SubNode, depth: number): React.ReactNode => {
    const id = node.sub.id!;
    const expanded = isOpen(id);
    const hasKids = node.children.length > 0 || node.skills.length > 0;
    return (
      <Box key={id}>
        <UnstyledButton
          onClick={() => toggle(id)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            width: "100%",
            padding: "4px 8px",
            paddingLeft: 8 + depth * 16,
            borderRadius: 4,
          }}
        >
          {hasKids ? (
            expanded ? (
              <IconChevronDown size={14} />
            ) : (
              <IconChevronRight size={14} />
            )
          ) : (
            <Box w={14} />
          )}
          <ThemeIcon size={20} variant="light" color="cyan" radius="sm">
            <IconTags size={12} />
          </ThemeIcon>
          <Text size="sm" fw={500}>
            {node.sub.name}
          </Text>
          <Badge size="xs" variant="light" color="gray">
            {node.skills.length}
          </Badge>
        </UnstyledButton>
        {expanded && (
          <>
            {node.skills.map((sk) => (
              <Group
                key={sk.id}
                gap={6}
                wrap="nowrap"
                style={{
                  padding: "3px 8px",
                  paddingLeft: 8 + (depth + 1) * 16,
                }}
              >
                <Box w={14} />
                <ThemeIcon size={18} variant="light" color="teal" radius="sm">
                  <IconBulb size={11} />
                </ThemeIcon>
                <Text size="sm">{sk.name}</Text>
                {sk.catalogDeprecated && (
                  <Badge size="xs" color="orange" variant="light">
                    veraltet
                  </Badge>
                )}
              </Group>
            ))}
            {node.children.map((c) => renderSub(c, depth + 1))}
          </>
        )}
      </Box>
    );
  };

  return (
    <Stack gap="sm" h="100%" style={{ minHeight: 0 }}>
      <TextInput
        placeholder="Suchen in Kategorien, Bereichen, Skills…"
        leftSection={<IconSearch size={16} />}
        value={q}
        onChange={(e) => setQ(e.currentTarget.value)}
        size="sm"
      />
      <ScrollArea style={{ flex: 1 }} offsetScrollbars type="auto">
        {tree.length === 0 ? (
          <Text c="dimmed" size="sm" ta="center" py="xl">
            Keine Treffer
          </Text>
        ) : (
          tree.map(({ cat, subs, skillCount }) => {
            const id = cat.id!;
            const expanded = isOpen(id);
            return (
              <Box key={id} mb={4}>
                <UnstyledButton
                  onClick={() => toggle(id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: 4,
                    background: "var(--mantine-color-default-hover)",
                  }}
                >
                  {expanded ? (
                    <IconChevronDown size={14} />
                  ) : (
                    <IconChevronRight size={14} />
                  )}
                  <ThemeIcon size={22} variant="light" color="blue" radius="sm">
                    <IconCategory size={13} />
                  </ThemeIcon>
                  <Text size="sm" fw={600}>
                    {cat.name}
                  </Text>
                  <Badge size="xs" variant="light">
                    {skillCount} Skills
                  </Badge>
                </UnstyledButton>
                {expanded &&
                  (subs as SubNode[]).map((s) => renderSub(s, 1))}
              </Box>
            );
          })
        )}
      </ScrollArea>
    </Stack>
  );
};

// ---------------------------------------------------------------------------
// Flat table
// ---------------------------------------------------------------------------

type TableFilter = "all" | "no-role" | "deprecated" | "no-desc";

export const SkillTableView: React.FC<SkillOverviewData> = ({
  categories,
  subcategories,
  skills,
  roles,
}) => {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<TableFilter>("all");

  const skillIdsWithRole = useMemo(() => {
    const set = new Set<string>();
    for (const role of roles) {
      for (const req of role.requiredSkills || []) {
        set.add(req.skillId);
      }
    }
    return set;
  }, [roles]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return skills
      .map((sk) => {
        const sub = subcategories.find((s) => s.id === sk.subCategoryId);
        const cat = categories.find((c) => c.id === sub?.categoryId);
        const roleCount = roles.filter((r) =>
          (r.requiredSkills || []).some((req) => req.skillId === sk.id)
        ).length;
        return { sk, sub, cat, roleCount };
      })
      .filter(({ sk, sub, cat, roleCount }) => {
        if (filter === "no-role" && skillIdsWithRole.has(sk.id!)) return false;
        if (filter === "deprecated" && !sk.catalogDeprecated) return false;
        if (filter === "no-desc" && sk.description?.trim()) return false;
        if (!query) return true;
        const hay = [sk.name, sk.description, sub?.name, cat?.name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(query) || roleCount.toString() === query;
      })
      .sort((a, b) => {
        const ca = a.cat?.name || "";
        const cb = b.cat?.name || "";
        if (ca !== cb) return ca.localeCompare(cb, "de");
        const sa = a.sub?.name || "";
        const sb = b.sub?.name || "";
        if (sa !== sb) return sa.localeCompare(sb, "de");
        return a.sk.name.localeCompare(b.sk.name, "de");
      });
  }, [skills, subcategories, categories, roles, q, filter, skillIdsWithRole]);

  return (
    <Stack gap="sm" h="100%" style={{ minHeight: 0 }}>
      <Group gap="sm" wrap="wrap">
        <TextInput
          placeholder="Skills durchsuchen…"
          leftSection={<IconSearch size={16} />}
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          size="sm"
          style={{ flex: 1, minWidth: 200 }}
        />
        <SegmentedControl
          size="xs"
          value={filter}
          onChange={(v) => setFilter(v as TableFilter)}
          data={[
            { value: "all", label: "Alle" },
            { value: "no-role", label: "Ohne Rolle" },
            { value: "no-desc", label: "Ohne Text" },
            { value: "deprecated", label: "Veraltet" },
          ]}
        />
        <Badge variant="light" color="gray">
          {rows.length} / {skills.length}
        </Badge>
      </Group>
      <ScrollArea style={{ flex: 1 }} offsetScrollbars type="auto">
        <Table striped highlightOnHover stickyHeader withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Skill</Table.Th>
              <Table.Th>Kategorie</Table.Th>
              <Table.Th>Bereich</Table.Th>
              <Table.Th style={{ width: 100 }}>Rollen</Table.Th>
              <Table.Th style={{ width: 100 }}>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text c="dimmed" size="sm" ta="center" py="md">
                    Keine Skills
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              rows.map(({ sk, sub, cat, roleCount }) => (
                <Table.Tr key={sk.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {sk.name}
                    </Text>
                    {sk.description && (
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {sk.description}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{cat?.name || "—"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{sub?.name || "—"}</Text>
                  </Table.Td>
                  <Table.Td>
                    {roleCount === 0 ? (
                      <Tooltip label="Kein Rollen-Soll referenziert diesen Skill">
                        <Badge
                          size="sm"
                          color="orange"
                          variant="light"
                          leftSection={<IconAlertCircle size={10} />}
                        >
                          0
                        </Badge>
                      </Tooltip>
                    ) : (
                      <Badge size="sm" variant="light" color="blue">
                        {roleCount}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {sk.catalogDeprecated ? (
                      <Badge size="sm" color="orange" variant="outline">
                        veraltet
                      </Badge>
                    ) : (
                      <Badge size="sm" color="green" variant="light">
                        aktiv
                      </Badge>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  );
};

// ---------------------------------------------------------------------------
// Role × skill matrix (compact: categories as row groups, roles as columns)
// ---------------------------------------------------------------------------

const LEVEL_LABEL: Record<number, string> = {
  0: "0",
  25: "25",
  50: "50",
  75: "75",
  100: "100",
  [-1]: "n.a.",
};

export const SkillRoleMatrixView: React.FC<SkillOverviewData> = ({
  categories,
  subcategories,
  skills,
  roles,
}) => {
  const [q, setQ] = useState("");
  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => a.name.localeCompare(b.name, "de")),
    [roles]
  );

  const levelByRoleSkill = useMemo(() => {
    const map = new Map<string, number>();
    for (const role of roles) {
      for (const req of role.requiredSkills || []) {
        map.set(`${role.id}:${req.skillId}`, req.level);
      }
    }
    return map;
  }, [roles]);

  const grouped = useMemo(() => {
    const query = q.trim().toLowerCase();
    return [...categories]
      .sort((a, b) => a.name.localeCompare(b.name, "de"))
      .map((cat) => {
        const catSkills = skills
          .filter((sk) => {
            const sub = subcategories.find((s) => s.id === sk.subCategoryId);
            if (sub?.categoryId !== cat.id) return false;
            if (!query) return true;
            return sk.name.toLowerCase().includes(query);
          })
          .sort((a, b) => a.name.localeCompare(b.name, "de"));
        return { cat, skills: catSkills };
      })
      .filter((g) => g.skills.length > 0);
  }, [categories, subcategories, skills, q]);

  if (roles.length === 0) {
    return (
      <Text c="dimmed" size="sm" ta="center" py="xl">
        Noch keine Rollen — Matrix braucht Rollen mit Soll-Skills.
      </Text>
    );
  }

  return (
    <Stack gap="sm" h="100%" style={{ minHeight: 0 }}>
      <Group>
        <TextInput
          placeholder="Skill filtern…"
          leftSection={<IconSearch size={16} />}
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          size="sm"
          style={{ flex: 1, maxWidth: 320 }}
        />
        <Text size="xs" c="dimmed">
          Zellen = Soll-Level der Rolle für den Skill
        </Text>
      </Group>
      <ScrollArea style={{ flex: 1 }} offsetScrollbars type="auto">
        <Table
          striped
          highlightOnHover
          stickyHeader
          withTableBorder
          withColumnBorders
          style={{ minWidth: 200 + sortedRoles.length * 88 }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 3,
                  background: "var(--mantine-color-body)",
                  minWidth: 180,
                }}
              >
                Skill
              </Table.Th>
              {sortedRoles.map((r) => (
                <Table.Th
                  key={r.id}
                  style={{ textAlign: "center", maxWidth: 100 }}
                >
                  <Text size="xs" fw={600} lineClamp={2}>
                    {r.name}
                  </Text>
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {grouped.map(({ cat, skills: catSkills }) => (
              <React.Fragment key={cat.id}>
                <Table.Tr>
                  <Table.Td
                    colSpan={1 + sortedRoles.length}
                    style={{
                      background: "var(--mantine-color-default-hover)",
                      position: "sticky",
                      left: 0,
                    }}
                  >
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                      {cat.name}
                    </Text>
                  </Table.Td>
                </Table.Tr>
                {catSkills.map((sk) => (
                  <Table.Tr key={sk.id}>
                    <Table.Td
                      style={{
                        position: "sticky",
                        left: 0,
                        background: "var(--mantine-color-body)",
                        zIndex: 1,
                      }}
                    >
                      <Text size="sm">{sk.name}</Text>
                    </Table.Td>
                    {sortedRoles.map((role) => {
                      const level = levelByRoleSkill.get(`${role.id}:${sk.id}`);
                      return (
                        <Table.Td key={role.id} ta="center" p={4}>
                          {level === undefined ? (
                            <Text size="xs" c="dimmed">
                              ·
                            </Text>
                          ) : (
                            <Badge
                              size="sm"
                              variant="light"
                              color={
                                level >= 75
                                  ? "green"
                                  : level >= 50
                                    ? "blue"
                                    : level >= 25
                                      ? "yellow"
                                      : "gray"
                              }
                            >
                              {LEVEL_LABEL[level] ?? level}
                            </Badge>
                          )}
                        </Table.Td>
                      );
                    })}
                  </Table.Tr>
                ))}
              </React.Fragment>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  );
};

/** Shared panel chrome for overview tabs */
export const OverviewPanelShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <Paper
    withBorder
    p="md"
    radius="md"
    style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}
  >
    {children}
  </Paper>
);
