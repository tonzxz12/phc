import { Component, OnInit } from '@angular/core';
import { LoaderService } from 'src/app/services/API/services-includes/loader.service';
import { environment } from 'src/environments/environment';



@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.css']
})
export class LoaderComponent implements OnInit {
  loading: boolean = false;

  environment = environment;

  constructor(private loaderService: LoaderService) {}

  getLoaderMessage(){
    return this.loaderService.loaderMessage
  }
  ngOnInit(): void {
    this.loaderService.isLoading.subscribe((status: boolean) => {
      this.loading = status;
    });
  }
}
