import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-create-exam',
  templateUrl: './create-exam.component.html',
  styleUrls: ['./create-exam.component.css'],
  standalone: false
})
export class CreateExamComponent {
  title = '';
  description = '';
  duration = 60;
  totalMarks = 100;
  message = '';
  isError = false;
  loading = false;

  constructor(
    private api: ApiService, 
    private router: Router,
    private toast: ToastService
  ) {}

  onSubmit() {
    this.message = '';
    this.isError = false;

    if (!this.title) {
      this.message = 'Exam title is required';
      this.isError = true;
      this.toast.warning('Exam title is required');
      return;
    }

    if (!this.duration || this.duration <= 0) {
      this.message = 'Duration must be greater than 0';
      this.isError = true;
      this.toast.warning('Duration must be greater than 0');
      return;
    }

    if (!this.totalMarks || this.totalMarks <= 0) {
      this.message = 'Total marks must be greater than 0';
      this.isError = true;
      this.toast.warning('Total marks must be greater than 0');
      return;
    }

    this.loading = true;

    const examData = {
      title: this.title,
      description: this.description,
      durationInMinutes: this.duration,
      totalMarks: this.totalMarks,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    this.api.createExam(examData).subscribe({
      next: (response: any) => {
        this.message = 'Exam created successfully!';
        this.isError = false;
        this.loading = false;
        this.toast.success('Exam created successfully!');
        setTimeout(() => {
          this.router.navigate(['/admin'], { fragment: 'exams' });
        }, 2000);
      },
      error: (err) => {
        console.error('Create exam error:', err);
        this.message = err.error?.message || 'Failed to create exam. Please try again.';
        this.isError = true;
        this.loading = false;
        this.toast.error(this.message);
      }
    });
  }

  goBack() {
    this.router.navigate(['/admin'], { fragment: 'exams' });
  }
}