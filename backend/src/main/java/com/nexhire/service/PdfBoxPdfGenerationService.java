package com.nexhire.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

/**
 * Simple, dependency-light PDF renderer for structured letters (offer letters, joining
 * letters). Not a general HTML-to-PDF pipeline — deliberately keeps letter content as
 * plain headings + wrapped text lines so it stays predictable for enterprise documents.
 */
@Service
public class PdfBoxPdfGenerationService implements PdfGenerationService {

    private static final float MARGIN = 60f;
    private static final float PAGE_WIDTH = PDRectangle.A4.getWidth();
    private static final float PAGE_HEIGHT = PDRectangle.A4.getHeight();
    private static final float USABLE_WIDTH = PAGE_WIDTH - 2 * MARGIN;

    @Override
    public byte[] generate(PdfDocument document) {
        try (PDDocument pdf = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            pdf.addPage(page);
            PDPageContentStream stream = new PDPageContentStream(pdf, page);

            var titleFont = PDType1Font.HELVETICA_BOLD;
            var headingFont = PDType1Font.HELVETICA_BOLD;
            var bodyFont = PDType1Font.HELVETICA;

            float y = PAGE_HEIGHT - MARGIN;
            y = writeWrapped(pdf, stream, page, document.title(), titleFont, 18, y);
            y -= 10;
            stream.close();

            // Re-open a fresh managed stream (PDPageContentStream can't be reused after close()).
            PdfCursor cursor = new PdfCursor(pdf, page, y);
            for (PdfSection section : document.sections()) {
                if (section.heading() != null && !section.heading().isBlank()) {
                    cursor.write(section.heading(), headingFont, 13, 8);
                }
                for (String line : section.lines()) {
                    cursor.write(line, bodyFont, 11, 4);
                }
                cursor.gap(10);
            }
            cursor.finish();

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            pdf.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to generate PDF", e);
        }
    }

    private float writeWrapped(PDDocument pdf, PDPageContentStream stream, PDPage page,
                                String text, PDType1Font font, int fontSize, float y) throws IOException {
        stream.beginText();
        stream.setFont(font, fontSize);
        stream.newLineAtOffset(MARGIN, y);
        stream.showText(text);
        stream.endText();
        return y - fontSize - 6;
    }

    /** Tracks current Y offset across multiple lines/sections, opening new pages as needed. */
    private static class PdfCursor {
        private final PDDocument pdf;
        private PDPage page;
        private float y;
        private PDPageContentStream stream;

        PdfCursor(PDDocument pdf, PDPage page, float startY) throws IOException {
            this.pdf = pdf;
            this.page = page;
            this.y = startY;
            this.stream = new PDPageContentStream(pdf, page, PDPageContentStream.AppendMode.APPEND, true);
        }

        void write(String text, PDType1Font font, int fontSize, float spacingAfter) throws IOException {
            for (String line : wrap(text, font, fontSize, USABLE_WIDTH)) {
                ensureSpace(fontSize + 4);
                stream.beginText();
                stream.setFont(font, fontSize);
                stream.newLineAtOffset(MARGIN, y);
                stream.showText(line);
                stream.endText();
                y -= (fontSize + 4);
            }
            y -= spacingAfter;
        }

        void gap(float amount) {
            y -= amount;
        }

        private void ensureSpace(float needed) throws IOException {
            if (y - needed < MARGIN) {
                stream.close();
                page = new PDPage(PDRectangle.A4);
                pdf.addPage(page);
                y = PAGE_HEIGHT - MARGIN;
                stream = new PDPageContentStream(pdf, page, PDPageContentStream.AppendMode.APPEND, true);
            }
        }

        void finish() throws IOException {
            stream.close();
        }

        private List<String> wrap(String text, PDType1Font font, int fontSize, float maxWidth) throws IOException {
            List<String> lines = new java.util.ArrayList<>();
            for (String paragraph : text.split("\n", -1)) {
                StringBuilder current = new StringBuilder();
                for (String word : paragraph.split(" ")) {
                    String candidate = current.isEmpty() ? word : current + " " + word;
                    float width = font.getStringWidth(candidate) / 1000 * fontSize;
                    if (width > maxWidth && !current.isEmpty()) {
                        lines.add(current.toString());
                        current = new StringBuilder(word);
                    } else {
                        current = new StringBuilder(candidate);
                    }
                }
                lines.add(current.toString());
            }
            return lines;
        }
    }
}
