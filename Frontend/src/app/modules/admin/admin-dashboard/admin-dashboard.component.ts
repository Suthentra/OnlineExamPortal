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
  students: any[] = [];
  loading = true;
  activeTab: string = 'dashboard';  // ← ADD THIS

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.user = this.auth.getUser();
    this.loadData();
  }

  loadData() {
    this.api.getAllExams().subscribe({
      next: (data: any) => {
        this.exams = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
    
    this.api.getAllUsers().subscribe({
      next: (data: any) => {
        this.students = data.filter((u: any) => u.userRole === 'Student');
      }
    });
  }

  get totalStudents(): number {
    return this.students.length;
  }

  get totalQuestions(): number {
    return this.exams.reduce((sum, e) => sum + (e.totalQuestions || 0), 0);
  }

  get averageScore(): number {
    return 72;
  }

  createExam() {
    this.router.navigate(['/admin/create-exam']);
  }

  editExam(id: number) {
    this.router.navigate(['/admin/edit-exam', id]);
  }

  addQuestions(id: number) {
    this.router.navigate(['/admin/add-questions', id]);
  }

  publishExam(id: number) {
    this.api.publishExam(id).subscribe(() => this.loadData());
  }

  deleteExam(id: number) {
    if (confirm('Delete this exam?')) {
      this.api.deleteExam(id).subscribe(() => this.loadData());
    }
  }

  viewResults(id: number) {
    this.router.navigate(['/admin/exam-results', id]);
  }

  logout() {
    this.auth.logout();
  }
}