import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-custom-table',
  templateUrl: './custom-table.component.html',
  styleUrls: ['./custom-table.component.css']
})
export class CustomTableComponent {
  @Input() data: any[] = [];
  @Input() columns: { field: string, header: string }[] = [];
  @Input() paginator: boolean = true;
  @Input() rows: number = 10;
  @Output() rowClick = new EventEmitter<any>();
  @Output() actionClick = new EventEmitter<{action: string, row: any}>();

  currentPage: number = 0;
  Math = Math;

  get paginatedData(): any[] {
    if (!this.paginator) return this.data;
    const start = this.currentPage * this.rows;
    return this.data.slice(start, start + this.rows);
  }

  get totalPages(): number {
    return Math.ceil(this.data.length / this.rows);
  }

  onRowClick(row: any): void {
    this.rowClick.emit(row);
  }

  onActionClick(action: string, row: any): void {
    this.actionClick.emit({action, row});
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
  }
}
