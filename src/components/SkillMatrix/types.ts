
import { Employee } from "../../context/DataContext";

export type MatrixColumn =
    | { type: 'employee'; id: string; employee: Employee; groupId?: string; backgroundColor?: string }
    | { type: 'group-summary'; id: string; label: string; employeeIds: string[]; groupId?: string; backgroundColor?: string };
