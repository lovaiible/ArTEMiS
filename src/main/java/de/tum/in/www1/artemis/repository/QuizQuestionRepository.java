package de.tum.in.www1.artemis.repository;

import de.tum.in.www1.artemis.domain.QuizQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


/**
 * Spring Data JPA repository for the QuizQuestion entity.
 */
@SuppressWarnings("unused")
@Repository
public interface QuizQuestionRepository extends JpaRepository<QuizQuestion,Long> {

}
