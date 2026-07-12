package com.nexhire.entity;

import com.nexhire.enums.BlockStatus;
import jakarta.persistence.*;
import lombok.*;

/**
 * A physical training room within a City. P-Claude.md's core block-booking rule: a Block runs
 * ONE active training batch at a time — even if only partially full, the room itself is booked,
 * so no other batch can use it until the current one is released. currentActiveBatch is the
 * enforcement pointer for that rule (see BlockService.bookBlock/releaseBlock).
 */
@Entity
@Table(name = "blocks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Block {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Integer capacity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "city_id", nullable = false)
    private City city;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private BlockStatus status = BlockStatus.ACTIVE;

    /** Null when the room is free. Set the instant a batch is booked into this block
     *  (Training Assignment time), cleared when that batch completes/is cancelled. */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_active_batch_id")
    private JoiningBatch currentActiveBatch;

    @Transient
    public boolean isAvailable() {
        return status == BlockStatus.ACTIVE && currentActiveBatch == null;
    }
}
