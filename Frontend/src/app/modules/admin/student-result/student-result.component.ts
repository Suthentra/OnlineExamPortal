import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-student-result',
  templateUrl: './student-result.component.html',  // ← FIXED: was pointing to wrong file
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
    private auth: AuthService,
    private toast: ToastService
  ) {
    this.attemptId = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit() {
    this.loadStudentResult();
  }

  loadStudentResult() {
    this.toast.showLoading('Loading result details...');
    
    this.api.getResultByAttempt(this.attemptId).subscribe({
      next: (data: any) => {
        this.toast.closeLoading();
        this.result = data;
        this.answers = data.answers || [];
        this.loading = false;
        this.toast.success('Result loaded successfully');
      },
      error: (err) => {
        this.toast.closeLoading();
        console.error('Error loading result:', err);
        this.toast.error('Failed to load result details');
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

  async printResult() {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Student Result - ${this.result?.examTitle}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1 { color: #333; }
              .summary { display: flex; justify-content: space-around; margin: 20px 0; }
              .card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; text-align: center; }
              .passed { color: green; font-weight: bold; }
              .failed { color: red; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .correct { background-color: #d4edda; }
              .wrong { background-color: #f8d7da; }
            </style>
          </head>
          <body>
            <h1>${this.result?.examTitle}</h1>
            <h3>Student: ${this.result?.studentName}</h3>
            <div class="summary">
              <div class="card">
                <h3>Score</h3>
                <p>${this.result?.score}/${this.result?.totalMarks}</p>
              </div>
              <div class="card">
                <h3>Percentage</h3>
                <p>${this.result?.percentage}%</p>
              </div>
              <div class="card">
                <h3>Status</h3>
                <p class="${this.result?.isPassed ? 'passed' : 'failed'}">${this.result?.isPassed ? 'PASSED' : 'FAILED'}</p>
              </div>
            </div>
            <h3>Answer Details</h3>
            <table>
              <thead>
                <tr><th>#</th><th>Question</th><th>Your Answer</th><th>Correct Answer</th><th>Result</th><th>Marks</th></tr>
              </thead>
              <tbody>
                ${this.answers.map((a, i) => `
                  <tr class="${a.isCorrect ? 'correct' : 'wrong'}">
                    <td>${i + 1}</td>
                    <td>${a.questionText}</td>
                    <td>${a.yourAnswer || 'Not Answered'}</td>
                    <td>${a.correctAnswer}</td>
                    <td>${a.isCorrect ? '✓ Correct' : '✗ Wrong'}</td>
                    <td>${a.isCorrect ? a.marks : 0}</td>
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
  // Go back to exam results page (stay in results context)
  if (this.result?.examId) {
    this.router.navigate(['/admin/exam-results', this.result.examId]);
  } else {
    this.router.navigate(['/admin'], { fragment: 'results' });
  }
}

  logout() {
    this.auth.logout();
  }
}