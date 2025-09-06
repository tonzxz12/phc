import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { CardComponent } from '@swimlane/ngx-charts';
import { firstValueFrom } from 'rxjs';
import { APIService } from 'src/app/services/API/api.service';

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | null;
type Page = 'Browse' | 'Flashcards';

interface PageConfig{
  header:string;
  description:string;
}
interface FlashCard {
  back:string;
  front:string;
  show?:boolean;
}

interface Course {
  firstname: string;
  lastname: string;
  profile: string;
  language: string;
  id: string;
  teacherid: string;
  languageid: string;
  course: string;
  difficulty: string;
  details: string;
  filter: string;
  image: string;
  objectives: string;
  target_audience: string;
  technical_requirements: string;
  lessoncount: string;
  complexity: number;
  enrolled: number;
  job?:string;
}

@Component({
  selector: 'app-flashcards',
  templateUrl: './flashcards.component.html',
  styleUrl: './flashcards.component.css'
})
export class FlashcardsComponent implements OnInit {
  selectedDifficulty:Difficulty = null;
  difficulties:Difficulty[]= ['Beginner','Intermediate','Advanced']
  showDropdown:boolean = false
  courses:Course[] = [];

  currentPage:Page = 'Browse';

  pages: {[key:string]:PageConfig} = {
    'Browse': {
      header:'Course Flashcards',
      description: 'Explore our most effective flashcard sets designed to help you master your courses better.'
    },
    'Flashcards': {
      header:'',
      description: ''
    }
  }

  constructor(private API:APIService){}
  
  ngOnInit(): void {
    this.getCourses();  
  }
 
  selectDifficulty(difficulty: Difficulty){
    this.selectedDifficulty = difficulty;
    this.showDropdown = false;
  }
  async getCourses() {
    this.API.showLoader();
    this.API.setLoaderMessage('Preparing your courses!');
    const data = await firstValueFrom(this.API.getCourses())
    try{
      const courses = []
      for (let course of data.output as Course[]) {
        var _course = course;
        if (_course.complexity == null) {
          _course.complexity = 1;
        }
        _course.enrolled = Number(course.enrolled)
        courses.push(_course);
      }
      this.courses = courses;
    }catch(e){
      this.API.failedSnackbar('Error loading courses, Please try again later');
    }
    this.API.hideLoader();
  }
  
  filteredCourses():Course[]{
    if(this.selectedDifficulty){
      return this.courses.filter(c=> this.difficulties[Number(c.difficulty)] == this.selectedDifficulty )
    }else{
      return this.courses;
    }
  }
  

  selectedCourse:Course | null = null;
  flashcards:FlashCard[] = []
    async openFlashCards(course:Course){
    this.API.showLoader();
    this.selectedCourse = course;

    const prompt = `
      Generate 30 flashcards relevant to the course described below. The flashcards should cover key topics, terms, and concepts that are likely included in the course. Avoid questions about the course description itself or its goals. Instead, focus on the content, such as definitions, processes, theories, or other topics that would be covered in the course.
      Title: ${course.course}
      Description: ${course.details}
      
      Strictly respond in proper JSON format, with an array of flashcards containing 'front' and 'back' keys. Each flashcard should present a concept or topic that would be studied in the course.
    `;
  
    
    this.API.setLoaderMessage( '🃏 Preparing your flashcards! 🃏');
    
    try{
      const response =  await this.API.generateContent(prompt)
      this.flashcards = JSON.parse(response);
      console.log(this.flashcards);
      this.pages['Flashcards'].header = `${course.course} Flashcards`
      this.pages['Flashcards'].description = `${course.details}`
      this.currentPage = 'Flashcards';
    }catch(e){
      console.error(e)
      this.API.failedSnackbar('Sorry had some trouble getting your flashcards! Please try again.');
      this.selectedCourse = null;
    }
    this.API.hideLoader();
  }

  closeFlashCards(){
    this.selectedCourse = null;
    this.currentPage = 'Browse';
  }
  
  currentFlashcardIndex:number = 0;
  slideAnimation:string = 'animate-fadeinleft'
  
  nextFlashcard(){
    if(this.currentFlashcardIndex < this.flashcards.length-1){
      this.flashcards[this.currentFlashcardIndex].show = false;
      this.slideAnimation = 'animate-fadeinleft';
      this.currentFlashcardIndex++;
    }
  }

  previousFlashcard(){
    if(this.currentFlashcardIndex > 0){
      this.flashcards[this.currentFlashcardIndex].show = false;
      this.slideAnimation = 'animate-fadeinright';
      this.currentFlashcardIndex--;
    }
  }

  flipCard(){
    this.flashcards[this.currentFlashcardIndex].show = !this.flashcards[this.currentFlashcardIndex].show;
  }


  getUrl(file: string) {
    return this.API.getURL(file) ?? this.API.noProfile();
  }

}
