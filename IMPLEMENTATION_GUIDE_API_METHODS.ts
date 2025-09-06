// Add these methods to your APIService class in api.service.ts

// ===========================================
// GRADING RUBRICS API METHODS
// ===========================================

/**
 * Get all rubrics created by the current teacher
 */
getTeacherRubrics() {
  const postObject = {
    tables: 'grading_rubrics',
    conditions: {
      WHERE: {
        created_by: this.getTeacherID()
      },
      ORDER_BY: {
        created_at: 'DESC'
      }
    }
  };
  return this.post('get_entries', {
    data: JSON.stringify(postObject),
  });
}

/**
 * Get template rubrics that can be shared/reused
 */
getTemplateRubrics() {
  const postObject = {
    tables: 'grading_rubrics',
    conditions: {
      WHERE: {
        is_template: true,
        is_active: true
      },
      ORDER_BY: {
        name: 'ASC'
      }
    }
  };
  return this.post('get_entries', {
    data: JSON.stringify(postObject),
  });
}

/**
 * Create a new grading rubric
 */
createGradingRubric(rubricData: any) {
  const postObject = {
    tables: 'grading_rubrics',
    values: {
      ...rubricData,
      created_by: this.getTeacherID()
    }
  };
  return this.post('create_entry', {
    data: JSON.stringify(postObject),
  });
}

/**
 * Update an existing grading rubric
 */
updateGradingRubric(rubricId: number, rubricData: any) {
  const postObject = {
    tables: 'grading_rubrics',
    values: rubricData,
    conditions: {
      WHERE: {
        id: rubricId,
        created_by: this.getTeacherID() // Ensure teacher can only edit their own rubrics
      }
    }
  };
  return this.post('update_entry', {
    data: JSON.stringify(postObject),
  });
}

/**
 * Delete a grading rubric
 */
deleteGradingRubric(rubricId: number) {
  const postObject = {
    tables: 'grading_rubrics',
    conditions: {
      WHERE: {
        id: rubricId,
        created_by: this.getTeacherID()
      }
    }
  };
  return this.post('delete_entry', {
    data: JSON.stringify(postObject),
  });
}

/**
 * Get rubric with all criteria and performance levels
 */
getRubricDetails(rubricId: number) {
  // This would need a custom endpoint that joins the tables
  // For now, you could make separate calls:
  
  const rubricQuery = {
    tables: 'grading_rubrics',
    conditions: {
      WHERE: { id: rubricId }
    }
  };
  
  const criteriaQuery = {
    tables: 'grading_criteria',
    conditions: {
      WHERE: { rubric_id: rubricId },
      ORDER_BY: { order_index: 'ASC' }
    }
  };
  
  return this.post('get_entries', {
    data: JSON.stringify(rubricQuery),
  });
}

/**
 * Create grading criteria for a rubric
 */
createGradingCriteria(criteriaData: any) {
  const postObject = {
    tables: 'grading_criteria',
    values: criteriaData
  };
  return this.post('create_entry', {
    data: JSON.stringify(postObject),
  });
}

/**
 * Create performance levels for criteria
 */
createPerformanceLevel(levelData: any) {
  const postObject = {
    tables: 'grading_performance_levels',
    values: levelData
  };
  return this.post('create_entry', {
    data: JSON.stringify(postObject),
  });
}

/**
 * Grade an assignment using rubric
 */
createAssignmentGrade(gradeData: any) {
  const postObject = {
    tables: 'assignment_grades',
    values: {
      ...gradeData,
      graded_by: this.getTeacherID(),
      graded_at: new Date().toISOString()
    }
  };
  return this.post('create_entry', {
    data: JSON.stringify(postObject),
  });
}

/**
 * Create individual criteria grades
 */
createAssignmentCriteriaGrade(criteriaGradeData: any) {
  const postObject = {
    tables: 'assignment_criteria_grades',
    values: criteriaGradeData
  };
  return this.post('create_entry', {
    data: JSON.stringify(postObject),
  });
}

/**
 * Get assignment submissions with grading status
 */
getAssignmentSubmissionsWithGrades(assignmentId: number) {
  // This would need a custom endpoint that joins student_assignments with assignment_grades
  // For now, you could make separate calls or modify your existing teacherGetAllSubmissions
  const postObject = {
    tables: 'student_assignments',
    conditions: {
      WHERE: { assignmentid: assignmentId }
    }
  };
  return this.post('get_entries', {
    data: JSON.stringify(postObject),
  });
}
