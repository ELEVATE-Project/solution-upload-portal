import { AfterViewInit, Component, ViewChild, OnInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { TemplateService } from '../../shared/services/template.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-template-solution-list',
  templateUrl: './template-solution-list.component.html',
  styleUrls: ['./template-solution-list.component.css']
})
export class TemplateSolutionListComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = [];
  dataSource = new MatTableDataSource<any>([]);
  selectedTemplateType: string = '';
  fileName: any = ""

  // Configuration object for different templates
  templateConfigurations: { [key: string]: string[] } = {
    'survey': ['Program', 'SolutionName', 'startDate', 'endDate'],
    'improvementProject': ['Program', 'SolutionName', 'startDate', 'endDate'],
    'observation without rubrics': ['Program', 'SolutionName', 'startDate', 'endDate'],
    'observation with rubrics': ['Program', 'SolutionName', 'startDate', 'endDate']
  };

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private templateService: TemplateService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private location: Location
  ) {
  }

  ngOnInit(): void {
    this.route.queryParams
      .subscribe(params => {
        this.fileName = params['fileName'];
        console.log(this.fileName,"line no 40")
      });
    this.selectedTemplateType = this.getTemplateType(this.fileName);
    this.displayedColumns = this.templateConfigurations[this.selectedTemplateType] || [];
    this.loadSolutions();
  }
  

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  loadSolutions(): void {
    const resourceType = this.getResourceType(this.fileName);
    const extension = this.getExtension(this.fileName);
    console.log(resourceType, "line no 46");
    console.log(extension, "line no 47");
  
    this.templateService.getSurveySolutions(resourceType, extension).subscribe(
      (response: any) => {
        console.log(response, "Line no 60");
        console.log(resourceType,"line 61");
        
        // Check for a successful response
        if (response.status === 200 && response.code === 'Success') {
          
          // For 'Survey' template
          if (this.selectedTemplateType == 'survey') {
            this.dataSource.data = response.csvPath.map((item: any) => {
              return {
              Program: item.PROGRAM_NAME,
              solutionName: item.SOLUTION_NAME,
              startDate: item.START_DATE,
              endDate: item.END_DATE
              };
            });
            console.log(this.dataSource.data);
          
          // For 'Projects Template'
          } else if (this.selectedTemplateType == 'improvementProject') {
            console.log(response, "line no 73, in projects");
            
            // Corrected return structure
            this.dataSource.data = response.csvPath.map((item: any) => {
              return {
                Program: item.PROGRAM_NAME,
                SolutionName: item.SOLUTION_NAME,
                startDate: item.START_DATE,
                endDate: item.END_DATE
              };
            });
            console.log(this.dataSource.data,"line no 89");
          }
          else if (this.selectedTemplateType == 'observation without rubrics') {
            console.log(response, "line no 73, in projects");
            
            // Corrected return structure
            this.dataSource.data = response.csvPath.map((item: any) => {
              return {
                Program: item.PROGRAM_NAME,
                SolutionName: item.SOLUTION_NAME,
                startDate: item.START_DATE,
                endDate: item.END_DATE
              };
            });
            console.log(this.dataSource.data,"line no 89");
          }
          else if (this.selectedTemplateType == 'observation with rubrics') {
            console.log(response, "line no 73, in projects");
            
            // Corrected return structure
            this.dataSource.data = response.csvPath.map((item: any) => {
              return {
                Program: item.PROGRAM_NAME,
                SolutionName: item.SOLUTION_NAME,
                startDate: item.START_DATE,
                endDate: item.END_DATE
              };
            });
            console.log(this.dataSource.data,"line no 89");
          }
        } else {
          this.toastr.error('Failed to load solutions');
        }
      },
      (error: any) => {
        console.error('Error fetching solutions:', error);
        this.toastr.error('An error occurred while fetching solutions');
      }
    );
  }
  

  copyLink(element: any): void {
    console.log(element,"solutionid")
    const baseUrl = this.templateService.getEnvironmentUrl(); // Fetch the base URL from the service
    const deepLink = `${baseUrl}${element || element.observationId}`;
    navigator.clipboard.writeText(deepLink).then(
      () => this.toastr.success('Link copied to clipboard!'),
      () => this.toastr.error('Failed to copy link')
    );
  }

  getTemplateType(templateType: string): string {
    // Implement logic to determine the selected template type
    switch (templateType) {
      case 'survey': return 'survey';
      case 'improvementProject': return 'improvementProject';
      case 'observation without rubrics': return 'observation without rubrics';
      case 'observation with rubrics': return 'observation with rubrics';
      default: return 'unknown';
    } // Example return value, replace with actual logic
  }

  getResourceType(templateType: string): string {
    console.log(templateType,"line no 99");
    
    switch (templateType) {
      case 'survey': return 'survey';
      case 'improvementProject': return 'improvementProject';
      case 'observation without rubrics': return 'observation without rubrics';
      case 'observation with rubrics': return 'observation with rubrics';
      default: return 'unknown';
    }
  }

  getExtension(templateType: string): string {
    console.log(templateType,"line no 115");
    
    switch (templateType) {
      case 'survey': return 'getSolutions';
      case 'improvementProject': return 'getSolutions';
      case 'observation without rubrics': return 'getSolutions';
      case 'observation with rubrics': return 'getSolutions';
      default: return 'default-extension';
    }
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
  goBack() {
    this.location.back();
  }
}
