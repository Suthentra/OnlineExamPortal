import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../shared/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

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
    startTime: '',
    endTime: '',
    isPublished: false
  };
  loading = true;
  message = '';
  isError = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private auth: AuthService,
    private toast: ToastService
  ) {
    this.examId = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit() {
    this.loadExam();
  }

  loadExam() {
    this.api.getExamById(this.examId).subscribe({
      next: (data: any) => {
        this.exam = {
          title: data.title,
          description: data.description,
          durationInMinutes: data.durationInMinutes,
          totalMarks: data.totalMarks,
          startTime: data.startTime,
          endTime: data.endTime,
          isPublished: data.isPublished
        };
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading exam:', err);
        this.message = 'Failed to load exam';
        this.isError = true;
        this.loading = false;
        this.toast.error('Failed to load exam');
      }
    });
  }

  onSubmit() {
    this.message = '';
    this.isError = false;

    if (!this.exam.title) {
      this.message = 'Exam title is required';
      this.isError = true;
      this.toast.warning('Exam title is required');
      return;
    }

    this.loading = true;
    
    this.api.updateExam(this.examId, this.exam).subscribe({
      next: (response: any) => {
        this.message = 'Exam updated successfully!';
        this.isError = false;
        this.loading = false;
        this.toast.success('Exam updated successfully!');
        setTimeout(() => {
          this.router.navigate(['/admin'], { fragment: 'exams' });
        }, 2000);
      },
      error: (err: any) => {
        console.error('Update error:', err);
        this.message = err.error?.message || 'Failed to update exam';
        this.isError = true;
        this.loading = false;
        this.toast.error(this.message);
      }
    });
  }

  goBack() {
    this.router.navigate(['/admin'], { fragment: 'exams' });
  }

  logout() {
    this.auth.logout();
  }
}