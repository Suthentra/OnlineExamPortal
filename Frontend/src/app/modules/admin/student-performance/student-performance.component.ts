import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-student-performance',
  templateUrl: './student-performance.component.html',
  styleUrls: ['./student-performance.component.css'],
  standalone: false
})
export class StudentPerformanceComponent implements OnInit {
  examId: number;
  examTitle: string = '';
  students: any[] = [];
  loading = true;
  searchTerm: string = '';
  statusFilter: string = 'all';
  sortField: string = 'percentage';
  sortDirection: string = 'desc';

  totalStudents: number = 0;
  averageScore: number = 0;
  passedCount: number = 0;
  failedCount: number = 0;
  highestScore: number = 0;
  passRate: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private auth: AuthService,
    private toast: ToastService
  ) {
    this.examId = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit() {
    this.loadExamDetails();
    this.loadStudentPerformance();
  }

  loadExamDetails() {
    this.api.getExamById(this.examId).subscribe({
      next: (data: any) => {
        this.examTitle = data.title;
      },
      error: (err) => {
        console.error('Error loading exam details:', err);
        this.toast.error('Failed to load exam details');
      }
    });
  }

  loadStudentPerformance() {
    this.toast.showLoading('Loading student performance...');
    
    this.api.getExamResults(this.examId).subscribe({
      next: (data: any) => {
        this.toast.closeLoading();
        this.students = (data || []).map((student: any) => ({
          ...student,
          percentage: Number(student.percentage).toFixed(2)
        }));
        this.calculateStatistics();
        this.loading = false;
        
        if (this.students.length === 0) {
          this.toast.info('No students have taken this exam yet');
        } else {
          this.toast.success(`Loaded ${this.students.length} student records`);
        }
      },
      error: (err) => {
        this.toast.closeLoading();
        console.error('Error loading student performance:', err);
        this.toast.error('Failed to load student performance');
        this.loading = false;
      }
    });
  }

  calculateStatistics() {
    this.totalStudents = this.students.length;
    
    if (this.totalStudents === 0) return;

    const total = this.students.reduce((sum, s) => sum + parseFloat(s.percentage), 0);
    this.averageScore = Math.round(total / this.totalStudents);

    this.passedCount = this.students.filter(s => s.isPassed).length;
    this.failedCount = this.totalStudents - this.passedCount;
    this.passRate = this.totalStudents > 0 ? Math.round((this.passedCount / this.totalStudents) * 100) : 0;

    this.highestScore = Math.max(...this.students.map(s => parseFloat(s.percentage)));
  }

  get filteredStudents() {
    let filtered = [...this.students];

    if (this.searchTerm) {
      filtered = filtered.filter(s => 
        s.studentName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        s.studentEmail?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    if (this.statusFilter === 'passed') {
      filtered = filtered.filter(s => s.isPassed);
    } else if (this.statusFilter === 'failed') {
      filtered = filtered.filter(s => !s.isPassed);
    }

    filtered.sort((a, b) => {
      let aVal = a[this.sortField];
      let bVal = b[this.sortField];
      
      if (this.sortField === 'percentage' || this.sortField === 'score') {
        aVal = Number(aVal);
        bVal = Number(bVal);
      }
      
      if (this.sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }

  changeSort(column: string) {
    if (this.sortField === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = column;
      this.sortDirection = 'desc';
    }
  }

  getSortIcon(column: string): string {
    if (this.sortField !== column) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  filterStudents() {
    // Trigger filter
    this.filteredStudents;
  }

  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.sortField = 'percentage';
    this.sortDirection = 'desc';
    this.toast.info('All filters cleared');
  }

  viewStudentDetails(studentId: number, attemptId: number) {
    this.toast.info('Loading student details...');
    this.router.navigate(['/admin/student-result', attemptId]);
  }

  exportToCSV() {
    if (this.filteredStudents.length === 0) {
      this.toast.warning('No data to export');
      return;
    }

    this.toast.showLoading('Preparing export...');
    
    try {
      const headers = ['Student Name', 'Email', 'Score', 'Percentage', 'Status', 'Submitted Date'];
      const rows = this.filteredStudents.map(s => [
        s.studentName,
        s.studentEmail,
        `${s.score}/${s.totalMarks}`,
        `${s.percentage}%`,
        s.isPassed ? 'Passed' : 'Failed',
        new Date(s.submittedAt).toLocaleString()
      ]);
      
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam_${this.examId}_performance_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      this.toast.closeLoading();
      this.toast.success(`Exported ${this.filteredStudents.length} records`);
    } catch (error) {
      this.toast.closeLoading();
      console.error('Export error:', error);
      this.toast.error('Failed to export data');
    }
  }

  goBack() {
    this.router.navigate(['/admin'], { fragment: 'results' });
  }

  logout() {
    this.auth.logout();
  }
}