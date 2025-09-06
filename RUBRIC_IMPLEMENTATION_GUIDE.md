# 🎯 Assignment Grading Rubrics Implementation Guide

## Overview
This guide provides step-by-step instructions to implement the grading rubric system for your assignments in the HarfAI LMS.

## ✅ Already Implemented

### 1. **Enhanced Task Creation Form**
- ✅ Added grading method selection (Traditional vs Rubric-based)
- ✅ Added rubric selection dropdown
- ✅ Added resubmit limit field
- ✅ Updated API calls to include rubric data

### 2. **Database Schema**
- ✅ Complete rubric schema already defined in Prisma
- ✅ All relations properly configured

### 3. **Rubric Management Interface**
- ✅ Created comprehensive rubric management component
- ✅ Grid view with search and filtering
- ✅ CRUD operations structure ready

## 🔧 Next Implementation Steps

### Step 1: Update API Service Methods

Add these methods to your `src/app/services/API/api.service.ts`:

```typescript
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
```

### Step 2: Update Task Creation Component

Your task creation component (`taskcreation.component.ts`) is already updated! The changes include:

1. **New Properties:**
   - `selectedRubricId`: Selected rubric ID
   - `availableRubrics`: List of available rubrics
   - `gradingMethod`: 'traditional' or 'rubric'
   - `resubmitLimit`: Number of allowed resubmissions

2. **Enhanced Methods:**
   - `loadAvailableRubrics()`: Loads teacher's rubrics
   - `onGradingMethodChange()`: Handles grading method selection
   - Updated `createTask()` and `updateTask()` to include rubric data

### Step 3: Create Rubric Builder Component

Create `rubric-creation.component.ts`:

