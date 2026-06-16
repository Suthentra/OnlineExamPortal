import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

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
    private auth: AuthService,
    private toast: ToastService
  ) {
    this.examId = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit() {
    this.loadExamResults();
  }

  loadExamResults() {
    this.toast.showLoading('Loading results...');
    
    this.api.getExamResults(this.examId).subscribe({
      next: (data: any) => {
        this.toast.closeLoading();
        this.results = data;
        this.examTitle = this.results[0]?.examTitle || 'Exam Results';
        this.loading = false;
        // In the loadExamResults method
this.results = data.map((result: any) => ({
  ...result,
  percentage: Number(result.percentage).toFixed(2)
}));
        if (this.results.length === 0) {
          this.toast.info('No results found for this exam');
        } else {
          this.toast.success(`Loaded ${this.results.length} student results`);
        }
      },
      error: (err) => {
        this.toast.closeLoading();
        console.error('Error loading results:', err);
        this.toast.error('Failed to load results');
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
    this.toast.info(`Sorting by ${field} (${this.sortDirection === 'asc' ? 'ascending' : 'descending'})`);
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
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

  getPassRate(): number {
    if (this.results.length === 0) return 0;
    return Math.round((this.getPassCount() / this.results.length) * 100);
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

  async viewStudentDetails(attemptId: number, studentName: string) {
    this.toast.info(`Loading details for ${studentName}...`);
    this.router.navigate(['/admin/student-result', attemptId]);
  }

  async exportToCSV() {
    if (this.filteredResults.length === 0) {
      this.toast.warning('No data to export');
      return;
    }

    this.toast.showLoading('Preparing CSV export...');
    
    try {
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
      a.download = `exam_${this.examId}_results_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      this.toast.closeLoading();
      this.toast.success(`Exported ${this.filteredResults.length} results successfully`);
    } catch (error) {
      this.toast.closeLoading();
      console.error('Export error:', error);
      this.toast.error('Failed to export results');
    }
  }

  async printResults() {
    if (this.filteredResults.length === 0) {
      this.toast.warning('No data to print');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Exam Results - ${this.examTitle}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .passed { color: green; font-weight: bold; }
              .failed { color: red; font-weight: bold; }
              @media print {
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <h1>Exam Results: ${this.examTitle}</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Status</th>
                  <th>Submitted Date</th>
                </tr>
              </thead>
              <tbody>
                ${this.filteredResults.map(r => `
                  <tr>
                    <td>${r.studentName}</td>
                    <td>${r.studentEmail}</td>
                    <td>${r.score}/${r.totalMarks}</td>
                    <td>${r.percentage}%</td>
                    <td class="${r.isPassed ? 'passed' : 'failed'}">${r.isPassed ? 'Passed' : 'Failed'}</td>
                    <td>${new Date(r.submittedAt).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      this.toast.info('Print window opened');
    } else {
      this.toast.error('Unable to open print window');
    }
  }

  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.sortField = 'submittedAt';
    this.sortDirection = 'desc';
    this.toast.info('All filters cleared');
  }

  goBack() {
    this.router.navigate(['/admin'], { fragment: 'results' });
  }

  logout() {
    this.auth.logout();
  }
}