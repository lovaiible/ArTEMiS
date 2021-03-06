package de.tum.in.www1.artemis.repository;

import de.tum.in.www1.artemis.domain.ShortAnswerSolution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


/**
 * Spring Data  repository for the ShortAnswerSolution entity.
 */
@SuppressWarnings("unused")
@Repository
public interface ShortAnswerSolutionRepository extends JpaRepository<ShortAnswerSolution, Long> {

}
