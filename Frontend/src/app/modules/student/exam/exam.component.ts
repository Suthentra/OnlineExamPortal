import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';

@Component({
  selector: 'app-exam',
  templateUrl: './exam.component.html',
  styleUrls: ['./exam.component.css'],
  standalone: false
})
export class ExamComponent implements OnInit, OnDestroy {
  examId: number;
  examTitle = '';
  questions: any[] = [];
  attemptId = 0;
  currentIndex = 0;
  
  // Simple array to store answers - index matches question order
  selectedAnswers: string[] = [];
  
  timeLeft = 0;
  timer: any;
  loading = true;
  submitted = false;
  errorMessage = '';
  user: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private api: ApiService
  ) {
    this.examId = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit() {
    this.user = this.auth.getUser();
    this.startExam();
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  startExam() {
    this.api.startExam({ examId: this.examId, studentId: this.user.userId }).subscribe({
      next: (res: any) => {
        this.attemptId = res.id;
        this.examTitle = res.examTitle;
        this.questions = res.questions;
        this.timeLeft = res.remainingMinutes * 60;
        
        // Initialize answers array with empty strings
        this.selectedAnswers = new Array(this.questions.length).fill('');
        
        this.startTimer();
        this.loading = false;
      },
      error: (err: any) => {
        this.errorMessage = err.error?.message || 'Failed to start exam';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/dashboard']), 2000);
      }
    });
  }

  startTimer() {
    this.timer = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        this.submitExam();
      }
    }, 1000);
  }

  // Simple method to select answer
  selectAnswer(option: string) {
    this.selectedAnswers[this.currentIndex] = option;
    
    // Save to backend
    const questionId = this.questions[this.currentIndex].id;
    this.api.submitAnswer({
      attemptId: this.attemptId,
      questionId: questionId,
      selectedOption: option
    }).subscribe();
  }

  // Check if current question has an answer
  hasCurrentAnswer(): boolean {
    return this.selectedAnswers[this.currentIndex] !== '';
  }

  // Get current answer
  getCurrentAnswer(): string {
    return this.selectedAnswers[this.currentIndex];
  }

  // Check if a specific question is answered
  isAnswered(index: number): boolean {
    return this.selectedAnswers[index] !== '';
  }

  getCurrentQuestion() {
    return this.questions[this.currentIndex];
  }

  next() {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  goToQuestion(index: number) {
    this.currentIndex = index;
  }

  getAnsweredCount(): number {
    return this.selectedAnswers.filter(a => a !== '').length;
  }

  formatTime() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  submitExam() {
    if (this.timer) clearInterval(this.timer);
    
    if (confirm('Submit exam?')) {
      this.loading = true;
      this.api.submitExam(this.attemptId).subscribe({
        next: () => {
          this.submitted = true;
          this.loading = false;
          setTimeout(() => this.router.navigate(['/results']), 2000);
        },
        error: (err) => console.error(err)
      });
    } else {
      this.startTimer();
    }
  }

  logout() {
    this.auth.logout();
  }
}