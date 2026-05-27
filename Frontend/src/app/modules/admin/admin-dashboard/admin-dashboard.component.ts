import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  standalone: false
})
export class AdminDashboardComponent implements OnInit {
  user: any;
  exams: any[] = [];
  loading = true;

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
    this.api.getAllExams().subscribe({
      next: (data: any) => {
        this.exams = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  createExam() {
    this.router.navigate(['/admin/create-exam']);
  }

  editExam(examId: number) {
    this.router.navigate(['/admin/edit-exam', examId]);
  }

  addQuestions(examId: number) {
    this.router.navigate(['/admin/add-questions', examId]);
  }
  deleteExam(examId: number) {
  if (confirm('Are you sure you want to delete this exam? All questions will also be deleted.')) {
    this.api.deleteExam(examId).subscribe({
      next: () => {
        this.loadExams(); // Refresh the list
        alert('Exam deleted successfully');
      },
      error: (err) => {
        console.error('Failed to delete exam:', err);
        alert('Failed to delete exam');
      }
    });
  }
}

  publishExam(examId: number) {
    this.api.publishExam(examId).subscribe({
      next: () => {
        this.loadExams();
      },
      error: (err) => {
        console.error('Failed to publish:', err);
      }
    });
  }
  viewResults(examId: number) {
  this.router.navigate(['/admin/exam-results', examId]);
}

  logout() {
    this.auth.logout();
  }
}