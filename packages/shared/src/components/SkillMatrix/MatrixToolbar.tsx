import React, { useMemo } from 'react';
import { Group, Title, Tooltip, ActionIcon, Popover, Stack, MultiSelect, Button, Badge } from '@mantine/core';
import {
    IconLayoutNavbarCollapse, IconPlus, IconUserPlus, IconFilter, IconEdit, IconUsersGroup,
    IconBuilding, IconUserCircle, IconSum, IconPercentage, IconTargetArrow, IconEye,
    IconEyeOff, IconColumnsOff, IconX, IconCubePlus, IconTargetOff
} from '@tabler/icons-react';
import { ViewTabs } from './ViewTabs';
import { Department, EmployeeRole, Category, SavedView, Employee, Skill } from '../../store/useStore';
import { SubCategory } from '../../services/indexeddb';
import { MetricMode } from '../../hooks/useMatrixState';
import { usePrivacy } from '../../context/PrivacyContext';

interface MatrixToolbarProps {
    groupingMode: 'none' | 'department' | 'role';
    nextGroupingMode: () => void;
    getGroupingLabel: (mode: 'none' | 'department' | 'role') => string;
    hideEmployees: boolean;
    setHideEmployees: (val: boolean) => void;
    metricMode: MetricMode;
    nextMetricMode: () => void;
    handleGlobalToggle: () => void;
    hideNaColumns: boolean;
    setHideNaColumns: (val: boolean) => void;
    filtersOpened: boolean;
    setFiltersOpened: React.Dispatch<React.SetStateAction<boolean>>;
    filterDepartments: string[];
    setFilterDepartments: React.Dispatch<React.SetStateAction<string[]>>;
    filterRoles: string[];
    setFilterRoles: React.Dispatch<React.SetStateAction<string[]>>;
    filterCategories: string[];
    setFilterCategories: React.Dispatch<React.SetStateAction<string[]>>;
    filterEmployees: string[];
    setFilterEmployees: React.Dispatch<React.SetStateAction<string[]>>;
    filterLevels: number[];
    setFilterLevels: React.Dispatch<React.SetStateAction<number[]>>;
    filterSkills: string[];
    setFilterSkills: React.Dispatch<React.SetStateAction<string[]>>;
    showOnlyGaps: boolean;
    setShowOnlyGaps: (val: boolean) => void;
    employees: Employee[];
    departments: Department[];
    roles: EmployeeRole[];
    categories: Category[];
    subcategories: SubCategory[];
    skills: Skill[];
    isEditMode: boolean;
    setIsEditMode: (val: boolean) => void;
    setSkillDrawerOpened: (val: boolean) => void;
    setEmployeeDrawerOpened: (val: boolean) => void;
    savedViews: SavedView[] | undefined;
    activeViewId: string | null;
    isViewDirty: boolean;
    handleSelectView: (view: SavedView) => void;
    handleDeleteView: (id: string) => void;
    updateSavedView: (id: string, view: Omit<SavedView, "id" | "updatedAt">) => Promise<void>;
    handleUpdateCurrentView: () => void;
    handleClearView: () => void;
    setSaveViewModalOpened: (val: boolean) => void;
    focusEmployeeId: string | null;
    setFocusEmployeeId: (val: string | null) => void;
    reorderSavedViews: (viewIds: string[]) => void;
}

