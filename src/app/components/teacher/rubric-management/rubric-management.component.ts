import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { APIService } from 'src/app/services/API/api.service';
// import { RubricCreationComponent } from '../teacher-modals/rubric-creation/rubric-creation.component';

interface GradingRubric {
  id: number;
  name: string;
  description?: string;
  rubric_type: string;
  total_points: number;
  created_by: string;
  is_template: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  criteria_count?: number;
}

@Component({
  selector: 'app-rubric-management',
  templateUrl: './rubric-management.component.html',
  styleUrls: ['./rubric-management.component.css']
})
export class RubricManagementComponent implements OnInit {
  rubrics: GradingRubric[] = [];
  filteredRubrics: GradingRubric[] = [];
  searchTerm: string = '';
  filterType: string = 'all'; // 'all', 'assessment', 'assignment', 'both'
  loading: boolean = false;

  constructor(
    private API: APIService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.loadRubrics();
  }

  loadRubrics(): void {
    this.loading = true;
    // TODO: Implement API call when backend is ready
    // Simulated data for now
    setTimeout(() => {
      this.rubrics = [
        {
          id: 1,
          name: 'Essay Grading Rubric',
          description: 'Comprehensive rubric for essay assignments',
          rubric_type: 'assignment',
          total_points: 100,
          created_by: 'teacher1',
          is_template: true,
          is_active: true,
          created_at: '2024-01-15',
          updated_at: '2024-01-15',
          criteria_count: 4
        },
        {
          id: 2,
          name: 'Project Assessment Rubric',
          description: 'For project-based evaluations',
          rubric_type: 'both',
          total_points: 150,
          created_by: 'teacher1',
          is_template: false,
          is_active: true,
          created_at: '2024-01-20',
          updated_at: '2024-01-20',
          criteria_count: 6
        }
      ];
      this.filteredRubrics = [...this.rubrics];
      this.loading = false;
    }, 1000);
  }

  filterRubrics(): void {
    this.filteredRubrics = this.rubrics.filter(rubric => {
      const matchesSearch = rubric.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           (rubric.description && rubric.description.toLowerCase().includes(this.searchTerm.toLowerCase()));
      
      const matchesType = this.filterType === 'all' || rubric.rubric_type === this.filterType;
      
      return matchesSearch && matchesType;
    });
  }

  openCreateRubricModal(): void {
    // TODO: Implement when RubricCreationComponent is created
    this.API.justSnackbar('Rubric creation modal will be available soon', 3000);
    /*
    const modalRef = this.modalService.open(RubricCreationComponent, { size: 'xl' });
    modalRef.result.then((result) => {
      if (result === 'created') {
        this.loadRubrics();
      }
    }).catch(() => {
      // Modal dismissed
    });
    */
  }

  editRubric(rubric: GradingRubric): void {
    // TODO: Implement when RubricCreationComponent is created
    this.API.justSnackbar('Rubric editing will be available soon', 3000);
    /*
    const modalRef = this.modalService.open(RubricCreationComponent, { size: 'xl' });
    modalRef.componentInstance.rubric = rubric;
    modalRef.componentInstance.isEditMode = true;
    
    modalRef.result.then((result) => {
      if (result === 'updated') {
        this.loadRubrics();
      }
    }).catch(() => {
      // Modal dismissed
    });
    */
  }

  duplicateRubric(rubric: GradingRubric): void {
    // TODO: Implement when RubricCreationComponent is created
    this.API.justSnackbar('Rubric duplication will be available soon', 3000);
    /*
    const duplicatedRubric = { ...rubric };
    duplicatedRubric.name = `Copy of ${rubric.name}`;
    duplicatedRubric.is_template = false;
    
    const modalRef = this.modalService.open(RubricCreationComponent, { size: 'xl' });
    modalRef.componentInstance.rubric = duplicatedRubric;
    modalRef.componentInstance.isDuplicateMode = true;
    
    modalRef.result.then((result) => {
      if (result === 'created') {
        this.loadRubrics();
      }
    }).catch(() => {
      // Modal dismissed
    });
    */
  }

  deleteRubric(rubric: GradingRubric): void {
    if (confirm(`Are you sure you want to delete "${rubric.name}"? This action cannot be undone.`)) {
      // TODO: Implement API call
      this.rubrics = this.rubrics.filter(r => r.id !== rubric.id);
      this.filterRubrics();
      this.API.successSnackbar('Rubric deleted successfully');
    }
  }

  toggleRubricStatus(rubric: GradingRubric): void {
    rubric.is_active = !rubric.is_active;
    // TODO: Implement API call to update status
    this.API.successSnackbar(`Rubric ${rubric.is_active ? 'activated' : 'deactivated'} successfully`);
  }

  getRubricTypeColor(type: string): string {
    switch (type) {
      case 'assessment': return 'bg-blue-100 text-blue-800';
      case 'assignment': return 'bg-green-100 text-green-800';
      case 'both': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}
