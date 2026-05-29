import { Component, OnInit } from '@angular/core';
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
    this.router.navigate(['/result-detail', attemptId]);
  }

  logout() {
    this.auth.logout();
  }
}