import { useMemo, useState, useEffect } from "react";
import { useLocalStorage } from "@mantine/hooks";
import { SavedView } from "../store/useStore";

export type MetricMode = 'avg' | 'max' | 'fulfillment';

export function useMatrixState(
    savedViews: SavedView[] | undefined,
    addSavedView: (view: Omit<SavedView, "id" | "updatedAt">) => Promise<string>,
    updateSavedView: (id: string, view: Omit<SavedView, "id" | "updatedAt">) => Promise<void>,
    deleteSavedView: (id: string) => Promise<void>,
    categoryIds: string[],
    subcategoryIds: string[],
    loading: boolean = false,
) {
    // Individual expand/collapse is held in React state only (not persisted to localStorage unless in a View).
    const [collapsedStates, setCollapsedStates] = useState<Record<string, boolean>>({});

    const updateCollapsedStates = (newState: Record<string, boolean>) => {
        setCollapsedStates(newState);
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
    const [filterEmployees, setFilterEmployees] = useLocalStorage<string[]>({
        key: 'skill-matrix-filter-employees',
        defaultValue: [],
    });
    const [filterLevels, setFilterLevels] = useLocalStorage<number[]>({
        key: 'skill-matrix-filter-levels',
        defaultValue: [],
    });
    const [filterSkills, setFilterSkills] = useLocalStorage<string[]>({
        key: 'skill-matrix-filter-skills',
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

    const [showOnlyGaps, setShowOnlyGaps] = useLocalStorage<boolean>({
        key: 'skill-matrix-show-only-gaps',
        defaultValue: false,
    });

    const [activeViewId, setActiveViewId] = useLocalStorage<string | null>({
        key: 'skill-matrix-active-view-id',
        defaultValue: null,
    });

    // Handle initialization and restoration
    // We use a string to track WHICH view (or 'standard') we have restored.
    const [lastRestoredId, setLastRestoredId] = useState<string | null>(null);

    useEffect(() => {
        // Wait until initialization is finished
        if (loading || !savedViews || categoryIds.length === 0) return;

        if (activeViewId) {
            // We have a named view active.
            const activeView = savedViews.find(v => v.id === activeViewId);

            if (activeView) {
                // View found! Restore it if not already done for this ID.
                if (lastRestoredId !== activeViewId) {
                    if (activeView.config.collapsedStates !== undefined) {
                        updateCollapsedStates(activeView.config.collapsedStates);
                    } else {
                        // Fallback for views without explicit collapsed state: collapse all.
                        const initial: Record<string, boolean> = {};
                        [...categoryIds, ...subcategoryIds].forEach(id => { initial[id] = true; });
                        updateCollapsedStates(initial);
                    }
                    setLastRestoredId(activeViewId);
                }
            } else {
                // View ID set but view NOT found. 
                // We keep waiting unless loading is definitively finished.
                // In Zustands store, when loading is false, savedViews should be complete.
                // If it's still not found, it might have been deleted. Fallback to standard.
                if (!loading && lastRestoredId !== 'missing-fallback') {
                    const initial: Record<string, boolean> = {};
                    [...categoryIds, ...subcategoryIds].forEach(id => { initial[id] = true; });
                    updateCollapsedStates(initial);
                    setLastRestoredId('missing-fallback');
                }
            }
        } else {
            // Standard view (activeViewId is null)
            if (lastRestoredId !== 'standard') {
                const initial: Record<string, boolean> = {};
                [...categoryIds, ...subcategoryIds].forEach(id => { initial[id] = true; });
                updateCollapsedStates(initial);
                setLastRestoredId('standard');
            }
        }
    }, [loading, savedViews, categoryIds, subcategoryIds, activeViewId, lastRestoredId]);

    const nextMetricMode = () => {
        setMetricMode(prev => prev === 'avg' ? 'max' : prev === 'max' ? 'fulfillment' : 'avg');
    };

    const nextGroupingMode = () => {
        const modes: ('none' | 'department' | 'role')[] = ['none', 'department', 'role'];
        const currentIndex = modes.indexOf(groupingMode);
        setGroupingMode(modes[(currentIndex + 1) % modes.length]);
    };

    const handleSelectView = (view: SavedView) => {
        setActiveViewId(view.id!);
        setFilterDepartments(view.config.filters.departments);
        setFilterRoles(view.config.filters.roles);
        setFilterCategories(view.config.filters.categories);
        setFilterEmployees(view.config.filters.employees || []);
        setFilterLevels(view.config.filters.levels || []);
        setFilterSkills(view.config.filters.skills || []);
        setGroupingMode(view.config.groupingMode);
        setMetricMode(view.config.settings.metricMode ?? (view.config.settings.showMaxValues ? 'max' : 'avg'));
        setHideEmployees(view.config.settings.hideEmployees);
        setHideNaColumns(view.config.settings.hideNaColumns || false);
        setShowInactive(view.config.settings.showInactive || false);
        setShowOnlyGaps(view.config.settings.showOnlyGaps || false);
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
                    employees: filterEmployees,
                    levels: filterLevels,
                    skills: filterSkills,
                },
                groupingMode: groupingMode,
                settings: {
                    metricMode: metricMode,
                    hideEmployees: hideEmployees,
                    hideNaColumns: hideNaColumns,
                    showInactive: showInactive,
                    showOnlyGaps: showOnlyGaps,
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
            JSON.stringify(config.filters.employees || []) !== JSON.stringify(filterEmployees) ||
            JSON.stringify(config.filters.levels || []) !== JSON.stringify(filterLevels) ||
            JSON.stringify(config.filters.skills || []) !== JSON.stringify(filterSkills) ||
            config.groupingMode !== groupingMode ||
            (config.settings.metricMode ?? (config.settings.showMaxValues ? 'max' : 'avg')) !== metricMode ||
            config.settings.hideEmployees !== hideEmployees ||
            config.settings.hideNaColumns !== hideNaColumns ||
            config.settings.showInactive !== showInactive ||
            (config.settings.showOnlyGaps || false) !== showOnlyGaps ||
            config.sort.employee !== employeeSort ||
            config.sort.skill !== skillSort ||
            JSON.stringify(config.collapsedStates || {}) !== JSON.stringify(collapsedStates)
        );
    }, [activeViewId, savedViews, filterDepartments, filterRoles, filterCategories, filterEmployees, filterLevels, filterSkills, groupingMode, metricMode, hideEmployees, hideNaColumns, employeeSort, skillSort, collapsedStates, showInactive, showOnlyGaps]);

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
                        employees: filterEmployees,
                        levels: filterLevels,
                        skills: filterSkills,
                    },
                    groupingMode: groupingMode,
                    settings: {
                        metricMode: metricMode,
                        hideEmployees: hideEmployees,
                        hideNaColumns: hideNaColumns,
                        showInactive: showInactive,
                        showOnlyGaps: showOnlyGaps,
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
        setFilterEmployees([]);
        setFilterLevels([]);
        setFilterSkills([]);
        setGroupingMode("none");
        setMetricMode('avg');
        setHideEmployees(false);
        setHideNaColumns(false);
        setShowInactive(false);
        setShowOnlyGaps(false);
        setEmployeeSort(null);
        setSkillSort(null);

        const initial: Record<string, boolean> = {};
        [...categoryIds, ...subcategoryIds].forEach(id => { initial[id] = true; });
        updateCollapsedStates(initial);
        setLastRestoredId('standard');
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
        filterEmployees, setFilterEmployees,
        filterLevels, setFilterLevels,
        filterSkills, setFilterSkills,
        metricMode, setMetricMode, nextMetricMode,
        employeeSort, setEmployeeSort,
        skillSort, setSkillSort,
        groupingMode, setGroupingMode, nextGroupingMode,
        hideEmployees, setHideEmployees,
        hideNaColumns, setHideNaColumns,
        showInactive, setShowInactive,
        showOnlyGaps, setShowOnlyGaps,
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