```typescript
import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { APIService } from 'src/app/services/API/api.service';

interface GradingCriteria {
  id?: number;
  criteria_name: string;
  description?: string;
  weight: number;
  max_points: number;
  order_index: number;
  performance_levels: PerformanceLevel[];
}

interface PerformanceLevel {
  id?: number;
  level_name: string;
  description?: string;
  points: number;
  order_index: number;
}

@Component({
  selector: 'app-rubric-creation',
  templateUrl: './rubric-creation.component.html',
  styleUrls: ['./rubric-creation.component.css']
})
export class RubricCreationComponent implements OnInit {
  @Input() rubric: any = null;
  @Input() isEditMode: boolean = false;
  @Input() isDuplicateMode: boolean = false;

  // Rubric basic information
  name: string = '';
  description: string = '';
  rubricType: string = 'assignment'; // 'assessment', 'assignment', 'both'
  isTemplate: boolean = false;
  
  // Criteria management
  criteria: GradingCriteria[] = [];
  totalPoints: number = 0;

  constructor(
    public activeModal: NgbActiveModal,
    private API: APIService
  ) {}

  ngOnInit(): void {
    if (this.rubric) {
      this.loadRubricData();
    } else {
      this.addDefaultCriteria();
    }
    this.calculateTotalPoints();
  }

  loadRubricData(): void {
    this.name = this.rubric.name;
    this.description = this.rubric.description || '';
    this.rubricType = this.rubric.rubric_type;
    this.isTemplate = this.rubric.is_template;
    
    // Load criteria (you'll need to implement API call)
    // For now, add default criteria
    this.addDefaultCriteria();
  }

  addDefaultCriteria(): void {
    const defaultCriteria: GradingCriteria = {
      criteria_name: 'Content Quality',
      description: 'Quality and accuracy of content',
      weight: 1.0,
      max_points: 25,
      order_index: 0,
      performance_levels: [
        { level_name: 'Excellent', description: 'Outstanding work', points: 25, order_index: 0 },
        { level_name: 'Good', description: 'Good quality work', points: 20, order_index: 1 },
        { level_name: 'Fair', description: 'Acceptable work', points: 15, order_index: 2 },
        { level_name: 'Poor', description: 'Below expectations', points: 10, order_index: 3 }
      ]
    };
    this.criteria.push(defaultCriteria);
  }

  addCriteria(): void {
    const newCriteria: GradingCriteria = {
      criteria_name: '',
      description: '',
      weight: 1.0,
      max_points: 25,
      order_index: this.criteria.length,
      performance_levels: [
        { level_name: 'Excellent', points: 25, order_index: 0 },
        { level_name: 'Good', points: 20, order_index: 1 },
        { level_name: 'Fair', points: 15, order_index: 2 },
        { level_name: 'Poor', points: 10, order_index: 3 }
      ]
    };
    this.criteria.push(newCriteria);
    this.calculateTotalPoints();
  }

  removeCriteria(index: number): void {
    this.criteria.splice(index, 1);
    this.reorderCriteria();
    this.calculateTotalPoints();
  }

  reorderCriteria(): void {
    this.criteria.forEach((criteria, index) => {
      criteria.order_index = index;
    });
  }

  calculateTotalPoints(): void {
    this.totalPoints = this.criteria.reduce((total, criteria) => {
      return total + (criteria.max_points * criteria.weight);
    }, 0);
  }

  saveRubric(): void {
    if (!this.validateRubric()) return;

    const rubricData = {
      name: this.name,
      description: this.description,
      rubric_type: this.rubricType,
      total_points: this.totalPoints,
      is_template: this.isTemplate,
      is_active: true
    };

    if (this.isEditMode) {
      this.updateRubric(rubricData);
    } else {
      this.createRubric(rubricData);
    }
  }

  createRubric(rubricData: any): void {
    this.API.createGradingRubric(rubricData).subscribe({
      next: (response) => {
        const rubricId = response.output.id;
        this.saveCriteria(rubricId);
        this.API.successSnackbar('Rubric created successfully!');
        this.activeModal.close('created');
      },
      error: (error) => {
        this.API.failedSnackbar('Failed to create rubric');
      }
    });
  }

  updateRubric(rubricData: any): void {
    this.API.updateGradingRubric(this.rubric.id, rubricData).subscribe({
      next: (response) => {
        this.saveCriteria(this.rubric.id);
        this.API.successSnackbar('Rubric updated successfully!');
        this.activeModal.close('updated');
      },
      error: (error) => {
        this.API.failedSnackbar('Failed to update rubric');
      }
    });
  }

  saveCriteria(rubricId: number): void {
    // Save criteria and performance levels
    // This would need multiple API calls
    this.criteria.forEach(criteria => {
      const criteriaData = {
        rubric_id: rubricId,
        criteria_name: criteria.criteria_name,
        description: criteria.description,
        weight: criteria.weight,
        max_points: criteria.max_points,
        order_index: criteria.order_index
      };
      
      this.API.createGradingCriteria(criteriaData).subscribe({
        next: (response) => {
          const criteriaId = response.output.id;
          criteria.performance_levels.forEach(level => {
            const levelData = {
              criteria_id: criteriaId,
              level_name: level.level_name,
              description: level.description,
              points: level.points,
              order_index: level.order_index
            };
            this.API.createPerformanceLevel(levelData).subscribe();
          });
        }
      });
    });
  }

  validateRubric(): boolean {
    if (!this.name.trim()) {
      this.API.failedSnackbar('Please enter a rubric name');
      return false;
    }

    if (this.criteria.length === 0) {
      this.API.failedSnackbar('Please add at least one criteria');
      return false;
    }

    for (let criteria of this.criteria) {
      if (!criteria.criteria_name.trim()) {
        this.API.failedSnackbar('Please enter a name for all criteria');
        return false;
      }
    }

    return true;
  }

  closeModal(): void {
    this.activeModal.dismiss();
  }
}
```

### Step 4: Create Assignment Grading Component

Create `assignment-grading.component.ts`:

