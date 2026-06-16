import { Component, OnInit, ViewChildren, ElementRef, QueryList } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-add-questions',
  templateUrl: './add-questions.component.html',
  styleUrls: ['./add-questions.component.css'],
  standalone: false
})
export class AddQuestionsComponent implements OnInit {
  examId: number;
  examTitle: string = '';
  examTotalMarks: number = 0;
  questions: any[] = [];
  loading = false;
  message = '';
  isError = false;
  activeTab: string = 'manual';
  sections: any[] = [];
  
  @ViewChildren('optionInput') optionInputs!: QueryList<ElementRef>;

  // Manual entry
  newQuestion: any = {
    questionText: '',
    marks: 10,
    sectionId: null
  };
  questionType: string = 'MCQ';
  options: { text: string; isCorrect: boolean }[] = [];
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
    questionType: 'MCQ',
    marks: 10,
    sectionId: null
  };
  editingOptions: { text: string; isCorrect: boolean }[] = [];
  editLoading = false;
  editMessage = '';
  editIsError = false;

  // Track focused option index
  focusedOptionIndex: number = -1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private toast: ToastService
  ) {
    this.examId = Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit() {
    this.loadExamDetails();
    this.loadQuestions();
    this.loadBankQuestions();
    
    // Initialize with 4 empty options
    this.options = [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ];
  }

  loadExamDetails() {
    this.api.getExamById(this.examId).subscribe({
      next: (data: any) => {
        this.examTitle = data.title;
        this.examTotalMarks = data.totalMarks;
      },
      error: (err) => {
        console.error('Error loading exam details:', err);
        this.toast.error('Failed to load exam details');
      }
    });
  }

  loadQuestions() {
    this.api.getQuestionsByExam(this.examId).subscribe({
      next: (data: any) => {
        this.questions = data || [];
      },
      error: (err: any) => {
        console.error('Error loading questions:', err);
        this.questions = [];
        this.toast.error('Failed to load questions');
      }
    });
  }

  loadBankQuestions() {
    this.api.getBankQuestions().subscribe({
      next: (data: any) => {
        this.bankQuestions = (data || []).map((q: any) => ({ ...q, selected: false }));
      },
      error: (err: any) => {
        console.error('Error loading bank questions:', err);
        this.bankQuestions = [];
        this.toast.error('Failed to load question bank');
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
    
    if (selectedIds.length === 0) {
      this.toast.warning('Please select at least one question');
      return;
    }

    this.loading = true;
    
    this.api.addFromBankToExam(this.examId, selectedIds).subscribe({
      next: (response: any) => {
        this.toast.success(response.message || `${selectedIds.length} questions added!`);
        this.bankQuestions.forEach((q: any) => q.selected = false);
        this.loadQuestions();
        this.loadExamDetails();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error adding from bank:', err);
        this.toast.error(err.error?.message || 'Failed to add questions');
        this.loading = false;
      }
    });
  }

  // ========== MARKS CALCULATION METHODS ==========
  
  getCurrentTotalMarks(): number {
    return this.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  }

  getRemainingMarks(): number {
    return this.examTotalMarks - this.getCurrentTotalMarks();
  }

  getUsedPercentage(): number {
    if (this.examTotalMarks === 0) return 0;
    return (this.getCurrentTotalMarks() / this.examTotalMarks) * 100;
  }

  // ========== OPTION METHODS WITH KEYBOARD NAVIGATION ==========
  
  onQuestionTypeChange() {
    if (this.questionType === 'TRUE_FALSE') {
      this.options = [
        { text: 'True', isCorrect: false },
        { text: 'False', isCorrect: false }
      ];
    } else if (this.questionType === 'MCQ') {
      this.options = [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ];
    } else if (this.questionType === 'MULTIPLE_ANSWER') {
      this.options = [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ];
    }
  }

  onEditQuestionTypeChange() {
    if (this.editingQuestion.questionType === 'TRUE_FALSE') {
      this.editingOptions = [
        { text: 'True', isCorrect: false },
        { text: 'False', isCorrect: false }
      ];
    }
  }

  setCorrectOption(selectedIndex: number) {
    this.options.forEach((opt, index) => {
      opt.isCorrect = (index === selectedIndex);
    });
  }

  setEditCorrectOption(selectedIndex: number) {
    this.editingOptions.forEach((opt, index) => {
      opt.isCorrect = (index === selectedIndex);
    });
  }

  setTrueFalseCorrect(selectedIndex: number) {
    this.options.forEach((opt, index) => {
      opt.isCorrect = (index === selectedIndex);
    });
  }

  setEditTrueFalseCorrect(selectedIndex: number) {
    this.editingOptions.forEach((opt, index) => {
      opt.isCorrect = (index === selectedIndex);
    });
  }

  addOption() {
    if (this.questionType !== 'TRUE_FALSE') {
      this.options.push({ text: '', isCorrect: false });
    }
  }

  removeOption(index: number) {
    if (this.questionType === 'TRUE_FALSE') {
      this.toast.warning('True/False questions must have exactly 2 options');
      return;
    }
    if (this.options.length > 2) {
      this.options.splice(index, 1);
    } else {
      this.toast.warning('At least 2 options are required');
    }
  }

  addEditOption() {
    if (this.editingQuestion.questionType !== 'TRUE_FALSE') {
      this.editingOptions.push({ text: '', isCorrect: false });
    }
  }

  removeEditOption(index: number) {
    if (this.editingQuestion.questionType === 'TRUE_FALSE') {
      this.toast.warning('True/False questions must have exactly 2 options');
      return;
    }
    if (this.editingOptions.length > 2) {
      this.editingOptions.splice(index, 1);
    } else {
      this.toast.warning('At least 2 options are required');
    }
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  getCorrectOptionsText(options: any[]): string {
    const correctOptions = options.filter((opt: any) => opt.isCorrect);
    if (correctOptions.length === 0) return 'None';
    return correctOptions.map((opt: any) => this.getOptionLetter(opt.optionOrder - 1)).join(', ');
  }

  // ===== KEYBOARD NAVIGATION METHODS =====

  onOptionFocus(index: number) {
    this.focusedOptionIndex = index;
  }

  onOptionKeydown(event: KeyboardEvent, currentIndex: number) {
    // Arrow Down - move to next option or add new
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = currentIndex + 1;
      if (nextIndex < this.options.length) {
        const inputs = document.querySelectorAll('.option-row input[type="text"]');
        if (inputs[nextIndex]) {
          (inputs[nextIndex] as HTMLInputElement).focus();
        }
      } else {
        // Add new option and focus it
        this.addOption();
        setTimeout(() => {
          const inputs = document.querySelectorAll('.option-row input[type="text"]');
          if (inputs[nextIndex]) {
            (inputs[nextIndex] as HTMLInputElement).focus();
          }
        }, 100);
      }
    }
    
    // Arrow Up - move to previous option
    else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0) {
        const inputs = document.querySelectorAll('.option-row input[type="text"]');
        if (inputs[prevIndex]) {
          (inputs[prevIndex] as HTMLInputElement).focus();
        }
      }
    }
    
    // Enter - move to next option or add new
    else if (event.key === 'Enter') {
      event.preventDefault();
      const nextIndex = currentIndex + 1;
      if (nextIndex < this.options.length) {
        const inputs = document.querySelectorAll('.option-row input[type="text"]');
        if (inputs[nextIndex]) {
          (inputs[nextIndex] as HTMLInputElement).focus();
        }
      } else {
        this.addOption();
        setTimeout(() => {
          const inputs = document.querySelectorAll('.option-row input[type="text"]');
          if (inputs[nextIndex]) {
            (inputs[nextIndex] as HTMLInputElement).focus();
          }
        }, 100);
      }
    }
  }

  onKeydown(event: KeyboardEvent, fieldName: string) {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (fieldName === 'questionText') {
        const typeSelect = document.querySelector('select[name="questionType"]') as HTMLSelectElement;
        if (typeSelect) typeSelect.focus();
      } else if (fieldName === 'questionType') {
        const firstOption = document.querySelector('.option-row input[type="text"]') as HTMLInputElement;
        if (firstOption) firstOption.focus();
      } else if (fieldName === 'marks') {
        const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (submitBtn) submitBtn.focus();
      }
    }
  }

  // ========== MANUAL QUESTION METHODS ==========

  async addManualQuestion() {
    if (!this.newQuestion.questionText || this.newQuestion.questionText.trim() === '') {
      this.toast.warning('Please enter question text');
      return;
    }

    const validOptions = this.options.filter((opt: { text: string; isCorrect: boolean }) => opt.text.trim() !== '');
    if (validOptions.length < 2) {
      this.toast.warning('Please add at least 2 options');
      return;
    }

    const hasCorrect = this.options.some((opt: { text: string; isCorrect: boolean }) => opt.isCorrect);
    if (!hasCorrect) {
      this.toast.warning('Please mark at least one option as correct');
      return;
    }

    if (this.questionType === 'MCQ') {
      const correctCount = this.options.filter(opt => opt.isCorrect).length;
      if (correctCount > 1) {
        this.toast.warning('Single Answer questions can only have ONE correct option');
        return;
      }
    }

    this.loading = true;
    
    const questionData = {
      questionText: this.newQuestion.questionText,
      questionType: this.questionType,
      marks: this.newQuestion.marks || 10,
      options: this.options.map((opt: { text: string; isCorrect: boolean }, idx: number) => ({
        optionText: opt.text,
        optionOrder: idx + 1,
        isCorrect: opt.isCorrect
      }))
    };
    
    this.api.createQuestion(this.examId, questionData).subscribe({
      next: () => {
        this.toast.success('Question added successfully!');
        this.loading = false;
        
        this.newQuestion = { 
          questionText: '', 
          marks: 10,
          sectionId: null
        };
        this.questionType = 'MCQ';
        this.options = [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ];
        
        this.loadQuestions();
        this.loadExamDetails();

        if (this.saveToBank) {
          this.api.addToBank(questionData).subscribe({
            next: () => this.toast.info('Question saved to bank'),
            error: (err) => console.error('Error saving to bank:', err)
          });
        }
      },
      error: (err) => {
        console.error('Error adding question:', err);
        this.toast.error(err.error?.message || 'Failed to add question');
        this.loading = false;
      }
    });
  }

  // ========== EDIT QUESTION METHODS ==========

  openEditModal(question: any) {
    this.editingQuestion = { ...question };
    this.editingOptions = question.options.map((opt: any) => ({
      text: opt.optionText,
      isCorrect: opt.isCorrect
    }));
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingQuestion = {
      id: 0,
      questionText: '',
      questionType: 'MCQ',
      marks: 10,
      sectionId: null
    };
    this.editingOptions = [];
    this.editMessage = '';
  }

  async updateQuestion() {
    if (!this.editingQuestion.questionText || this.editingQuestion.questionText.trim() === '') {
      this.toast.warning('Please enter question text');
      return;
    }

    const validOptions = this.editingOptions.filter((opt: { text: string; isCorrect: boolean }) => opt.text.trim() !== '');
    if (validOptions.length < 2) {
      this.toast.warning('Please add at least 2 options');
      return;
    }

    const hasCorrect = this.editingOptions.some((opt: { text: string; isCorrect: boolean }) => opt.isCorrect);
    if (!hasCorrect) {
      this.toast.warning('Please mark at least one option as correct');
      return;
    }

    if (this.editingQuestion.questionType === 'MCQ') {
      const correctCount = this.editingOptions.filter(opt => opt.isCorrect).length;
      if (correctCount > 1) {
        this.toast.warning('Single Answer questions can only have ONE correct option');
        return;
      }
    }

    this.editLoading = true;
    
    const updateData = {
      questionText: this.editingQuestion.questionText,
      questionType: this.editingQuestion.questionType,
      marks: this.editingQuestion.marks,
      options: this.editingOptions.map((opt: { text: string; isCorrect: boolean }, idx: number) => ({
        optionText: opt.text,
        optionOrder: idx + 1,
        isCorrect: opt.isCorrect
      }))
    };
    
    this.api.updateQuestion(this.editingQuestion.id, updateData).subscribe({
      next: () => {
        this.toast.success('Question updated successfully!');
        this.editLoading = false;
        this.loadQuestions();
        this.loadExamDetails();
        setTimeout(() => {
          this.closeEditModal();
        }, 1000);
      },
      error: (err: any) => {
        console.error('Error updating question:', err);
        this.toast.error(err.error?.message || 'Failed to update question');
        this.editLoading = false;
      }
    });
  }

  async deleteQuestion(questionId: number) {
    const confirmed = await this.toast.confirmDelete('this question');
    if (confirmed) {
      this.api.deleteQuestion(questionId).subscribe({
        next: () => {
          this.toast.success('Question deleted successfully!');
          this.loadQuestions();
          this.loadExamDetails();
        },
        error: (err: any) => {
          console.error('Error deleting question:', err);
          this.toast.error(err.error?.message || 'Failed to delete question');
        }
      });
    }
  }

  downloadCSVTemplate() {
    const template = `Question Text,Question Type,Option 1,Option 2,Option 3,Option 4,Option 5,Option 6,Correct Answers (comma separated),Marks
"What is C#?","MCQ","Programming Language","Database","OS","Browser","","","1","10"
"Angular is a framework.","TRUE_FALSE","True","False","","","","","1","5"
"Which are programming languages?","MULTIPLE_ANSWER","JavaScript","HTML","Python","CSS","","","1,3","10"`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    this.toast.success('Template downloaded');
  }

  triggerFileUpload() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  async uploadCSV(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.toast.showLoading('Reading CSV...');

    const reader = new FileReader();
    reader.onload = async (e: any) => {
      const content = e.target.result;
      const lines = content.split('\n');
      
      const questionsToAdd = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const matches = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
        if (matches && matches.length >= 7) {
          const questionText = matches[0].replace(/^"|"$/g, '');
          const questionType = matches[1].replace(/^"|"$/g, '');
          const option1 = matches[2].replace(/^"|"$/g, '');
          const option2 = matches[3].replace(/^"|"$/g, '');
          const option3 = matches[4] ? matches[4].replace(/^"|"$/g, '') : '';
          const option4 = matches[5] ? matches[5].replace(/^"|"$/g, '') : '';
          const correctAnswers = matches[6] ? matches[6].replace(/^"|"$/g, '') : '1';
          const marks = parseInt(matches[7]) || 10;
          
          const options = [];
          if (option1) options.push({ optionText: option1, optionOrder: 1, isCorrect: correctAnswers.includes('1') });
          if (option2) options.push({ optionText: option2, optionOrder: 2, isCorrect: correctAnswers.includes('2') });
          if (option3) options.push({ optionText: option3, optionOrder: 3, isCorrect: correctAnswers.includes('3') });
          if (option4) options.push({ optionText: option4, optionOrder: 4, isCorrect: correctAnswers.includes('4') });
          
          questionsToAdd.push({
            questionText: questionText,
            questionType: questionType === 'TRUE_FALSE' ? 'TRUE_FALSE' : (questionType === 'MULTIPLE_ANSWER' ? 'MULTIPLE_ANSWER' : 'MCQ'),
            marks: marks,
            options: options
          });
        }
      }

      this.toast.closeLoading();

      if (questionsToAdd.length === 0) {
        this.toast.error('No valid questions found in CSV');
        return;
      }

      const remainingMarks = this.getRemainingMarks();
      const totalMarksInCSV = questionsToAdd.reduce((sum, q) => sum + q.marks, 0);

      if (totalMarksInCSV > remainingMarks) {
        this.toast.warning(`CSV has ${totalMarksInCSV} marks but only ${remainingMarks} marks available`);
      }

      if (confirm(`Add ${questionsToAdd.length} questions to this exam?`)) {
        this.loading = true;
        let completed = 0;
        let hasError = false;
        
        for (const q of questionsToAdd) {
          this.api.createQuestion(this.examId, q).subscribe({
            next: () => {
              completed++;
              if (completed === questionsToAdd.length && !hasError) {
                this.toast.success(`${questionsToAdd.length} questions added successfully!`);
                this.loading = false;
                this.loadQuestions();
                this.loadExamDetails();
              }
            },
            error: (err: any) => {
              if (!hasError) {
                hasError = true;
                this.toast.error('Failed to add some questions');
                this.loading = false;
              }
            }
          });
        }
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  getSectionName(sectionId: number): string {
    const section = this.sections.find((s: any) => s.id === sectionId);
    return section ? section.sectionName : '';
  }

  goBack() {
    this.router.navigate(['/admin']);
  }
}