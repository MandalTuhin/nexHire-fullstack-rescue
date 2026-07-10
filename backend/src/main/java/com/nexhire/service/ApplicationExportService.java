package com.nexhire.service;

import com.nexhire.dto.ApplicationResponse;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ApplicationExportService {

    private static final String[] HEADERS = {
            "Application ID", "Candidate Name", "Email", "Job Title", "Status",
            "BGC Status", "Applied At", "Last Updated"
    };
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public byte[] exportApplications(List<ApplicationResponse> applications) {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Applications");
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            Row headerRow = sheet.createRow(0);
            for (int c = 0; c < HEADERS.length; c++) {
                Cell cell = headerRow.createCell(c);
                cell.setCellValue(HEADERS[c]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(c, 22 * 256);
            }

            int rowNum = 1;
            for (ApplicationResponse app : applications) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(app.getId());
                row.createCell(1).setCellValue(app.getUserName());
                row.createCell(2).setCellValue(app.getUserEmail());
                row.createCell(3).setCellValue(app.getJobTitle());
                row.createCell(4).setCellValue(app.getStatus());
                row.createCell(5).setCellValue(app.getBgvStatus() != null ? app.getBgvStatus() : "");
                row.createCell(6).setCellValue(app.getAppliedAt() != null ? app.getAppliedAt().format(FMT) : "");
                row.createCell(7).setCellValue(app.getUpdatedAt() != null ? app.getUpdatedAt().format(FMT) : "");
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to export applications", e);
        }
    }
}