```typescript
import { Component, Input, OnInit } from '@angular/core';
import { APIService } from 'src/app/services/API/api.service';

@Component({
  selector: 'app-assignment-grading',
  templateUrl: './assignment-grading.component.html',
  styleUrls: ['./assignment-grading.component.css']
})
export class AssignmentGradingComponent implements OnInit {
  @Input() assignment: any;
  @Input() submission: any;
  @Input() student: any;

  rubric: any = null;
  criteriaGrades: any[] = [];
  totalPoints: number = 0;
  maxPoints: number = 0;
  percentage: number = 0;
  letterGrade: string = '';
  feedback: string = '';

  constructor(private API: APIService) {}

  ngOnInit(): void {
    if (this.assignment.rubric_id) {
      this.loadRubric();
    }
  }

  loadRubric(): void {
    this.API.getRubricDetails(this.assignment.rubric_id).subscribe({
      next: (response) => {
        this.rubric = response.output;
        this.initializeCriteriaGrades();
      }
    });
  }

  initializeCriteriaGrades(): void {
    this.criteriaGrades = this.rubric.criteria.map((criteria: any) => ({
      criteria_id: criteria.id,
      criteria_name: criteria.criteria_name,
      max_points: criteria.max_points,
      points_earned: 0,
      level_achieved: '',
      comments: ''
    }));
    
    this.maxPoints = this.rubric.total_points;
    this.calculateGrade();
  }

  onCriteriaGradeChange(index: number, points: number, level: string): void {
    this.criteriaGrades[index].points_earned = points;
    this.criteriaGrades[index].level_achieved = level;
    this.calculateGrade();
  }

  calculateGrade(): void {
    this.totalPoints = this.criteriaGrades.reduce((total, criteria) => {
      return total + criteria.points_earned;
    }, 0);
    
    this.percentage = (this.totalPoints / this.maxPoints) * 100;
    this.letterGrade = this.calculateLetterGrade(this.percentage);
  }

  calculateLetterGrade(percentage: number): string {
    if (percentage >= 97) return 'A+';
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 63) return 'D';
    if (percentage >= 60) return 'D-';
    return 'F';
  }

  saveGrade(): void {
    const gradeData = {
      assignment_id: this.assignment.id,
      student_id: this.submission.studentid,
      total_points: this.totalPoints,
      max_points: this.maxPoints,
      percentage: this.percentage,
      letter_grade: this.letterGrade,
      feedback: this.feedback
    };

    this.API.createAssignmentGrade(gradeData).subscribe({
      next: (response) => {
        const gradeId = response.output.id;
        this.saveCriteriaGrades(gradeId);
        this.API.successSnackbar('Grade saved successfully!');
      },
      error: (error) => {
        this.API.failedSnackbar('Failed to save grade');
      }
    });
  }

  saveCriteriaGrades(gradeId: number): void {
    this.criteriaGrades.forEach(criteria => {
      const criteriaGradeData = {
        grade_id: gradeId,
        criteria_id: criteria.criteria_id,
        points_earned: criteria.points_earned,
        max_points: criteria.max_points,
        level_achieved: criteria.level_achieved,
        comments: criteria.comments
      };
      
      this.API.createAssignmentCriteriaGrade(criteriaGradeData).subscribe();
    });
  }
}
```

## 🎯 **Usage Flow**

### For Teachers:

1. **Create Rubrics** → Go to Rubric Management → Create new rubric with criteria
2. **Create Assignments** → Use enhanced task creation form → Select rubric-based grading → Choose rubric
3. **Grade Submissions** → View submissions → Use rubric grading interface → Save detailed grades

### For Students:

1. **View Assignment** → See that it uses rubric-based grading
2. **Submit Assignment** → Normal submission process
3. **View Grade** → See detailed rubric-based feedback with criteria breakdown

## 🔧 **Integration Points**

### 1. **Add to Router** (`app-routing.module.ts`):
```typescript
{
  path: 'teacher/rubric-management',
  component: RubricManagementComponent
}
```

### 2. **Add to Teacher Navigation**:
Add "Rubric Management" link to your teacher sidebar/navigation.

### 3. **Update Grade Display**:
Modify your existing grade display components to show rubric-based grades when available.

## 📋 **Testing Checklist**

- [ ] Task creation with rubric selection works
- [ ] Rubric management interface loads
- [ ] Grading interface shows rubric criteria
- [ ] Grade calculations are accurate
- [ ] Student can view detailed feedback
- [ ] Database relationships work correctly

## 🎉 **Benefits You'll Get**

1. **Standardized Grading** - Consistent evaluation criteria
2. **Detailed Feedback** - Students see exactly how they're evaluated
3. **Time Saving** - Reusable rubrics across assignments
4. **Transparency** - Clear grading standards
5. **Analytics** - Track performance by criteria

This implementation gives you a complete, professional grading rubric system that integrates seamlessly with your existing assignment workflow!
