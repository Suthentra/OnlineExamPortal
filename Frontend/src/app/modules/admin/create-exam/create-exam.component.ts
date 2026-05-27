import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';

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

  constructor(private api: ApiService, private router: Router) {}

  onSubmit() {
    if (!this.title) {
      this.message = 'Exam title is required';
      this.isError = true;
      return;
    }

    this.loading = true;
    this.message = '';

    const examData = {
      title: this.title,
      description: this.description,
      durationInMinutes: this.duration,
      totalMarks: this.totalMarks,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    this.api.createExam(examData).subscribe({
      next: () => {
        this.message = 'Exam created successfully!';
        this.isError = false;
        this.loading = false;
        setTimeout(() => this.router.navigate(['/admin']), 2000);
      },
      error: (err) => {
        this.message = err.error?.message || 'Failed to create exam';
        this.isError = true;
        this.loading = false;
      }
    });
  }
}