package com.nexhire.service;

import com.nexhire.entity.StoredFile;
import com.nexhire.entity.User;
import com.nexhire.enums.FileCategory;
import com.nexhire.exception.ResourceNotFoundException;
import com.nexhire.repository.StoredFileRepository;
import com.nexhire.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;

@Service
@RequiredArgsConstructor
public class DbFileStorageService implements FileStorageService {

    private final StoredFileRepository storedFileRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public Long store(MultipartFile file, FileCategory category, Long uploadedByUserId) {
        try {
            User uploadedBy = uploadedByUserId == null ? null :
                    userRepository.findById(uploadedByUserId)
                            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

            StoredFile storedFile = StoredFile.builder()
                    .fileName(file.getOriginalFilename())
                    .fileType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                    .fileSize(file.getSize())
                    .data(file.getBytes())
                    .category(category)
                    .uploadedBy(uploadedBy)
                    .build();

            return storedFileRepository.save(storedFile).getId();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read uploaded file", e);
        }
    }

    @Override
    @Transactional
    public Long storeGenerated(byte[] data, String fileName, String contentType, FileCategory category, Long uploadedByUserId) {
        User uploadedBy = uploadedByUserId == null ? null :
                userRepository.findById(uploadedByUserId)
                        .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        StoredFile storedFile = StoredFile.builder()
                .fileName(fileName)
                .fileType(contentType != null ? contentType : "application/octet-stream")
                .fileSize((long) data.length)
                .data(data)
                .category(category)
                .uploadedBy(uploadedBy)
                .build();

        return storedFileRepository.save(storedFile).getId();
    }

    @Override
    public StoredFileData retrieve(Long storedFileId) {
        StoredFile storedFile = storedFileRepository.findById(storedFileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found with id: " + storedFileId));
        return new StoredFileData(storedFile.getFileName(), storedFile.getFileType(), storedFile.getData());
    }

    @Override
    @Transactional
    public void delete(Long storedFileId) {
        storedFileRepository.deleteById(storedFileId);
    }
}
