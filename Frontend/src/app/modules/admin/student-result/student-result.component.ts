import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'app-student-result',
  templateUrl: './student-result.component.html',
  styleUrls: ['./student-result.component.css'],
  standalone: false
})
export class StudentResultComponent implements OnInit {
  attemptId: number;
  result: any = null;
  answers: any[] = [];
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private auth: AuthService
  ) {
    this.attemptId = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit() {
    this.loadStudentResult();
  }

  loadStudentResult() {
    this.api.getResultByAttempt(this.attemptId).subscribe({
      next: (data: any) => {
        this.result = data;
        this.answers = data.answers;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading result:', err);
        this.loading = false;
      }
    });
  }

  getCorrectCount(): number {
    return this.answers.filter(a => a.isCorrect).length;
  }

  getWrongCount(): number {
    return this.answers.filter(a => !a.isCorrect).length;
  }

  goBack() {
    this.router.navigate(['/admin']);
  }

  logout() {
    this.auth.logout();
  }
}