import { useCapabilities } from "../store/hooks";

/** Catalog create/update/delete (skills, categories, roles). */
export function useCatalogAuthoring(): boolean {
  return useCapabilities().catalogAuthoring;
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
