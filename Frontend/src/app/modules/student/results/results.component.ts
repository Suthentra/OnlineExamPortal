import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css'],
  standalone: false
})
export class ResultsComponent implements OnInit {
  results: any[] = [];
  loading: boolean = true;
  errorMessage: string = '';
  searchTerm: string = '';
  statusFilter: string = 'all';
  sortField: string = 'submittedAt';
  sortDirection: string = 'desc';
  studentId: number;
  
  showDetailModal: boolean = false;
  selectedResult: any = null;
  selectedAnswers: any[] = [];

  constructor(
    private router: Router,
    private api: ApiService,
    private auth: AuthService,
    private toast: ToastService
  ) {
    this.studentId = this.auth.getUser()?.userId;
  }

  ngOnInit() {
    this.loadResults();
  }

  loadResults() {
    this.toast.showLoading('Loading your results...');
    this.errorMessage = '';
    
    this.api.getStudentResults(this.studentId).subscribe({
      next: (data: any) => {
        this.toast.closeLoading();
        this.results = data || [];
        this.loading = false;
        
        if (this.results.length === 0) {
          this.toast.info('No results found');
        } else {
          this.toast.success(`Loaded ${this.results.length} exam results`);
        }
      },
      error: (err) => {
        this.toast.closeLoading();
        console.error('Error loading results:', err);
        this.errorMessage = 'Failed to load results. Please try again later.';
        this.toast.error('Failed to load results');
        this.results = [];
        this.loading = false;
      }
    });
  }

  get filteredResults() {
    let filtered = [...this.results];
    
    if (this.searchTerm) {
      filtered = filtered.filter(r => 
        r.examTitle?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    
    if (this.statusFilter === 'passed') {
      filtered = filtered.filter(r => r.isPassed);
    } else if (this.statusFilter === 'failed') {
      filtered = filtered.filter(r => !r.isPassed);
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

  getPassCount(): number {
    return this.results.filter(r => r.isPassed).length;
  }

  getFailCount(): number {
    return this.results.filter(r => !r.isPassed).length;
  }

  getAverageScore(): number {
    if (this.results.length === 0) return 0;
    const total = this.results.reduce((sum, r) => sum + (r.percentage || 0), 0);
    return Math.round(total / this.results.length);
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  sortBy(field: string) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
  }

  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.sortField = 'submittedAt';
    this.sortDirection = 'desc';
    this.toast.info('All filters cleared');
  }

  viewResultDetail(attemptId: number) {
    this.toast.showLoading('Loading result details...');
    
    this.api.getResultByAttempt(attemptId).subscribe({
      next: (data: any) => {
        this.toast.closeLoading();
        this.selectedResult = {
          examTitle: data.examTitle,
          score: data.score,
          totalMarks: data.totalMarks,
          percentage: data.percentage,
          isPassed: data.isPassed,
          submittedAt: data.submittedAt
        };
        this.selectedAnswers = data.answers || [];
        this.showDetailModal = true;
        this.toast.success('Result details loaded');
      },
      error: (err) => {
        this.toast.closeLoading();
        console.error('Error loading result details:', err);
        this.toast.error('Failed to load result details');
      }
    });
  }

  closeModal() {
    this.showDetailModal = false;
    this.selectedResult = null;
    this.selectedAnswers = [];
  }

  exportToCSV() {
    if (this.filteredResults.length === 0) {
      this.toast.warning('No data to export');
      return;
    }

    this.toast.showLoading('Preparing export...');
    
    try {
      const headers = ['Exam Name', 'Score', 'Percentage', 'Status', 'Submitted Date'];
      const rows = this.filteredResults.map(r => [
        r.examTitle,
        `${r.score}/${r.totalMarks}`,
        `${r.percentage}%`,
        r.isPassed ? 'Passed' : 'Failed',
        new Date(r.submittedAt).toLocaleString()
      ]);
      
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my_results_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      this.toast.closeLoading();
      this.toast.success(`Exported ${this.filteredResults.length} results`);
    } catch (error) {
      this.toast.closeLoading();
      console.error('Export error:', error);
      this.toast.error('Failed to export results');
    }
  }

  printResults() {
    if (this.filteredResults.length === 0) {
      this.toast.warning('No data to print');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>My Exam Results</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .passed { color: green; font-weight: bold; }
              .failed { color: red; font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>My Exam Results</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <table>
              <thead>
                <tr><th>Exam Name</th><th>Score</th><th>Percentage</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                ${this.filteredResults.map(r => `
                  <tr>
                    <td>${r.examTitle}</td>
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

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  logout() {
    this.auth.logout();
  }
}