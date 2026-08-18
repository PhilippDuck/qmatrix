import { useCapabilities } from "../store/hooks";

/** Catalog create/update/delete (skills, categories, roles). */
export function useCatalogAuthoring(): boolean {
  return useCapabilities().catalogAuthoring;
}

/** Team: create/edit blueprint proposals only. */
export function useCatalogBlueprintAuthoring(): boolean {
  return useCapabilities().catalogBlueprintAuthoring;
}

/** Team-only authoring: new catalog rows are blueprints, official rows stay read-only. */
export function useBlueprintOnlyAuthoring(): boolean {
  const caps = useCapabilities();
  return caps.catalogBlueprintAuthoring && !caps.catalogAuthoring;
}

export function useHistoryUndoCatalog(): boolean {
  return useCapabilities().historyUndoCatalog;
}

export function useCatalogImport(): boolean {
  return useCapabilities().catalogImport;
}

export function useCatalogExport(): boolean {
  return useCapabilities().catalogExport;
}

export function useCatalogVersioning(): boolean {
  return useCapabilities().catalogVersioning;
}

export function useFullBackupImport(): boolean {
  return useCapabilities().fullBackupImport;
}

export function useFullBackupExport(): boolean {
  return useCapabilities().fullBackupExport;
}

export function useSelectiveOpsImport(): boolean {
  return useCapabilities().selectiveOpsImport;
}
