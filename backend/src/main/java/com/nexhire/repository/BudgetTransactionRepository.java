package com.nexhire.repository;

import com.nexhire.entity.BudgetTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BudgetTransactionRepository extends JpaRepository<BudgetTransaction, Long> {

    List<BudgetTransaction> findByCityIdOrderByCreatedAtDesc(Long cityId);
}
