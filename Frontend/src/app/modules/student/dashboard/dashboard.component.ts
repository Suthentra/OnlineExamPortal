import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: false
})
export class DashboardComponent implements OnInit {
  user: any;
  exams: any[] = [];
  attemptedExams: Set<number> = new Set();
  loading = true;
  errorMessage = '';

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.user = this.auth.getUser();
    this.loadExams();
  }

  loadExams() {
    this.api.getPublishedExams().subscribe({
      next: (data: any) => {
        this.exams = data;
        this.loading = false;
        this.checkAttemptedExams();
      },
      error: () => {
        this.errorMessage = 'Failed to load exams';
        this.loading = false;
      }
    });
  }
  checkAttemptedExams() {
    this.exams.forEach(exam => {
      this.api.checkExamAttempted(exam.id).subscribe({
        next: (res: any) => {
          if (res.attempted) {
            this.attemptedExams.add(exam.id);
          }
        },
        error: (err) => console.error('Error checking exam:', err)
      });
    });
  }
   isExamAttempted(examId: number): boolean {
    return this.attemptedExams.has(examId);
  }

  startExam(examId: number) {
    console.log('Starting exam:', examId);
    this.router.navigate(['/exam', examId]);
  }

  logout() {
    this.auth.logout();
  }
}