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
  questions: any[] = [];
  loading = false;
  message = '';
  isError = false;
  activeTab: string = 'manual';
  sections: any[] = [];

  // Manual entry
  newQuestion: any = {
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: '',
    marks: 10,
    sectionId: null
  };
  saveToBank: boolean = false;

  // Question Bank
  bankQuestions: any[] = [];
  filterCategory: string = '';
  filterDifficulty: string = '';
  searchTerm: string = '';

  // Edit Modal
  showEditModal: boolean = false;
  editingQuestion: any = {
    id: 0,
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: '',
    marks: 10,
    sectionId: null
  };
  editLoading = false;
  editMessage = '';
  editIsError = false;

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
    this.loadBankQuestions();
    this.loadSections();
  }

  loadExamDetails() {
    this.api.getExamById(this.examId).subscribe({
      next: (data: any) => {
        this.examTitle = data.title;
      }
    });
  }

  loadQuestions() {
    this.api.getQuestionsByExam(this.examId).subscribe({
      next: (data: any) => {
        this.questions = data;
      }
    });
  }

  loadBankQuestions() {
    this.api.getBankQuestions().subscribe({
      next: (data: any) => {
        this.bankQuestions = data.map((q: any) => ({ ...q, selected: false }));
      },
      error: (err: any) => {
        console.error('Error loading bank questions:', err);
      }
    });
  }

  loadSections() {
    this.api.getSectionsByExam(this.examId).subscribe({
      next: (data: any) => {
        this.sections = data;
      },
      error: (err: any) => {
        console.error('Error loading sections:', err);
      }
    });
  }

  get filteredBankQuestions() {
    return this.bankQuestions.filter((q: any) => {
      const matchCategory = !this.filterCategory || q.category === this.filterCategory;
      const matchDifficulty = !this.filterDifficulty || q.difficulty === this.filterDifficulty;
      const matchSearch = !this.searchTerm || q.questionText.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchCategory && matchDifficulty && matchSearch;
    });
  }

  get selectedCount(): number {
    return this.filteredBankQuestions.filter((q: any) => q.selected).length;
  }

  get isAllSelected() {
    return this.filteredBankQuestions.length > 0 && this.filteredBankQuestions.every((q: any) => q.selected);
  }

  selectAll() {
    const select = !this.isAllSelected;
    this.filteredBankQuestions.forEach((q: any) => q.selected = select);
  }

  addSelectedToExam() {
    const selectedIds = this.filteredBankQuestions.filter((q: any) => q.selected).map((q: any) => q.id);
    
    if (selectedIds.length === 0) return;

    this.loading = true;
    this.api.addFromBankToExam(this.examId, selectedIds).subscribe({
      next: () => {
        this.message = `${selectedIds.length} questions added to exam!`;
        this.isError = false;
        this.loading = false;
        this.loadQuestions();
        this.bankQuestions.forEach((q: any) => q.selected = false);
        setTimeout(() => this.message = '', 3000);
      },
      error: (err: any) => {
        this.message = 'Failed to add questions';
        this.isError = true;
        this.loading = false;
      }
    });
  }

  addManualQuestion() {
    this.loading = true;
    this.api.createQuestion(this.examId, this.newQuestion).subscribe({
      next: () => {
        this.message = 'Question added successfully!';
        this.isError = false;
        this.loading = false;
        this.newQuestion = { 
          questionText: '', 
          optionA: '', 
          optionB: '', 
          optionC: '', 
          optionD: '', 
          correctAnswer: '', 
          marks: 10,
          sectionId: null
        };
        this.loadQuestions();

        if (this.saveToBank) {
          this.api.addToBank(this.newQuestion).subscribe();
        }

        setTimeout(() => this.message = '', 3000);
      },
      error: () => {
        this.message = 'Failed to add question';
        this.isError = true;
        this.loading = false;
      }
    });
  }

  openEditModal(question: any) {
    this.editingQuestion = { ...question };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingQuestion = {
      id: 0,
      questionText: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: '',
      marks: 10,
      sectionId: null
    };
    this.editMessage = '';
  }

  updateQuestion() {
    this.editLoading = true;
    this.editMessage = '';
    
    this.api.updateQuestion(this.editingQuestion.id, this.editingQuestion).subscribe({
      next: () => {
        this.editMessage = 'Question updated successfully!';
        this.editIsError = false;
        this.editLoading = false;
        this.loadQuestions();
        setTimeout(() => {
          this.closeEditModal();
        }, 1500);
      },
      error: (err: any) => {
        this.editMessage = err.error?.message || 'Failed to update question';
        this.editIsError = true;
        this.editLoading = false;
      }
    });
  }

  deleteQuestion(questionId: number) {
    if (confirm('Delete this question?')) {
      this.api.deleteQuestion(questionId).subscribe(() => this.loadQuestions());
    }
  }

  downloadCSVTemplate() {
    const template = `Question Text,Option A,Option B,Option C,Option D,Correct Answer,Marks
"What is C#?","Programming Language","Database","OS","Browser","A","10"
"What is SQL?","Structured Query Language","Simple Query Language","Standard Query Language","System Query Language","A","10"
"What is Angular?","Frontend Framework","Backend Framework","Database","Server","A","10"`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  triggerFileUpload() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput.click();
  }

  uploadCSV(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const content = e.target.result;
      const lines = content.split('\n');
      
      const questions = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        const values = lines[i].split(',');
        if (values.length >= 7) {
          questions.push({
            questionText: values[0].replace(/"/g, ''),
            optionA: values[1].replace(/"/g, ''),
            optionB: values[2].replace(/"/g, ''),
            optionC: values[3] ? values[3].replace(/"/g, '') : '',
            optionD: values[4] ? values[4].replace(/"/g, '') : '',
            correctAnswer: values[5].replace(/"/g, ''),
            marks: parseInt(values[6]) || 10
          });
        }
      }

      if (questions.length > 0 && confirm(`Add ${questions.length} questions to this exam?`)) {
        this.api.bulkCreateQuestions(this.examId, questions).subscribe({
          next: () => {
            alert(`✅ ${questions.length} questions added successfully!`);
            this.loadQuestions();
          },
          error: (err: any) => {
            console.error('Bulk upload error:', err);
            alert('❌ Failed to add questions. Check CSV format.');
          }
        });
      }
    };
    reader.readAsText(file);
  }

  getSectionName(sectionId: number): string {
    const section = this.sections.find(s => s.id === sectionId);
    return section ? section.sectionName : '';
  }

  goBack() {
    this.router.navigate(['/admin']);
  }
}