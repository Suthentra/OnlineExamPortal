import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';

@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css'],
  standalone: false
})
export class ResultsComponent implements OnInit {
  user: any;
  results: any[] = [];
  loading = true;
  errorMessage = '';

  // Modal properties
  showDetailModal: boolean = false;
  selectedResult: any = null;
  selectedAnswers: any[] = [];

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.user = this.auth.getUser();
    this.loadResults();
  }

  loadResults() {
    this.loading = true;
    this.api.getStudentResults(this.user.userId).subscribe({
      next: (data: any) => {
        console.log('Results received:', data);
        this.results = data;
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading results:', err);
        this.errorMessage = 'Failed to load results. Please try again.';
        this.loading = false;
      }
    });
  }

  viewResultDetail(attemptId: number) {
    this.api.getResultByAttempt(attemptId).subscribe({
      next: (data: any) => {
        this.selectedResult = data;
        this.selectedAnswers = data.answers || [];
        this.showDetailModal = true;
        
        // Push a dummy state to catch back button
        history.pushState({ modalOpen: true }, '', location.href);
      },
      error: (err: any) => {
        console.error('Error loading result details:', err);
        alert('Failed to load result details');
      }
    });
  }

  closeModal() {
    this.showDetailModal = false;
    this.selectedResult = null;
    this.selectedAnswers = [];
    
    // Replace the dummy state
    history.replaceState(null, '', location.href);
  }

  getCorrectCount(): number {
    return this.selectedAnswers.filter(a => a.isCorrect).length;
  }

  getWrongCount(): number {
    return this.selectedAnswers.filter(a => !a.isCorrect).length;
  }

  logout() {
    this.auth.logout();
  }

  // Listen for browser back button
  @HostListener('window:popstate', ['$event'])
  onPopState(event: any) {
    if (this.showDetailModal) {
      // If modal is open, just close it and don't navigate
      this.closeModal();
      // Push a new state to prevent navigation
      history.pushState(null, '', location.href);
      event.preventDefault();
    }
  }
}