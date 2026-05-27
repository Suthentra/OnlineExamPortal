import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';

@Component({
  selector: 'app-add-questions',
  templateUrl: './add-questions.component.html',
  styleUrls: ['./add-questions.component.css'],
  standalone: false
})
export class AddQuestionsComponent implements OnInit {
  examId: number;
  examTitle: string = '';
  
  // For adding new question
  questionText = '';
  optionA = '';
  optionB = '';
  optionC = '';
  optionD = '';
  correctAnswer = '';
  marks = 10;
  
  // For editing question
  isEditing = false;
  editingQuestionId: number = 0;
  
  message = '';
  isError = false;
  loading = false;
  questions: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService
  ) {
    this.examId = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit() {
    this.loadExamDetails();
    this.loadQuestions();
  }

  loadExamDetails() {
    this.api.getExamById(this.examId).subscribe({
      next: (data: any) => {
        this.examTitle = data.title;
      },
      error: (err: any) => {
        console.error('Error loading exam:', err);
      }
    });
  }

  loadQuestions() {
    this.api.getQuestionsByExam(this.examId).subscribe({
      next: (data: any) => {
        this.questions = data;
      },
      error: (err: any) => {
        console.error('Error loading questions:', err);
      }
    });
  }

  // Add New Question
  onSubmit() {
    if (!this.questionText || !this.optionA || !this.optionB || !this.correctAnswer) {
      this.message = 'Please fill required fields';
      this.isError = true;
      return;
    }

    this.loading = true;
    this.message = '';

    const questionData = {
      questionText: this.questionText,
      optionA: this.optionA,
      optionB: this.optionB,
      optionC: this.optionC || '',
      optionD: this.optionD || '',
      correctAnswer: this.correctAnswer,
      marks: this.marks
    };

    this.api.createQuestion(this.examId, questionData).subscribe({
      next: () => {
        this.message = 'Question added successfully!';
        this.isError = false;
        this.loading = false;
        
        // Clear form
        this.clearForm();
        
        // Reload questions list
        this.loadQuestions();
        
        setTimeout(() => this.message = '', 3000);
      },
      error: (err: any) => {
        this.message = err.error?.message || 'Failed to add question';
        this.isError = true;
        this.loading = false;
      }
    });
  }

  // Edit Question - Load data into form
  editQuestion(question: any) {
    this.isEditing = true;
    this.editingQuestionId = question.id;
    this.questionText = question.questionText;
    this.optionA = question.optionA;
    this.optionB = question.optionB;
    this.optionC = question.optionC || '';
    this.optionD = question.optionD || '';
    this.correctAnswer = question.correctAnswer;
    this.marks = question.marks;
    
    // Scroll to form
    document.getElementById('questionForm')?.scrollIntoView({ behavior: 'smooth' });
  }

  // Update Question
  onUpdate() {
    if (!this.questionText || !this.optionA || !this.optionB || !this.correctAnswer) {
      this.message = 'Please fill required fields';
      this.isError = true;
      return;
    }

    this.loading = true;
    this.message = '';

    const questionData = {
      questionText: this.questionText,
      optionA: this.optionA,
      optionB: this.optionB,
      optionC: this.optionC || '',
      optionD: this.optionD || '',
      correctAnswer: this.correctAnswer,
      marks: this.marks
    };

    this.api.updateQuestion(this.editingQuestionId, questionData).subscribe({
      next: () => {
        this.message = 'Question updated successfully!';
        this.isError = false;
        this.loading = false;
        
        // Clear form and reset edit mode
        this.clearForm();
        this.isEditing = false;
        this.editingQuestionId = 0;
        
        // Reload questions list
        this.loadQuestions();
        
        setTimeout(() => this.message = '', 3000);
      },
      error: (err: any) => {
        this.message = err.error?.message || 'Failed to update question';
        this.isError = true;
        this.loading = false;
      }
    });
  }

  // Delete Question
  deleteQuestion(questionId: number) {
    if (confirm('Are you sure you want to delete this question?')) {
      this.api.deleteQuestion(questionId).subscribe({
        next: () => {
          this.loadQuestions();
        },
        error: (err: any) => {
          console.error('Error deleting question:', err);
        }
      });
    }
  }

  // Cancel Edit
  cancelEdit() {
    this.clearForm();
    this.isEditing = false;
    this.editingQuestionId = 0;
  }

  // Clear Form
  clearForm() {
    this.questionText = '';
    this.optionA = '';
    this.optionB = '';
    this.optionC = '';
    this.optionD = '';
    this.correctAnswer = '';
    this.marks = 10;
  }

  goBack() {
    this.router.navigate(['/admin']);
  }
}