import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'app-exam-results',
  templateUrl: './exam-results.component.html',
  styleUrls: ['./exam-results.component.css'],
  standalone: false
})
export class ExamResultsComponent implements OnInit {
  examId: number;
  examTitle: string = '';
  results: any[] = [];
  loading: boolean = true;
  searchTerm: string = '';
  sortBy: string = 'score';
  sortDirection: string = 'desc';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private auth: AuthService
  ) {
    this.examId = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit() {
    this.loadExamResults();
  }

  loadExamResults() {
    this.api.getExamResults(this.examId).subscribe({
      next: (data: any) => {
        this.results = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading results:', err);
        this.loading = false;
      }
    });
  }

  get filteredResults() {
    let filtered = this.results;
    
    // Apply search filter
    if (this.searchTerm) {
      filtered = filtered.filter(r => 
        r.studentName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        r.studentEmail.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    
    // Apply sorting
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

  getAverageScore(): number {
    if (this.results.length === 0) return 0;
    const total = this.results.reduce((sum, r) => sum + r.score, 0);
    return Math.round(total / this.results.length);
  }

  getAveragePercentage(): number {
    if (this.results.length === 0) return 0;
    const total = this.results.reduce((sum, r) => sum + r.percentage, 0);
    return Math.round(total / this.results.length);
  }

  getPassCount(): number {
    return this.results.filter(r => r.isPassed).length;
  }

  getFailCount(): number {
    return this.results.filter(r => !r.isPassed).length;
  }

  getPassPercentage(): number {
    if (this.results.length === 0) return 0;
    return Math.round((this.getPassCount() / this.results.length) * 100);
  }

  exportToCSV() {
    const headers = ['Student Name', 'Email', 'Score', 'Total Marks', 'Percentage', 'Status', 'Submitted Date'];
    const rows = this.filteredResults.map(r => [
      r.studentName,
      r.studentEmail,
      r.score,
      r.totalMarks,
      r.percentage + '%',
      r.isPassed ? 'Passed' : 'Failed',
      new Date(r.submittedAt).toLocaleString()
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam_${this.examId}_results.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  viewStudentResult(attemptId: number) {
    this.router.navigate(['/admin/student-result', attemptId]);
  }

  goBack() {
    this.router.navigate(['/admin']);
  }

  logout() {
    this.auth.logout();
  }
}