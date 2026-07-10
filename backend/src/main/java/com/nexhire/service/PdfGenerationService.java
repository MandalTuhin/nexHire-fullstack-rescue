package com.nexhire.service;

import java.util.List;

/** Abstraction for generating letter-style PDFs (offer letters, joining letters). */
public interface PdfGenerationService {

    byte[] generate(PdfDocument document);

    record PdfDocument(String title, List<PdfSection> sections) {
    }

    record PdfSection(String heading, List<String> lines) {
    }
}
