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
  statusFilter: string = 'all';
  sortField: string = 'submittedAt';
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
        this.examTitle = this.results[0]?.examTitle || 'Exam Results';
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading results:', err);
        this.loading = false;
      }
    });
  }

  get filteredResults() {
    let filtered = [...this.results];
    
    // Apply search filter
    if (this.searchTerm) {
      filtered = filtered.filter(r => 
        r.studentName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        r.studentEmail.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (this.statusFilter === 'passed') {
      filtered = filtered.filter(r => r.isPassed);
    } else if (this.statusFilter === 'failed') {
      filtered = filtered.filter(r => !r.isPassed);
    }
    
    // Apply sorting
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

  sortBy(field: string) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
  }

  getPassCount(): number {
    return this.results.filter(r => r.isPassed).length;
  }

  getFailCount(): number {
    return this.results.filter(r => !r.isPassed).length;
  }

  getAverageScore(): number {
    if (this.results.length === 0) return 0;
    const total = this.results.reduce((sum, r) => sum + r.percentage, 0);
    return Math.round(total / this.results.length);
  }

  getDuration(startedAt: string, submittedAt: string): string {
    const start = new Date(startedAt);
    const end = new Date(submittedAt);
    const diffMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutes`;
  }

  viewStudentDetails(attemptId: number) {
    this.router.navigate(['/admin/student-result', attemptId]);
  }

  exportToCSV() {
    const headers = ['Student Name', 'Email', 'Score', 'Total Marks', 'Percentage', 'Status', 'Started At', 'Submitted At', 'Duration'];
    const rows = this.filteredResults.map(r => [
      r.studentName,
      r.studentEmail,
      r.score,
      r.totalMarks,
      r.percentage + '%',
      r.isPassed ? 'Passed' : 'Failed',
      new Date(r.startedAt).toLocaleString(),
      new Date(r.submittedAt).toLocaleString(),
      this.getDuration(r.startedAt, r.submittedAt)
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

  goBack() {
    this.router.navigate(['/admin']);
  }

  logout() {
    this.auth.logout();
  }
}