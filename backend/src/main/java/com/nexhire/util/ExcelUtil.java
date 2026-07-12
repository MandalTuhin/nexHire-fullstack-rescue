package com.nexhire.util;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;

/** Shared Apache POI helpers for the Excel bulk-upload workflow (template download + upload parse). */
public final class ExcelUtil {

    private ExcelUtil() {
    }

    /** Row 1 is treated as the header; each subsequent row becomes an ordered header-&gt;cell-text map. */
    public static List<ExcelRow> readSheet(InputStream inputStream) {
        try (Workbook workbook = WorkbookFactory.create(inputStream)) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();
            List<ExcelRow> rows = new ArrayList<>();

            Row headerRow = sheet.getRow(sheet.getFirstRowNum());
            if (headerRow == null) {
                return rows;
            }
            List<String> headers = new ArrayList<>();
            for (Cell cell : headerRow) {
                headers.add(formatter.formatCellValue(cell).trim());
            }

            for (int r = sheet.getFirstRowNum() + 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null || isBlankRow(row, formatter)) {
                    continue;
                }
                LinkedHashMap<String, String> values = new LinkedHashMap<>();
                for (int c = 0; c < headers.size(); c++) {
                    Cell cell = row.getCell(c, Row.MissingCellPolicy.CREATE_NULL_AS_BLANK);
                    values.put(headers.get(c), formatter.formatCellValue(cell).trim());
                }
                // Excel row numbers are 1-based and include the header row.
                rows.add(new ExcelRow(r + 1, values));
            }
            return rows;
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read Excel file", e);
        }
    }

    private static boolean isBlankRow(Row row, DataFormatter formatter) {
        for (Cell cell : row) {
            if (!formatter.formatCellValue(cell).trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }

    public static byte[] writeTemplate(String sheetName, String[] headers, String[][] sampleRows) {
        return writeRows(sheetName, headers, sampleRows == null ? List.of() : List.of(sampleRows));
    }

    /** General-purpose data export — same header styling as writeTemplate, but for an arbitrary
     *  number of real data rows (e.g. the trainee list export) rather than a couple of samples. */
    public static byte[] writeRows(String sheetName, String[] headers, List<String[]> rows) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet(sheetName);
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            Row headerRow = sheet.createRow(0);
            for (int c = 0; c < headers.length; c++) {
                Cell cell = headerRow.createCell(c);
                cell.setCellValue(headers[c]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(c, 20 * 256);
            }

            for (int r = 0; r < rows.size(); r++) {
                Row row = sheet.createRow(r + 1);
                String[] values = rows.get(r);
                for (int c = 0; c < values.length; c++) {
                    row.createCell(c).setCellValue(values[c] == null ? "" : values[c]);
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to build Excel file", e);
        }
    }

    public record ExcelRow(int rowNumber, LinkedHashMap<String, String> values) {
        public String get(String header) {
            return values.get(header);
        }
    }
}
