import React from 'react';
import { Group, Title, Tooltip, ActionIcon, Popover, Stack, MultiSelect, Button, Badge } from '@mantine/core';
import {
    IconLayoutNavbarCollapse, IconPlus, IconUserPlus, IconFilter, IconEdit, IconUsersGroup,
    IconBuilding, IconUserCircle, IconSum, IconPercentage, IconTargetArrow, IconEye,
    IconEyeOff, IconColumnsOff, IconX, IconCubePlus
} from '@tabler/icons-react';
import { ViewTabs } from './ViewTabs';
import { Department, EmployeeRole, Category, SavedView } from '../../store/useStore';
import { MetricMode } from '../../hooks/useMatrixState';

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
    departments: Department[];
    roles: EmployeeRole[];
    categories: Category[];
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
}

export const MatrixToolbar: React.FC<MatrixToolbarProps> = ({
    groupingMode, nextGroupingMode, getGroupingLabel, hideEmployees, setHideEmployees,
    metricMode, nextMetricMode, handleGlobalToggle, hideNaColumns, setHideNaColumns,
    filtersOpened, setFiltersOpened, filterDepartments, setFilterDepartments, filterRoles, setFilterRoles,
    filterCategories, setFilterCategories, departments, roles, categories, isEditMode, setIsEditMode,
    setSkillDrawerOpened, setEmployeeDrawerOpened, savedViews, activeViewId, isViewDirty,
    handleSelectView, handleDeleteView, updateSavedView, handleUpdateCurrentView, handleClearView,
    setSaveViewModalOpened, focusEmployeeId, setFocusEmployeeId
}) => {
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
                                color={metricMode === 'fulfillment' ? 'teal' : 'gray'}
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
                                        color={filtersOpened || filterDepartments.length > 0 || filterRoles.length > 0 || filterCategories.length > 0 ? "blue" : "gray"}
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
                                        label="Rollen / Level"
                                        placeholder="Wähle Rollen"
                                        data={roles.map(r => ({ value: r.id!, label: r.name }))}
                                        value={filterRoles}
                                        onChange={setFilterRoles}
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
                (filterDepartments.length > 0 || filterRoles.length > 0 || filterCategories.length > 0) && (
                    <Group mb="md" gap="xs">
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