export const MatrixToolbar: React.FC<MatrixToolbarProps> = ({
    groupingMode, nextGroupingMode, getGroupingLabel, hideEmployees, setHideEmployees,
    metricMode, nextMetricMode, handleGlobalToggle, hideNaColumns, setHideNaColumns,
    filtersOpened, setFiltersOpened, filterDepartments, setFilterDepartments, filterRoles, setFilterRoles,
    filterCategories, setFilterCategories, filterEmployees, setFilterEmployees,
    filterLevels, setFilterLevels, filterSkills, setFilterSkills, showOnlyGaps, setShowOnlyGaps,
    employees, departments, roles, categories, subcategories, skills, isEditMode, setIsEditMode,
    setSkillDrawerOpened, setEmployeeDrawerOpened, savedViews, activeViewId, isViewDirty,
    handleSelectView, handleDeleteView, updateSavedView, handleUpdateCurrentView, handleClearView,
    setSaveViewModalOpened, focusEmployeeId, setFocusEmployeeId, reorderSavedViews
}) => {
    const { anonymizeName } = usePrivacy();

    const groupedSkillOptions = useMemo(() => {
        const result: { group: string; items: { value: string; label: string }[] }[] = [];
        categories.forEach(cat => {
            const catSubs = subcategories.filter(sc => sc.categoryId === cat.id);
            catSubs.forEach(sub => {
                const subSkills = skills.filter(s => s.subCategoryId === sub.id);
                if (subSkills.length > 0) {
                    result.push({
                        group: `${cat.name}  ›  ${sub.name}`,
                        items: subSkills.map(s => ({ value: s.id!, label: s.name })),
                    });
                }
            });
        });
        // Skills ohne Zuordnung
        const assignedIds = new Set(skills.filter(s => s.subCategoryId).map(s => s.id!));
        const unassigned = skills.filter(s => !assignedIds.has(s.id!));
        if (unassigned.length > 0) {
            result.push({ group: 'Ohne Kategorie', items: unassigned.map(s => ({ value: s.id!, label: s.name })) });
        }
        return result;
    }, [categories, subcategories, skills]);

    return (
        <>
            <Group justify="space-between" align="center">
                <Group gap="md" align="center">
                    <Title order={2}>Skill-Matrix</Title>

                    {/* View Controls Group */}
                    <Group gap="xs" style={{ borderLeft: '1px solid var(--mantine-color-default-border)', paddingLeft: '12px' }}>
                        <Tooltip label={`Gruppierung: ${getGroupingLabel(groupingMode)}`}>
                            <ActionIcon
                                variant="light"
                                color={groupingMode === "none" ? "gray" : "blue"}
                                onClick={nextGroupingMode}
                                size="lg"
                            >
                                {groupingMode === 'none' ? <IconUsersGroup size={20} /> :
                                    groupingMode === 'department' ? <IconBuilding size={20} /> :
                                        <IconUserCircle size={20} />}
                            </ActionIcon>
                        </Tooltip>

                        {groupingMode !== 'none' && (
                            <Tooltip label={hideEmployees ? "Mitarbeiter einblenden" : "Mitarbeiter ausblenden"}>
                                <ActionIcon
                                    variant="light"
                                    color={hideEmployees ? "blue" : "gray"}
                                    onClick={() => setHideEmployees(!hideEmployees)}
                                    size="lg"
                                >
                                    {hideEmployees ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                                </ActionIcon>
                            </Tooltip>
                        )}

                        <Tooltip label={metricMode === 'avg' ? "Zeige Max-Werte" : metricMode === 'max' ? "Zeige Erfüllungsgrad" : "Zeige Durchschnittswerte"}>
                            <ActionIcon
                                variant="light"
                                color={metricMode !== 'avg' ? 'blue' : 'gray'}
                                onClick={nextMetricMode}
                                size="lg"
                            >
                                {metricMode === 'avg' ? <IconPercentage size={20} /> : metricMode === 'max' ? <IconSum size={20} /> : <IconTargetArrow size={20} />}
                            </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Alle ein-/ausklappen">
                            <ActionIcon
                                variant="light"
                                color="gray"
                                onClick={handleGlobalToggle}
                                size="lg"
                            >
                                <IconLayoutNavbarCollapse size={20} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label={hideNaColumns ? "Leere Spalten (N/A) anzeigen" : "Leere Spalten (N/A) ausblenden"}>
                            <ActionIcon
                                variant="light"
                                color={hideNaColumns ? "blue" : "gray"}
                                onClick={() => setHideNaColumns(!hideNaColumns)}
                                size="lg"
                            >
                                <IconColumnsOff size={20} />
                            </ActionIcon>
                        </Tooltip>

                        <Tooltip label={showOnlyGaps ? "Alle anzeigen" : "Nur Gaps anzeigen (Defizite fokussieren)"}>
                            <ActionIcon
                                variant="light"
                                color={showOnlyGaps ? "orange" : "gray"}
                                onClick={() => setShowOnlyGaps(!showOnlyGaps)}
                                size="lg"
                            >
                                <IconTargetOff size={20} />
                            </ActionIcon>
                        </Tooltip>

                        <Popover
                            width={300}
                            position="bottom"
                            withArrow
                            shadow="md"
                            opened={filtersOpened}
                            onChange={setFiltersOpened}
                        >
                            <Popover.Target>
                                <Tooltip label="Filter">
                                    <ActionIcon
                                        variant="light"
                                        color={filtersOpened || filterDepartments.length > 0 || filterRoles.length > 0 || filterCategories.length > 0 || filterEmployees.length > 0 ? "blue" : "gray"}
                                        size="lg"
                                        aria-label="Filter"
                                        onClick={() => setFiltersOpened((o) => !o)}
                                    >
                                        <IconFilter size={20} />
                                    </ActionIcon>
                                </Tooltip>
                            </Popover.Target>
                            <Popover.Dropdown>
                                <Stack>
                                    <MultiSelect
                                        comboboxProps={{ withinPortal: false }}
                                        label="Abteilungen"
                                        placeholder="Wähle Abteilungen"
                                        data={departments.map(d => ({ value: d.id!, label: d.name }))}
                                        value={filterDepartments}
                                        onChange={setFilterDepartments}
                                        clearable
                                        searchable
                                    />
                                    <MultiSelect
                                        comboboxProps={{ withinPortal: false }}
                                        label="Mitarbeiter"
                                        placeholder="Wähle Mitarbeiter"
                                        data={employees.map(e => ({ value: e.id!, label: anonymizeName(e.name, e.id) }))}
                                        value={filterEmployees}
                                        onChange={setFilterEmployees}
                                        clearable
                                        searchable
                                    />
                                    <MultiSelect
                                        comboboxProps={{ withinPortal: false }}
                                        label="Rollen"
                                        placeholder="Wähle Rollen"
                                        data={roles.map(r => ({ value: r.id!, label: r.name }))}
                                        value={filterRoles}
                                        onChange={setFilterRoles}
                                        clearable
                                        searchable
                                    />
                                    <MultiSelect
                                        comboboxProps={{ withinPortal: false }}
                                        label="Mindest-Level"
                                        placeholder="Wähle Level"
                                        data={[
                                            { value: '0', label: '0 (Keine Kenntnisse)' },
                                            { value: '25', label: '25 (Geplant/Interesse)' },
                                            { value: '50', label: '50 (Anfänger)' },
                                            { value: '75', label: '75 (Fortgeschritten)' },
                                            { value: '100', label: '100 (Experte)' },
                                        ]}
                                        value={filterLevels.map(String)}
                                        onChange={(vals) => setFilterLevels(vals.map(Number))}
                                        clearable
                                        searchable
                                    />
                                    <MultiSelect
                                        comboboxProps={{ withinPortal: false }}
                                        label="Spezifische Skills"
                                        placeholder="Suchen & Wählen"
                                        data={groupedSkillOptions}
                                        value={filterSkills}
                                        onChange={setFilterSkills}
                                        clearable
                                        searchable
                                    />
                                    <MultiSelect
                                        comboboxProps={{ withinPortal: false }}
                                        label="Hauptkategorien"
                                        placeholder="Wähle Kategorien"
                                        data={categories.map(c => ({ value: c.id!, label: c.name }))}
                                        value={filterCategories}
                                        onChange={setFilterCategories}
                                        clearable
                                        searchable
                                    />
                                </Stack>
                            </Popover.Dropdown>
                        </Popover>
                    </Group>

                    {/* Actions Group */}
                    <Group gap="xs" style={{ borderLeft: '1px solid var(--mantine-color-default-border)', paddingLeft: '12px' }}>
                        <Tooltip label={isEditMode ? "Bearbeitungsmodus beenden" : "Bearbeitungsmodus aktivieren"}>
                            <ActionIcon
                                variant="light"
                                color={isEditMode ? "blue" : "gray"}
                                onClick={() => setIsEditMode(!isEditMode)}
                                size="lg"
                            >
                                <IconEdit size={20} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Skill erstellen">
                            <ActionIcon
                                variant="light"
                                color="gray"
                                onClick={() => setSkillDrawerOpened(true)}
                                size="lg"
                            >
                                <IconCubePlus size={20} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Mitarbeiter hinzufügen">
                            <ActionIcon
                                variant="light"
                                color="gray"
                                onClick={() => setEmployeeDrawerOpened(true)}
                                size="lg"
                            >
                                <IconUserPlus size={20} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>

                    {/* Saved Views Tabs */}
                    <ViewTabs
                        savedViews={savedViews || []}
                        activeViewId={activeViewId}
                        isViewDirty={isViewDirty}
                        onSelectView={handleSelectView}
                        onDeleteView={handleDeleteView}
                        onUpdateViewName={(id, name) => updateSavedView(id, { ...savedViews!.find(v => v.id === id)!, name })}
                        onSaveCurrentView={handleUpdateCurrentView}
                        onClearView={handleClearView}
                        onCreateNewView={() => setSaveViewModalOpened(true)}
                        onReorderViews={reorderSavedViews}
                    />
                </Group>
                {focusEmployeeId && (
                    <Button
                        leftSection={<IconX size={16} />}
                        variant="filled"
                        color="red"
                        onClick={() => setFocusEmployeeId(null)}
                    >
                        Fokus beenden
                    </Button>
                )}
            </Group>

            {
                (filterDepartments.length > 0 || filterRoles.length > 0 || filterCategories.length > 0 || filterEmployees.length > 0 || filterLevels.length > 0 || filterSkills.length > 0) && (
                    <Group mb="md" gap="xs">
                        {filterLevels.map((lvl) => {
                            const labels: Record<number, string> = { 0: '0', 25: '25', 50: '50', 75: '75', 100: '100' };
                            return (
                                <Badge
                                    key={`lvl-${lvl}`}
                                    size="lg"
                                    variant="light"
                                    color="gray"
                                    rightSection={
                                        <ActionIcon
                                            size="xs"
                                            color="gray"
                                            variant="transparent"
                                            onClick={() =>
                                                setFilterLevels((prev) => prev.filter((x) => x !== lvl))
                                            }
                                        >
                                            <IconX size={12} />
                                        </ActionIcon>
                                    }
                                >
                                    Level &gt;= {labels[lvl]}
                                </Badge>
                            );
                        })}

                        {filterSkills.map((id) => {
                            const item = skills.find((s) => s.id === id);
                            return item ? (
                                <Badge
                                    key={id}
                                    size="lg"
                                    variant="light"
                                    color="teal"
                                    rightSection={
                                        <ActionIcon
                                            size="xs"
                                            color="teal"
                                            variant="transparent"
                                            onClick={() =>
                                                setFilterSkills((prev) => prev.filter((x) => x !== id))
                                            }
                                        >
                                            <IconX size={12} />
                                        </ActionIcon>
                                    }
                                >
                                    {item.name}
                                </Badge>
                            ) : null;
                        })}
                        {filterEmployees.map((id) => {
                            const item = employees.find((e) => e.id === id);
                            return item ? (
                                <Badge
                                    key={id}
                                    size="lg"
                                    variant="light"
                                    color="orange"
                                    rightSection={
                                        <ActionIcon
                                            size="xs"
                                            color="orange"
                                            variant="transparent"
                                            onClick={() =>
                                                setFilterEmployees((prev) => prev.filter((x) => x !== id))
                                            }
                                        >
                                            <IconX size={12} />
                                        </ActionIcon>
                                    }
                                >
                                    {anonymizeName(item.name, item.id)}
                                </Badge>
                            ) : null;
                        })}

                        {filterDepartments.map((id) => {
                            const item = departments.find((d) => d.id === id);
                            return item ? (
                                <Badge
                                    key={id}
                                    size="lg"
                                    variant="light"
                                    color="blue"
                                    rightSection={
                                        <ActionIcon
                                            size="xs"
                                            color="blue"
                                            variant="transparent"
                                            onClick={() =>
                                                setFilterDepartments((prev) => prev.filter((x) => x !== id))
                                            }
                                        >
                                            <IconX size={12} />
                                        </ActionIcon>
                                    }
                                >
                                    {item.name}
                                </Badge>
                            ) : null;
                        })}

                        {filterRoles.map((id) => {
                            const item = roles.find((r) => r.id === id);
                            return item ? (
                                <Badge
                                    key={id}
                                    size="lg"
                                    variant="light"
                                    color="green"
                                    rightSection={
                                        <ActionIcon
                                            size="xs"
                                            color="green"
                                            variant="transparent"
                                            onClick={() =>
                                                setFilterRoles((prev) => prev.filter((x) => x !== id))
                                            }
                                        >
                                            <IconX size={12} />
                                        </ActionIcon>
                                    }
                                >
                                    {item.name}
                                </Badge>
                            ) : null;
                        })}

                        {filterCategories.map((id) => {
                            const item = categories.find((c) => c.id === id);
                            return item ? (
                                <Badge
                                    key={id}
                                    size="lg"
                                    variant="light"
                                    color="grape"
                                    rightSection={
                                        <ActionIcon
                                            size="xs"
                                            color="grape"
                                            variant="transparent"
                                            onClick={() =>
                                                setFilterCategories((prev) => prev.filter((x) => x !== id))
                                            }
                                        >
                                            <IconX size={12} />
                                        </ActionIcon>
                                    }
                                >
                                    {item.name}
                                </Badge>
                            ) : null;
                        })}

                        <Badge
                            size="lg"
                            variant="light"
                            color="gray"
                            style={{ cursor: "pointer" }}
                            onClick={() => {
                                setFilterDepartments([]);
                                setFilterRoles([]);
                                setFilterCategories([]);
                                setFilterEmployees([]);
                                setFilterLevels([]);
                                setFilterSkills([]);
                            }}
                        >
                            Alle Filter entfernen
                        </Badge>
                    </Group>
                )
            }
        </>
    );
};
