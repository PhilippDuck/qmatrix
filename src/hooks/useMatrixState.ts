import { useMemo, useState } from "react";
import { useLocalStorage } from "@mantine/hooks";
import { SavedView } from "../context/DataContext";

export type MetricMode = 'avg' | 'max' | 'fulfillment';

export function useMatrixState(
    savedViews: SavedView[] | undefined,
    addSavedView: (view: Omit<SavedView, "id" | "updatedAt">) => Promise<string>,
    updateSavedView: (id: string, view: Omit<SavedView, "id" | "updatedAt">) => Promise<void>,
    deleteSavedView: (id: string) => Promise<void>
) {
    const [collapsedStates, setCollapsedStates] = useState<Record<string, boolean>>(() => {
        const saved = localStorage.getItem("skill-matrix-collapsed");
        return saved ? JSON.parse(saved) : {};
    });

    const updateCollapsedStates = (newState: Record<string, boolean>) => {
        setCollapsedStates(newState);
        localStorage.setItem("skill-matrix-collapsed", JSON.stringify(newState));
    };

    const toggleItem = (id: string) => {
        updateCollapsedStates({ ...collapsedStates, [id]: !collapsedStates[id] });
    };

    const [filterDepartments, setFilterDepartments] = useLocalStorage<string[]>({
        key: 'skill-matrix-filter-departments',
        defaultValue: [],
    });
    const [filterRoles, setFilterRoles] = useLocalStorage<string[]>({
        key: 'skill-matrix-filter-roles',
        defaultValue: [],
    });
    const [filterCategories, setFilterCategories] = useLocalStorage<string[]>({
        key: 'skill-matrix-filter-categories',
        defaultValue: [],
    });

    const [metricMode, setMetricMode] = useLocalStorage<MetricMode>({
        key: 'skill-matrix-metric-mode',
        defaultValue: 'avg',
    });

    const [employeeSort, setEmployeeSort] = useLocalStorage<'asc' | 'desc' | null>({
        key: 'skill-matrix-sort-employee',
        defaultValue: null,
    });
    const [skillSort, setSkillSort] = useLocalStorage<'asc' | 'desc' | null>({
        key: 'skill-matrix-sort-skill',
        defaultValue: null,
    });

    const [groupingMode, setGroupingMode] = useLocalStorage<'none' | 'department' | 'role'>({
        key: 'skill-matrix-grouping-mode',
        defaultValue: 'none',
    });

    const [hideEmployees, setHideEmployees] = useLocalStorage<boolean>({
        key: 'skill-matrix-hide-employees',
        defaultValue: false,
    });

    const [hideNaColumns, setHideNaColumns] = useLocalStorage<boolean>({
        key: 'skill-matrix-hide-na-columns',
        defaultValue: false,
    });

    const [showInactive, setShowInactive] = useLocalStorage<boolean>({
        key: 'skill-matrix-show-inactive',
        defaultValue: false,
    });

    const [activeViewId, setActiveViewId] = useLocalStorage<string | null>({
        key: 'skill-matrix-active-view-id',
        defaultValue: null,
    });

    const nextMetricMode = () => {
        setMetricMode(prev => prev === 'avg' ? 'max' : prev === 'max' ? 'fulfillment' : 'avg');
    };

    const nextGroupingMode = () => {
        const modes: ('none' | 'department' | 'role')[] = ['none', 'department', 'role'];
        const currentIndex = modes.indexOf(groupingMode);
        setGroupingMode(modes[(currentIndex + 1) % modes.length]);
    };

    const handleSelectView = (view: SavedView) => {
        if (!activeViewId) {
            localStorage.setItem("skill-matrix-collapsed-standard", JSON.stringify(collapsedStates));
        }

        setActiveViewId(view.id!);
        setFilterDepartments(view.config.filters.departments);
        setFilterRoles(view.config.filters.roles);
        setFilterCategories(view.config.filters.categories);
        setGroupingMode(view.config.groupingMode);
        setMetricMode(view.config.settings.metricMode ?? (view.config.settings.showMaxValues ? 'max' : 'avg'));
        setHideEmployees(view.config.settings.hideEmployees);
        setHideNaColumns(view.config.settings.hideNaColumns || false);
        setShowInactive(view.config.settings.showInactive || false);
        setEmployeeSort(view.config.sort.employee);
        setSkillSort(view.config.sort.skill);

        if (view.config.collapsedStates) {
            updateCollapsedStates(view.config.collapsedStates);
        }
    };

    const handleSaveView = async (name: string) => {
        const newView: Omit<SavedView, "id" | "updatedAt"> = {
            name: name,
            config: {
                filters: {
                    departments: filterDepartments,
                    roles: filterRoles,
                    categories: filterCategories,
                },
                groupingMode: groupingMode,
                settings: {
                    metricMode: metricMode,
                    hideEmployees: hideEmployees,
                    hideNaColumns: hideNaColumns,
                    showInactive: showInactive,
                },
                sort: {
                    employee: employeeSort,
                    skill: skillSort,
                },
                collapsedStates: collapsedStates,
            },
        };

        try {
            const id = await addSavedView(newView);
            setActiveViewId(id);
        } catch (error) {
            console.error("Failed to save view:", error);
        }
    };

    const isViewDirty = useMemo(() => {
        if (!activeViewId) return false;
        const activeView = savedViews?.find(v => v.id === activeViewId);
        if (!activeView) return false;

        const config = activeView.config;
        return (
            JSON.stringify(config.filters.departments) !== JSON.stringify(filterDepartments) ||
            JSON.stringify(config.filters.roles) !== JSON.stringify(filterRoles) ||
            JSON.stringify(config.filters.categories) !== JSON.stringify(filterCategories) ||
            config.groupingMode !== groupingMode ||
            (config.settings.metricMode ?? (config.settings.showMaxValues ? 'max' : 'avg')) !== metricMode ||
            config.settings.hideEmployees !== hideEmployees ||
            config.settings.hideNaColumns !== hideNaColumns ||
            config.settings.showInactive !== showInactive ||
            config.sort.employee !== employeeSort ||
            config.sort.skill !== skillSort ||
            JSON.stringify(config.collapsedStates || {}) !== JSON.stringify(collapsedStates)
        );
    }, [activeViewId, savedViews, filterDepartments, filterRoles, filterCategories, groupingMode, metricMode, hideEmployees, hideNaColumns, employeeSort, skillSort, collapsedStates, showInactive]);

    const handleUpdateCurrentView = async () => {
        if (!activeViewId) return;
        const activeView = savedViews?.find(v => v.id === activeViewId);
        if (!activeView) return;

        try {
            await updateSavedView(activeViewId, {
                name: activeView.name,
                config: {
                    filters: {
                        departments: filterDepartments,
                        roles: filterRoles,
                        categories: filterCategories,
                    },
                    groupingMode: groupingMode,
                    settings: {
                        metricMode: metricMode,
                        hideEmployees: hideEmployees,
                        hideNaColumns: hideNaColumns,
                        showInactive: showInactive,
                    },
                    sort: {
                        employee: employeeSort,
                        skill: skillSort,
                    },
                    collapsedStates: collapsedStates,
                },
            });
        } catch (error) {
            console.error("Failed to update view:", error);
        }
    };

    const handleClearView = () => {
        setActiveViewId(null);
        setFilterDepartments([]);
        setFilterRoles([]);
        setFilterCategories([]);
        setGroupingMode("none");
        setMetricMode('avg');
        setHideEmployees(false);
        setHideNaColumns(false);
        setShowInactive(false);
        setEmployeeSort(null);
        setSkillSort(null);

        const savedStandard = localStorage.getItem("skill-matrix-collapsed-standard");
        if (savedStandard) {
            updateCollapsedStates(JSON.parse(savedStandard));
        } else {
            updateCollapsedStates({});
        }
    };

    const handleDeleteView = async (id: string) => {
        if (activeViewId === id) {
            handleClearView();
        }
        await deleteSavedView(id);
    };

    return {
        // States
        collapsedStates, updateCollapsedStates, toggleItem,
        filterDepartments, setFilterDepartments,
        filterRoles, setFilterRoles,
        filterCategories, setFilterCategories,
        metricMode, setMetricMode, nextMetricMode,
        employeeSort, setEmployeeSort,
        skillSort, setSkillSort,
        groupingMode, setGroupingMode, nextGroupingMode,
        hideEmployees, setHideEmployees,
        hideNaColumns, setHideNaColumns,
        showInactive, setShowInactive,
        activeViewId, setActiveViewId,
        // Computed
        isViewDirty,
        // Handlers
        handleSelectView,
        handleSaveView,
        handleUpdateCurrentView,
        handleClearView,
        handleDeleteView,
    };
}
