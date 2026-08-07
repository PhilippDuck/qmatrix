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
  ActionIcon,
  Menu,
} from "@mantine/core";
import {
  IconSearch,
  IconChevronRight,
  IconChevronDown,
  IconCategory,
  IconTags,
  IconBulb,
  IconAlertCircle,
  IconPencil,
  IconPlus,
  IconInfoCircle,
  IconFold,
  IconFoldDown,
  IconFoldUp,
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

export interface SkillTreeActions {
  readOnly?: boolean;
  onEditCategory?: (cat: Category) => void;
  onEditSubCategory?: (sub: SubCategory) => void;
  onEditSkill?: (skill: Skill) => void;
  onAddCategory?: () => void;
  onAddSubCategory?: (categoryId: string, parentSubId?: string) => void;
  onAddSkill?: (subCategoryId: string) => void;
}

// ---------------------------------------------------------------------------
// Tree (editable when actions provided)
// ---------------------------------------------------------------------------

export const SkillTreeView: React.FC<SkillOverviewData & SkillTreeActions> = ({
  categories,
  subcategories,
  skills,
  readOnly = true,
  onEditCategory,
  onEditSubCategory,
  onEditSkill,
  onAddCategory,
  onAddSubCategory,
  onAddSkill,
}) => {
  const canEdit = !readOnly;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  /** 0 = all collapsed; higher = more levels open */
  const [expandLevel, setExpandLevel] = useState(0);
  const [q, setQ] = useState("");

  const toggle = (id: string) =>
    setOpen((s) => ({ ...s, [id]: !s[id] }));

  const query = q.trim().toLowerCase();

  const subDepthMap = useMemo(() => {
    const byId = new Map(subcategories.map((s) => [s.id!, s]));
    const depthOf = (sub: SubCategory, seen = new Set<string>()): number => {
      if (!sub.parentSubCategoryId) return 0;
      if (seen.has(sub.id!)) return 0;
      seen.add(sub.id!);
      const parent = byId.get(sub.parentSubCategoryId);
      return parent ? depthOf(parent, seen) + 1 : 0;
    };
    const map = new Map<string, number>();
    for (const s of subcategories) {
      if (s.id) map.set(s.id, depthOf(s));
    }
    return map;
  }, [subcategories]);

  const maxExpandLevel = useMemo(() => {
    let maxSub = 0;
    for (const d of subDepthMap.values()) maxSub = Math.max(maxSub, d);
    // 0 collapsed, 1 categories, 2+ categories+subs (maxSub+2 so deepest subs open)
    return categories.length === 0 ? 0 : maxSub + 2;
  }, [categories.length, subDepthMap]);

  const applyExpandLevel = (level: number) => {
    const next: Record<string, boolean> = {};
    for (const cat of categories) {
      if (cat.id) next[cat.id] = level >= 1;
    }
    for (const sub of subcategories) {
      if (!sub.id) continue;
      const d = subDepthMap.get(sub.id) ?? 0;
      // level 2 opens depth-0 subs, level 3 opens depth 0–1, …
      next[sub.id] = level >= d + 2;
    }
    setOpen(next);
    setExpandLevel(level);
  };

  const collapseAll = () => applyExpandLevel(0);
  const expandAll = () => applyExpandLevel(maxExpandLevel);
  const expandOneMore = () =>
    applyExpandLevel(Math.min(expandLevel + 1, maxExpandLevel));

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

  const rowStyle = (depth: number, bg?: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    padding: "4px 8px",
    paddingLeft: 8 + depth * 16,
    borderRadius: 4,
    background: bg,
  });

  /** Info + edit actions right after the label; only visible on row hover */
  const inlineMeta = (
    description: string | undefined,
    actions: React.ReactNode
  ) => (
    <Group gap={2} wrap="nowrap" className="skill-tree-inline" style={{ flexShrink: 0 }}>
      {description?.trim() ? (
        <Tooltip
          label={description}
          multiline
          maw={280}
          withArrow
          openDelay={200}
        >
          <ThemeIcon
            size={16}
            variant="transparent"
            color="gray"
            style={{ cursor: "help" }}
            onClick={(e) => e.stopPropagation()}
          >
            <IconInfoCircle size={12} />
          </ThemeIcon>
        </Tooltip>
      ) : null}
      {actions}
    </Group>
  );

  const renderSub = (node: SubNode, depth: number): React.ReactNode => {
    const id = node.sub.id!;
    const expanded = isOpen(id);
    const hasKids = node.children.length > 0 || node.skills.length > 0;
    return (
      <Box key={id}>
        {/* class only on the row itself — not the wrapper, so parent rows don't stay "hovered" */}
        <Group
          gap={4}
          wrap="nowrap"
          className="skill-tree-row"
          style={rowStyle(depth)}
        >
          <UnstyledButton
            onClick={() => toggle(id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              minWidth: 0,
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
            <Text size="sm" fw={500} lineClamp={1}>
              {node.sub.name}
            </Text>
          </UnstyledButton>
          {inlineMeta(
            node.sub.description,
            canEdit ? (
              <Group gap={0} wrap="nowrap">
                {onAddSkill && (
                  <Tooltip label="Skill hinzufügen">
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      color="teal"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddSkill(id);
                      }}
                    >
                      <IconPlus size={12} />
                    </ActionIcon>
                  </Tooltip>
                )}
                {onAddSubCategory && (
                  <Tooltip label="Unterbereich hinzufügen">
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      color="cyan"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddSubCategory(node.sub.categoryId, id);
                      }}
                    >
                      <IconPlus size={12} />
                    </ActionIcon>
                  </Tooltip>
                )}
                {onEditSubCategory && (
                  <Tooltip label="Bearbeiten">
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      color="gray"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditSubCategory(node.sub);
                      }}
                    >
                      <IconPencil size={12} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
            ) : null
          )}
          <Box style={{ flex: 1, minWidth: 8 }} />
          <Badge size="xs" variant="light" color="gray" style={{ flexShrink: 0 }}>
            {node.skills.length} Skills
          </Badge>
        </Group>
        {expanded && (
          <>
            {node.skills.map((sk) => (
              <Group
                key={sk.id}
                gap={6}
                wrap="nowrap"
                className="skill-tree-row"
                style={rowStyle(depth + 1)}
              >
                <Box w={14} />
                <ThemeIcon size={18} variant="light" color="teal" radius="sm">
                  <IconBulb size={11} />
                </ThemeIcon>
                <Text size="sm" lineClamp={1}>
                  {sk.name}
                </Text>
                {inlineMeta(
                  sk.description,
                  canEdit && onEditSkill ? (
                    <Tooltip label="Bearbeiten">
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        color="gray"
                        onClick={() => onEditSkill(sk)}
                      >
                        <IconPencil size={12} />
                      </ActionIcon>
                    </Tooltip>
                  ) : null
                )}
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
      <Group gap="sm" wrap="nowrap">
        <Menu shadow="sm" width={200} position="bottom-start">
          <Menu.Target>
            <Tooltip label="Ein- / Ausklappen">
              <ActionIcon
                variant="light"
                color="gray"
                size="lg"
                disabled={maxExpandLevel === 0 && categories.length === 0}
              >
                <IconFold size={16} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item
              leftSection={<IconFold size={14} />}
              onClick={collapseAll}
              disabled={expandLevel === 0 && Object.keys(open).length === 0}
            >
              Alles einklappen
            </Menu.Item>
            <Menu.Item
              leftSection={<IconFoldDown size={14} />}
              onClick={expandOneMore}
              disabled={maxExpandLevel === 0 || expandLevel >= maxExpandLevel}
            >
              Eine Stufe weiter
              {expandLevel < maxExpandLevel
                ? ` (${expandLevel}→${expandLevel + 1})`
                : ""}
            </Menu.Item>
            <Menu.Item
              leftSection={<IconFoldUp size={14} />}
              onClick={expandAll}
              disabled={maxExpandLevel === 0}
            >
              Alles ausklappen
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
        <TextInput
          placeholder="Suchen in Kategorien, Bereichen, Skills…"
          leftSection={<IconSearch size={16} />}
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          size="sm"
          style={{ flex: 1, minWidth: 0 }}
        />
        {canEdit && onAddCategory && (
          <ButtonLikeAdd onClick={onAddCategory} label="Kategorie" />
        )}
      </Group>
      <ScrollArea style={{ flex: 1 }} offsetScrollbars type="auto">
        <style>{`
          /* Hover only on the row Group (children are siblings, not nested inside the row) */
          .skill-tree-inline { opacity: 0; pointer-events: none; transition: opacity 0.12s ease; }
          .skill-tree-row:hover .skill-tree-inline { opacity: 1; pointer-events: auto; }
        `}</style>
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
                <Group
                  gap={4}
                  wrap="nowrap"
                  className="skill-tree-row"
                  style={rowStyle(0, "var(--mantine-color-default-hover)")}
                >
                  <UnstyledButton
                    onClick={() => toggle(id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexShrink: 0,
                      minWidth: 0,
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
                    <Text size="sm" fw={600} lineClamp={1}>
                      {cat.name}
                    </Text>
                  </UnstyledButton>
                  {inlineMeta(
                    cat.description,
                    canEdit ? (
                      <Group gap={0} wrap="nowrap">
                        {onAddSubCategory && (
                          <Tooltip label="Bereich hinzufügen">
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color="cyan"
                              onClick={() => onAddSubCategory(id)}
                            >
                              <IconPlus size={12} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        {onEditCategory && (
                          <Tooltip label="Bearbeiten">
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color="gray"
                              onClick={() => onEditCategory(cat)}
                            >
                              <IconPencil size={12} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    ) : null
                  )}
                  <Box style={{ flex: 1, minWidth: 8 }} />
                  <Badge size="xs" variant="light" style={{ flexShrink: 0 }}>
                    {skillCount} Skills
                  </Badge>
                </Group>
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

function ButtonLikeAdd({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <Tooltip label={`${label} hinzufügen`}>
      <ActionIcon variant="light" color="blue" onClick={onClick} size="lg">
        <IconPlus size={16} />
      </ActionIcon>
    </Tooltip>
  );
}

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
