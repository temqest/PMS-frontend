"use client";

import dayjs, { type Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import type { SxProps, Theme } from "@mui/material/styles";

const STORAGE_DATE_FORMAT = "YYYY-MM-DD";

dayjs.extend(customParseFormat);

type VariantStyle = {
  height: number;
  borderRadius: string;
  fontSize: number;
  horizontalPadding: string;
  verticalPadding: string;
};

type SharedDatePickerProps = {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: boolean;
  disabled?: boolean;
  disableFuture?: boolean;
  disablePast?: boolean;
  minDate?: string;
  maxDate?: string;
  format?: string;
  variant?: "modal" | "invoice" | "auth";
};

const variantStyles: Record<NonNullable<SharedDatePickerProps["variant"]>, VariantStyle> = {
  modal: {
    height: 48,
    borderRadius: "12px",
    fontSize: 15,
    horizontalPadding: "14px",
    verticalPadding: "0px",
  },
  invoice: {
    height: 44,
    borderRadius: "14px",
    fontSize: 14,
    horizontalPadding: "14px",
    verticalPadding: "0px",
  },
  auth: {
    height: 48,
    borderRadius: "12px",
    fontSize: 15,
    horizontalPadding: "14px",
    verticalPadding: "0px",
  },
};

function buildPickerSx(variant: NonNullable<SharedDatePickerProps["variant"]>): SxProps<Theme> {
  const tokens = variantStyles[variant];

  return {
    width: "100%",
    margin: 0,
    "& .MuiFormLabel-root": {
      display: "none",
    },
    "& .MuiOutlinedInput-root": {
      height: `${tokens.height}px`,
      minHeight: `${tokens.height}px`,
      borderRadius: tokens.borderRadius,
      backgroundColor: "#ffffff",
      color: "#27272a",
      fontSize: `${tokens.fontSize}px`,
      lineHeight: 1.4,
      paddingRight: "4px",
      boxSizing: "border-box",
      alignItems: "center",
      transition: "border-color 200ms ease, box-shadow 200ms ease",
      "& fieldset": {
        borderColor: "#e5e7eb",
      },
      "&:hover fieldset": {
        borderColor: "#d1d5db",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#6b9080",
      },
      "&.Mui-focused": {
        boxShadow: "0 0 0 4px rgba(107, 144, 128, 0.08)",
      },
      "&.Mui-error fieldset": {
        borderColor: "#ef4444",
      },
      "&.Mui-error.Mui-focused": {
        boxShadow: "0 0 0 4px rgba(239, 68, 68, 0.08)",
      },
    },
    "& .MuiInputBase-input": {
      height: `${tokens.height}px`,
      minHeight: `${tokens.height}px`,
      boxSizing: "border-box",
      padding: `${tokens.verticalPadding} ${tokens.horizontalPadding}`,
      fontSize: `${tokens.fontSize}px`,
      fontWeight: 400,
      lineHeight: `${tokens.height}px`,
      color: "#27272a",
    },
    "& .MuiPickersSectionList-root": {
      minHeight: `${tokens.height}px`,
      padding: `0 ${tokens.horizontalPadding}`,
      fontSize: `${tokens.fontSize}px`,
      color: "#27272a",
      alignItems: "center",
    },
    "& .MuiPickersInputBase-sectionsContainer": {
      minHeight: `${tokens.height}px`,
      alignItems: "center",
    },
    "& .MuiPickersSectionList-section, & .MuiPickersInputBase-sectionContent": {
      fontSize: `${tokens.fontSize}px`,
      lineHeight: 1.4,
    },
    "& .MuiInputAdornment-root": {
      marginLeft: 0,
      marginRight: "4px",
      alignSelf: "center",
    },
    "& .MuiIconButton-root": {
      color: "#9ca3af",
      padding: "6px",
    },
    "& .MuiSvgIcon-root": {
      fontSize: "1.125rem",
    },
  };
}

function parseStorageDate(value: string) {
  if (!value) return null;
  const parsed = dayjs(value, STORAGE_DATE_FORMAT, true);
  return parsed.isValid() ? parsed : null;
}

function formatStorageDate(value: Dayjs | null) {
  return value && value.isValid() ? value.format(STORAGE_DATE_FORMAT) : "";
}

export { STORAGE_DATE_FORMAT, formatStorageDate };

export default function SharedDatePicker({
  ariaLabel,
  value,
  onChange,
  onBlur,
  error = false,
  disabled = false,
  disableFuture = false,
  disablePast = false,
  minDate,
  maxDate,
  format = "MMM D, YYYY",
  variant = "modal",
}: SharedDatePickerProps) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        value={parseStorageDate(value)}
        onChange={(nextValue) => onChange(formatStorageDate(nextValue))}
        format={format}
        disabled={disabled}
        disableFuture={disableFuture}
        disablePast={disablePast}
        minDate={parseStorageDate(minDate || "") ?? undefined}
        maxDate={parseStorageDate(maxDate || "") ?? undefined}
        slotProps={{
          textField: {
            fullWidth: true,
            error,
            onBlur,
            variant: "outlined",
            size: "small",
            sx: buildPickerSx(variant),
            slotProps: {
              htmlInput: {
                "aria-label": ariaLabel,
              },
            },
          },
          actionBar: {
            actions: ["clear", "accept"],
          },
          openPickerButton: {
            edge: "end",
          },
        }}
      />
    </LocalizationProvider>
  );
}
