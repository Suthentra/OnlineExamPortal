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
  editingQuestionType: string = 'MCQ';

  // Track focused option index
  focusedOptionIndex: number = -1;

  // ===== CSV UPLOAD =====
  csvProcessing = false;
  csvQuestions: any[] = [];
  csvFile: File | null = null;

  // ===== MARKS LIMIT TRACKING =====
  private marksLimitReached: boolean = false;
  private marksLimitToastShown: boolean = false;

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
        this.checkMarksLimit();
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
        this.checkMarksLimit();
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

  // ========== MARKS LIMIT CHECK ==========
  
  checkMarksLimit() {
    const remaining = this.getRemainingMarks();
    const used = this.getCurrentTotalMarks();
    
    if (used >= this.examTotalMarks && this.examTotalMarks > 0) {
      this.marksLimitReached = true;
      if (!this.marksLimitToastShown) {
        this.marksLimitToastShown = true;
        this.toast.warning(
          `📊 <strong>Marks Limit Reached!</strong><br><br>` +
          `All ${this.examTotalMarks} marks have been used.<br>` +
          `You cannot add more questions to this exam.`
        );
      }
    } else {
      this.marksLimitReached = false;
      this.marksLimitToastShown = false;
    }
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

  // ===== CHECK IF MARKS LIMIT IS REACHED =====
  isMarksLimitReached(): boolean {
    return this.marksLimitReached;
  }

  // ===== CHECK IF CAN ADD MORE QUESTIONS =====
  canAddQuestions(): boolean {
    return !this.marksLimitReached && this.getRemainingMarks() > 0;
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
    // Check if marks limit is reached
    if (this.isMarksLimitReached()) {
      this.toast.warning('Cannot add more questions. Marks limit reached!');
      return;
    }

    const selectedIds = this.filteredBankQuestions.filter((q: any) => q.selected).map((q: any) => q.id);
    
    if (selectedIds.length === 0) {
      this.toast.warning('Please select at least one question');
      return;
    }

    // Check if selected questions fit within remaining marks
    const selectedQuestions = this.filteredBankQuestions.filter((q: any) => q.selected);
    const totalSelectedMarks = selectedQuestions.reduce((sum, q) => sum + q.marks, 0);
    const remainingMarks = this.getRemainingMarks();

    if (totalSelectedMarks > remainingMarks) {
      this.toast.warning(
        `Selected questions require ${totalSelectedMarks} marks but only ${remainingMarks} marks available.`
      );
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
    if (this.editingQuestionType === 'TRUE_FALSE') {
      this.editingOptions = [
        { text: 'True', isCorrect: false },
        { text: 'False', isCorrect: false }
      ];
    } else if (this.editingQuestionType === 'MCQ') {
      if (this.editingOptions.length === 0 || this.editingOptions.every(o => !o.text)) {
        this.editingOptions = [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ];
      } else {
        while (this.editingOptions.length < 4) {
          this.editingOptions.push({ text: '', isCorrect: false });
        }
      }
    } else if (this.editingQuestionType === 'MULTIPLE_ANSWER') {
      if (this.editingOptions.length === 0 || this.editingOptions.every(o => !o.text)) {
        this.editingOptions = [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ];
      } else {
        while (this.editingOptions.length < 4) {
          this.editingOptions.push({ text: '', isCorrect: false });
        }
      }
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

  toggleEditMultipleAnswerOption(index: number) {
    this.editingOptions[index].isCorrect = !this.editingOptions[index].isCorrect;
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
    if (this.editingQuestionType !== 'TRUE_FALSE') {
      this.editingOptions.push({ text: '', isCorrect: false });
    }
  }

  removeEditOption(index: number) {
    if (this.editingQuestionType === 'TRUE_FALSE') {
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
    if (event.key === 'ArrowDown') {
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
    // Check if marks limit is reached
    if (this.isMarksLimitReached()) {
      this.toast.warning('Cannot add more questions. Marks limit reached!');
      return;
    }

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

    // Check if question marks fit within remaining marks
    const questionMarks = this.newQuestion.marks || 10;
    const remainingMarks = this.getRemainingMarks();
    
    if (questionMarks > remainingMarks) {
      this.toast.warning(
        `⚠️ Cannot add question!<br><br>` +
        `Question requires <strong>${questionMarks}</strong> marks but only <strong>${remainingMarks}</strong> marks available.<br><br>` +
        `Please reduce the marks or delete some questions.`
      );
      return;
    }

    this.loading = true;
    
    const questionData = {
      questionText: this.newQuestion.questionText,
      questionType: this.questionType,
      marks: questionMarks,
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
    this.editingQuestionType = question.questionType || 'MCQ';
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
    this.editingQuestionType = 'MCQ';
    this.editingOptions = [];
    this.editMessage = '';
    this.editIsError = false;
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

    if (this.editingQuestionType === 'MCQ') {
      const correctCount = this.editingOptions.filter(opt => opt.isCorrect).length;
      if (correctCount > 1) {
        this.toast.warning('Single Answer questions can only have ONE correct option');
        return;
      }
    }

    this.editLoading = true;
    
    const updateData = {
      questionText: this.editingQuestion.questionText.trim(),
      questionType: this.editingQuestionType,
      marks: this.editingQuestion.marks || 10,
      options: this.editingOptions.map((opt: { text: string; isCorrect: boolean }, idx: number) => ({
        optionText: opt.text.trim(),
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

  // ============================================================
  // ========== CSV UPLOAD ==========
  // ============================================================

  downloadCSVTemplate() {
    const template = `Question,Type,Option A,Option B,Option C,Option D,Correct,Marks
"What is 2+2?","MCQ","3","4","5","6","B","10"
"Angular is a framework.","TRUE_FALSE","True","False","","","A","5"
"Which are programming languages?","MULTIPLE_ANSWER","JavaScript","HTML","Python","CSS","A,C","10"`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    this.toast.success('Template downloaded');
  }

  getCsvTotalMarks(): number {
    return this.csvQuestions.reduce((sum, q) => sum + q.marks, 0);
  }

  getCsvOptionsCount(question: any): number {
    return question.options ? question.options.length : 0;
  }

  getCsvCorrectCount(question: any): number {
    return question.options ? question.options.filter((o: any) => o.isCorrect).length : 0;
  }

  getCsvPreviewQuestions(): any[] {
    return this.csvQuestions.slice(0, 5);
  }

  hasMoreCsvQuestions(): boolean {
    return this.csvQuestions.length > 5;
  }

  getRemainingCsvCount(): number {
    return this.csvQuestions.length - 5;
  }

  uploadCSV(event: any) {
    // Check if marks limit is reached
    if (this.isMarksLimitReached()) {
      this.toast.warning('Cannot upload more questions. Marks limit reached!');
      event.target.value = '';
      return;
    }

    const file = event.target.files[0];
    if (!file) {
      this.toast.warning('Please select a file');
      return;
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'csv') {
      this.toast.error('Please upload a CSV file');
      event.target.value = '';
      return;
    }

    this.csvProcessing = true;
    this.csvQuestions = [];

    const reader = new FileReader();
    
    reader.onload = (e: any) => {
      try {
        const csvData = e.target.result;
        const parsedQuestions = this.parseCSVQuestions(csvData);
        
        if (parsedQuestions.length === 0) {
          this.toast.warning('No valid questions found in CSV. Please check the format.');
          this.csvProcessing = false;
          event.target.value = '';
          return;
        }

        this.csvQuestions = parsedQuestions;
        this.csvFile = file;
        this.csvProcessing = false;
        
        this.toast.success(`${parsedQuestions.length} questions loaded from CSV`);
        this.showCSVPreviewAndConfirm();
        
      } catch (error) {
        console.error('CSV Parse Error:', error);
        this.toast.error('Failed to parse CSV. Please check the format.');
        this.csvProcessing = false;
        event.target.value = '';
      }
    };

    reader.onerror = () => {
      this.toast.error('Failed to read file');
      this.csvProcessing = false;
      event.target.value = '';
    };

    reader.readAsText(file);
  }

  private parseCSVQuestions(csvData: string): any[] {
    const lines = csvData.split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length < 2) {
      this.toast.warning('CSV file is empty or missing data rows');
      return [];
    }

    const headerLine = lines[0];
    const headers = this.parseCSVLine(headerLine);
    
    const headerMap: { [key: string]: string } = {
      'question': 'question',
      'type': 'type',
      'option a': 'option_a',
      'option b': 'option_b',
      'option c': 'option_c',
      'option d': 'option_d',
      'correct': 'correct',
      'marks': 'marks'
    };

    const colIndex: { [key: string]: number } = {};
    for (const [key, value] of Object.entries(headerMap)) {
      const index = headers.findIndex(h => h.trim().toLowerCase() === key);
      colIndex[value] = index;
    }

    if (colIndex['question'] === -1) {
      this.toast.error(`Could not find "Question" column. Found headers: ${headers.join(', ')}`);
      return [];
    }

    if (colIndex['type'] === -1) {
      this.toast.error(`Could not find "Type" column. Found headers: ${headers.join(', ')}`);
      return [];
    }

    const questions: any[] = [];
    let errorCount = 0;

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i]);
        if (values.every(v => v.trim() === '')) continue;
        
        const question = this.createQuestionFromCSV(colIndex, values, i);
        if (question) {
          questions.push(question);
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`Error parsing line ${i + 1}:`, error);
        errorCount++;
      }
    }

    if (errorCount > 0) {
      this.toast.warning(`${errorCount} row(s) had errors and were skipped.`);
    }

    return questions;
  }

  private parseCSVLine(line: string): string[] {
    if (!line || line.trim() === '') return [];
    
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private createQuestionFromCSV(colIndex: { [key: string]: number }, values: string[], rowIndex: number): any | null {
    const getValue = (key: string): string => {
      const index = colIndex[key];
      return index !== -1 && index < values.length ? values[index]?.trim() || '' : '';
    };

    const questionText = getValue('question');
    const questionType = getValue('type').toUpperCase();
    
    let marks = 10;
    const marksValue = getValue('marks');
    if (marksValue) {
      const parsed = parseInt(marksValue);
      if (!isNaN(parsed)) marks = parsed;
    }
    
    if (!questionText || questionText.length < 3) {
      console.warn(`Row ${rowIndex + 1}: Invalid question text`);
      return null;
    }

    const validTypes = ['MCQ', 'TRUE_FALSE', 'MULTIPLE_ANSWER'];
    if (!validTypes.includes(questionType)) {
      console.warn(`Row ${rowIndex + 1}: Invalid type "${questionType}"`);
      return null;
    }

    const options: any[] = [];
    const optionKeys = ['option_a', 'option_b', 'option_c', 'option_d'];
    
    for (let i = 0; i < optionKeys.length; i++) {
      const optionText = getValue(optionKeys[i]);
      if (optionText && optionText.trim() !== '') {
        options.push({
          optionText: optionText.trim(),
          optionOrder: i + 1,
          isCorrect: false
        });
      }
    }

    if (options.length < 2) {
      console.warn(`Row ${rowIndex + 1}: At least 2 options required`);
      return null;
    }

    if (questionType === 'TRUE_FALSE') {
      if (options.length !== 2 || 
          !['True', 'False'].includes(options[0].optionText) ||
          !['True', 'False'].includes(options[1].optionText)) {
        console.warn(`Row ${rowIndex + 1}: TRUE_FALSE must have 'True' and 'False'`);
        return null;
      }
    }

    const correctStr = getValue('correct').toUpperCase();
    const correctIndices: number[] = [];
    
    if (correctStr) {
      const parts = correctStr.split(',').map(s => s.trim());
      for (const part of parts) {
        const letterIndex = part.charCodeAt(0) - 65;
        if (letterIndex >= 0 && letterIndex < options.length) {
          correctIndices.push(letterIndex + 1);
        }
      }
    }

    if (correctIndices.length === 0) {
      console.warn(`Row ${rowIndex + 1}: No valid correct answers`);
      return null;
    }

    if (questionType === 'MCQ' && correctIndices.length > 1) {
      console.warn(`Row ${rowIndex + 1}: MCQ can only have one correct answer`);
      return null;
    }

    correctIndices.forEach(idx => {
      const optionIndex = idx - 1;
      if (optionIndex >= 0 && optionIndex < options.length) {
        options[optionIndex].isCorrect = true;
      }
    });

    return {
      questionText: questionText.trim(),
      questionType: questionType,
      marks: marks,
      options: options
    };
  }

  showCSVPreviewAndConfirm() {
    const questions = this.csvQuestions;
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    const remainingMarks = this.getRemainingMarks();
    
    // If no remaining marks, show warning
    if (remainingMarks <= 0) {
      this.toast.warning('No marks remaining to add questions!');
      this.csvQuestions = [];
      this.csvFile = null;
      this.resetFileInput();
      return;
    }
    
    // Calculate how many questions can fit if not all
    let marksUsed = 0;
    let questionsFit = questions.length;
    let canAddAll = totalMarks <= remainingMarks;
    
    if (!canAddAll) {
      questionsFit = 0;
      marksUsed = 0;
      for (const q of questions) {
        if (marksUsed + q.marks <= remainingMarks) {
          marksUsed += q.marks;
          questionsFit++;
        } else {
          break;
        }
      }
    }

    this.toast.showCSVPreview(
      questions.length,
      totalMarks,
      remainingMarks,
      questionsFit,
      canAddAll ? totalMarks : marksUsed
    ).then(confirmed => {
      if (confirmed) {
        this.bulkUploadQuestions(questions, canAddAll);
      } else {
        this.csvQuestions = [];
        this.csvFile = null;
        this.resetFileInput();
      }
    });
  }

  private bulkUploadQuestions(questions: any[], addAll: boolean) {
    // Double check marks limit before uploading
    if (this.isMarksLimitReached()) {
      this.toast.warning('Cannot upload more questions. Marks limit reached!');
      this.csvProcessing = false;
      this.loading = false;
      this.csvQuestions = [];
      this.resetFileInput();
      return;
    }

    this.csvProcessing = true;
    this.loading = true;

    let questionsToAdd = questions;
    
    if (!addAll) {
      const remainingMarks = this.getRemainingMarks();
      let marksUsed = 0;
      questionsToAdd = [];
      
      for (const q of questions) {
        if (marksUsed + q.marks <= remainingMarks) {
          questionsToAdd.push(q);
          marksUsed += q.marks;
        } else {
          break;
        }
      }
    }

    if (questionsToAdd.length === 0) {
      this.toast.warning('No questions to add');
      this.csvProcessing = false;
      this.loading = false;
      return;
    }

    this.api.bulkCreateQuestions(this.examId, questionsToAdd).subscribe({
      next: (response: any) => {
        this.toast.success(`${questionsToAdd.length} questions uploaded successfully!`);
        this.csvProcessing = false;
        this.loading = false;
        this.csvQuestions = [];
        this.csvFile = null;
        this.resetFileInput();
        this.loadQuestions();
        this.loadExamDetails();
      },
      error: (err) => {
        this.csvProcessing = false;
        this.loading = false;
        this.toast.error(err.error?.message || 'Failed to upload questions');
        console.error('Bulk upload error:', err);
      }
    });
  }

  resetFileInput() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  getSectionName(sectionId: number): string {
    const section = this.sections.find((s: any) => s.id === sectionId);
    return section ? section.sectionName : '';
  }

  goBack() {
    this.router.navigate(['/admin']);
  }
}