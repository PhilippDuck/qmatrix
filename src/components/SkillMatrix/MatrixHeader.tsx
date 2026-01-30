import React from "react";
import { Badge, Text } from "@mantine/core";
import { MATRIX_LAYOUT } from "../../constants/skillLevels";
import { getScoreColor } from "../../utils/skillCalculations";
import { Employee } from "../../context/DataContext";

interface MatrixHeaderProps {
  employees: Employee[];
  focusEmployeeId: string | null;
  hoveredEmployeeId: string | null;
  onFocusChange: (employeeId: string | null) => void;
  onHoverChange: (employeeId: string | null) => void;
  calculateEmployeeAverage: (employeeId: string) => number | null;
}

export const MatrixHeader: React.FC<MatrixHeaderProps> = ({
  employees,
  focusEmployeeId,
  hoveredEmployeeId,
  onFocusChange,
  onHoverChange,
  calculateEmployeeAverage,
}) => {
  const { cellSize, labelWidth, headerHeight } = MATRIX_LAYOUT;

  return (
    <div
      style={{
        display: "flex",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div
        style={{
          width: labelWidth,
          height: headerHeight,
          position: "sticky",
          left: 0,
          zIndex: 21,
          backgroundColor: "var(--mantine-color-body)",
          borderRight: "1px solid var(--mantine-color-default-border)",
          borderBottom: "2px solid var(--mantine-color-default-border)",
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
          color: "var(--mantine-color-dimmed)",
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
        }}
      >
        Struktur / Team
      </div>
      <div style={{ display: "flex", backgroundColor: "var(--mantine-color-body)" }}>
        {employees.map((emp) => {
          const avg = calculateEmployeeAverage(emp.id!);
          const isColumnHovered = hoveredEmployeeId === emp.id;
          const isFocused = focusEmployeeId === emp.id;
          return (
            <div
              key={emp.id}
              onMouseEnter={() => onHoverChange(emp.id!)}
              onMouseLeave={() => onHoverChange(null)}
              style={{
                width: cellSize,
                height: headerHeight,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingBottom: "12px",
                borderBottom: "2px solid var(--mantine-color-default-border)",
                borderRight: "1px solid var(--mantine-color-default-border)",
                backgroundColor: isColumnHovered
                  ? "var(--mantine-color-default-hover)"
                  : "transparent",
                position: "relative",
                transition: "background-color 0.15s ease",
              }}
            >
              <Badge
                size="xs"
                variant="outline"
                color={getScoreColor(avg)}
                mb="xs"
              >
                {avg === null ? "N/A" : `${avg}%`}
              </Badge>
              <Text
                size="xs"
                fw={isColumnHovered || isFocused ? 700 : 400}
                onClick={() => onFocusChange(isFocused ? null : emp.id!)}
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  height: "80px",
                  cursor: "pointer",
                  color: isFocused ? "var(--mantine-color-blue-filled)" : undefined,
                }}
              >
                {emp.name}
              </Text>
            </div>
          );
        })}
      </div>
    </div>
  );
};
