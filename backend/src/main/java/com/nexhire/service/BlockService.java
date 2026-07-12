package com.nexhire.service;

import com.nexhire.dto.BlockRequest;
import com.nexhire.dto.BlockResponse;
import com.nexhire.entity.Block;
import com.nexhire.entity.City;
import com.nexhire.entity.JoiningBatch;
import com.nexhire.enums.BlockStatus;
import com.nexhire.exception.BusinessRuleException;
import com.nexhire.exception.ResourceNotFoundException;
import com.nexhire.repository.BlockRepository;
import com.nexhire.repository.CityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Admin-managed Block (physical training room) CRUD, plus the core P-Claude.md block-booking
 * rule: "A Block should only run ONE ACTIVE TRAINING BATCH at a time" — enforced here via
 * bookBlock/releaseBlock rather than a simple remaining-capacity check, since the room itself
 * (not just its seats) is what's exclusive.
 */
@Service
@RequiredArgsConstructor
public class BlockService {

    private final BlockRepository blockRepository;
    private final CityRepository cityRepository;

    public List<BlockResponse> getAll(Long cityId, Boolean availableOnly) {
        List<Block> blocks = cityId != null ? blockRepository.findByCityId(cityId) : blockRepository.findAll();
        return blocks.stream()
                .filter(b -> availableOnly == null || !availableOnly || b.isAvailable())
                .map(this::toResponse)
                .toList();
    }

    public BlockResponse getById(Long id) {
        return toResponse(findBlock(id));
    }

    @Transactional
    public BlockResponse create(BlockRequest request) {
        City city = cityRepository.findById(request.getCityId())
                .orElseThrow(() -> new ResourceNotFoundException("City not found with id: " + request.getCityId()));

        Block block = Block.builder()
                .name(request.getName())
                .capacity(request.getCapacity())
                .city(city)
                .status(parseStatus(request.getStatus(), BlockStatus.ACTIVE))
                .build();

        return toResponse(blockRepository.save(block));
    }

    @Transactional
    public BlockResponse update(Long id, BlockRequest request) {
        Block block = findBlock(id);

        if (request.getName() != null) block.setName(request.getName());
        if (request.getCapacity() != null) block.setCapacity(request.getCapacity());
        if (request.getCityId() != null) {
            City city = cityRepository.findById(request.getCityId())
                    .orElseThrow(() -> new ResourceNotFoundException("City not found with id: " + request.getCityId()));
            block.setCity(city);
        }
        if (request.getStatus() != null) {
            block.setStatus(parseStatus(request.getStatus(), block.getStatus()));
        }

        return toResponse(blockRepository.save(block));
    }

    @Transactional
    public void delete(Long id) {
        Block block = findBlock(id);
        if (block.getCurrentActiveBatch() != null) {
            throw new BusinessRuleException("Cannot delete a block that currently has an active training batch");
        }
        blockRepository.delete(block);
    }

    /** Books this block for the given batch. Idempotent if the block is already booked by the
     *  same batch. Throws if the block is booked by a different batch, inactive, or too small.
     *  Returns the booked Block so the caller can set JoiningBatch.trainingBlock without a
     *  second lookup. */
    @Transactional
    public Block bookBlock(Long blockId, JoiningBatch batch, int headcount) {
        Block block = findBlock(blockId);

        if (block.getCurrentActiveBatch() != null && !block.getCurrentActiveBatch().getId().equals(batch.getId())) {
            throw new BusinessRuleException(
                    "Block '" + block.getName() + "' is already booked by another active training batch");
        }
        if (block.getStatus() != BlockStatus.ACTIVE) {
            throw new BusinessRuleException("Block '" + block.getName() + "' is not active");
        }
        if (block.getCapacity() < headcount) {
            throw new BusinessRuleException(
                    "Block '" + block.getName() + "' capacity (" + block.getCapacity() + ") is less than the batch headcount (" + headcount + ")");
        }

        block.setCurrentActiveBatch(batch);
        return blockRepository.save(block);
    }

    /** Frees the block once its batch completes or is cancelled. No-op if already free. */
    @Transactional
    public void releaseBlock(Long blockId) {
        Block block = findBlock(blockId);
        block.setCurrentActiveBatch(null);
        blockRepository.save(block);
    }

    private Block findBlock(Long id) {
        return blockRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Block not found with id: " + id));
    }

    private BlockStatus parseStatus(String raw, BlockStatus fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        try {
            return BlockStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessRuleException("Invalid block status: " + raw);
        }
    }

    private BlockResponse toResponse(Block block) {
        JoiningBatch active = block.getCurrentActiveBatch();
        return BlockResponse.builder()
                .id(block.getId())
                .name(block.getName())
                .capacity(block.getCapacity())
                .cityId(block.getCity().getId())
                .cityName(block.getCity().getName())
                .status(block.getStatus().name())
                .currentActiveBatchId(active != null ? active.getId() : null)
                .currentActiveBatchCode(active != null ? active.getBatchCode() : null)
                .available(block.isAvailable())
                .build();
    }
}
