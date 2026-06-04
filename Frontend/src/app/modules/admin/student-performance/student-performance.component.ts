import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../shared/services/auth.service';

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
  sortBy: string = 'percentage';
  sortDirection: string = 'desc';

  // Statistics
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
    private auth: AuthService
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
      }
    });
  }

  loadStudentPerformance() {
    this.api.getExamResults(this.examId).subscribe({
      next: (data: any) => {
        this.students = data;
        this.calculateStatistics();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading student performance:', err);
        this.loading = false;
      }
    });
  }

  calculateStatistics() {
    this.totalStudents = this.students.length;
    
    if (this.totalStudents === 0) return;

    const total = this.students.reduce((sum, s) => sum + s.percentage, 0);
    this.averageScore = Math.round(total / this.totalStudents);

    this.passedCount = this.students.filter(s => s.isPassed).length;
    this.failedCount = this.totalStudents - this.passedCount;
    this.passRate = this.totalStudents > 0 ? Math.round((this.passedCount / this.totalStudents) * 100) : 0;

    this.highestScore = Math.max(...this.students.map(s => s.percentage));
  }

  get filteredStudents() {
    let filtered = [...this.students];

    if (this.searchTerm) {
      filtered = filtered.filter(s => 
        s.studentName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        s.studentEmail.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      let aVal = a[this.sortBy];
      let bVal = b[this.sortBy];
      
      if (this.sortBy === 'percentage' || this.sortBy === 'score') {
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
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDirection = 'desc';
    }
  }

  getSortIcon(column: string): string {
    if (this.sortBy !== column) return '↕️';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  viewStudentDetails(studentId: number, attemptId: number) {
    this.router.navigate(['/admin/student-detail', studentId, attemptId]);
  }

  exportToCSV() {
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
    a.download = `exam_${this.examId}_performance.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  goBack() {
    this.router.navigate(['/admin']);
  }

  logout() {
    this.auth.logout();
  }
}