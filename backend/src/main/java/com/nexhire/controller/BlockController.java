package com.nexhire.controller;

import com.nexhire.dto.BlockRequest;
import com.nexhire.dto.BlockResponse;
import com.nexhire.service.BlockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/blocks")
@RequiredArgsConstructor
public class BlockController {

    private final BlockService blockService;

    /** ADMIN manages blocks; HR reads them (Joining Batch wizard's Training Block dropdown). */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR')")
    public ResponseEntity<List<BlockResponse>> getAll(
            @RequestParam(required = false) Long cityId,
            @RequestParam(required = false) Boolean availableOnly) {
        return ResponseEntity.ok(blockService.getAll(cityId, availableOnly));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR')")
    public ResponseEntity<BlockResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(blockService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BlockResponse> create(@Valid @RequestBody BlockRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(blockService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BlockResponse> update(@PathVariable Long id, @RequestBody BlockRequest request) {
        return ResponseEntity.ok(blockService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        blockService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
