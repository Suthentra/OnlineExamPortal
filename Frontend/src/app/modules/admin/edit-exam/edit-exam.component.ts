import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';

@Component({
  selector: 'app-edit-exam',
  templateUrl: './edit-exam.component.html',
  styleUrls: ['./edit-exam.component.css'],
  standalone: false
})
export class EditExamComponent implements OnInit {
  examId: number;
  exam: any = {
    title: '',
    description: '',
    durationInMinutes: 60,
    totalMarks: 100,
    isPublished: false
  };
  message = '';
  isError = false;
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService
  ) {
    this.examId = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit() {
    this.loadExam();
  }

  loadExam() {
    this.api.getExamById(this.examId).subscribe({
      next: (data: any) => {
        this.exam = data;
      },
      error: (err) => {
        console.error('Error loading exam:', err);
      }
    });
  }

  onSubmit() {
    this.loading = true;
    this.message = '';

    const examData = {
      title: this.exam.title,
      description: this.exam.description,
      durationInMinutes: this.exam.durationInMinutes,
      totalMarks: this.exam.totalMarks,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isPublished: this.exam.isPublished
    };

    this.api.updateExam(this.examId, examData).subscribe({
      next: () => {
        this.message = 'Exam updated successfully!';
        this.isError = false;
        this.loading = false;
        setTimeout(() => this.router.navigate(['/admin']), 2000);
      },
      error: (err) => {
        this.message = err.error?.message || 'Failed to update exam';
        this.isError = true;
        this.loading = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/admin']);
  }
}