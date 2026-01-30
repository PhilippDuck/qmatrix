import React from "react";
import { Box, ActionIcon, Badge, Text } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
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
          backgroundColor: "white",
          borderRight: "1px solid #dee2e6",
          borderBottom: "2px solid #dee2e6",
          display: "flex",
          alignItems: "center",
          paddingLeft: "12px",
          color: "#adb5bd",
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
        }}
      >
        Struktur / Team
      </div>
      <div style={{ display: "flex", backgroundColor: "white" }}>
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
                borderBottom: "2px solid #dee2e6",
                borderRight: "1px solid #f1f3f5",
                backgroundColor: isColumnHovered ? "#f8f9fa" : "transparent",
                position: "relative",
                transition: "background-color 0.15s ease",
              }}
            >
              <Box
                style={{
                  height: "28px",
                  visibility: isColumnHovered || isFocused ? "visible" : "hidden",
                }}
              >
                <ActionIcon
                  variant={isFocused ? "filled" : "light"}
                  color={isFocused ? "blue" : "gray"}
                  size="sm"
                  onClick={() => onFocusChange(isFocused ? null : emp.id!)}
                >
                  <IconSearch size={14} />
                </ActionIcon>
              </Box>
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
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  height: "80px",
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
