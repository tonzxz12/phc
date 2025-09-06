import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  public isLoading: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  loaderMessage:string | null | undefined;

  setLoaderMessage(message:string | null | undefined) {
    this.loaderMessage = message;
  }

  show(): void {
    this.isLoading.next(true);
  }

  hide():void{
    this.isLoading.next(false);
  }
  
}
