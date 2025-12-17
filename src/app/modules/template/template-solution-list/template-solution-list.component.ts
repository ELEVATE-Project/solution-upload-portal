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
  selectedOrg: string | null = null;
  selectedTenant: string | null = null;


  // Configuration object for different templates
  templateConfigurations: { [key: string]: string[] } = {
    'survey': ['Program', 'SolutionName', 'startDate', 'endDate', 'orgId', 'tenantId','deeplink'],
    'improvementProject': ['Program', 'SolutionName', 'startDate', 'endDate','orgId', 'tenantId', 'deeplink'],
    'observation without rubrics': ['Program', 'SolutionName', 'startDate', 'endDate','orgId', 'tenantId', 'deeplink'],
    'observation with rubrics': ['Program', 'SolutionName', 'startDate', 'endDate','orgId', 'tenantId', 'deeplink']
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
        this.selectedOrg = params['selectedOrg'];
        this.selectedTenant = params['selectedTenant'];
        console.log(this.fileName,this.selectedOrg,this.selectedTenant,"line no 40")
      });
    this.selectedTemplateType = this.getTemplateType(this.fileName);
    this.displayedColumns = this.templateConfigurations[this.selectedTemplateType] || [];
    this.loadSolutions();
  }
  

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  downloadSolutions(): void {
    if (!this.dataSource || this.dataSource.filteredData.length === 0) {
      this.toastr.error('No data available to download');
      return;
    }

    const dataToExport = this.dataSource.filteredData;

    // Use displayed columns but exclude deeplink action column
    const columnsToExport = this.displayedColumns.filter(
      col => col !== 'deeplink'
    );

    // Build CSV header
    const header = columnsToExport.join(',');

    // Build CSV rows
    const rows = dataToExport.map(row =>
      columnsToExport
        .map(col => {
          const value = row[col] ?? '';
          // Escape commas & quotes
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    const csvContent = [header, ...rows].join('\n');

    // Create blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);

    // File name
    const fileName = `${this.selectedTemplateType}_solutions_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    this.toastr.success('Solutions downloaded successfully');
  }


  // loadSolutions(): void {
  //   const resourceType = this.getResourceType(this.fileName);
  //   const extension = this.getExtension(this.fileName);
  
  //   this.templateService.getSurveySolutions(resourceType, extension, this.selectedOrg, this.selectedTenant).subscribe(
  //     (response: any) => {
  //       if (response.status === 200 && response.code === 'Success') {
  //         // Determine base URL once
  //         const baseurl = this.templateService.getBaseURL();
  
  //         // Map response data into the table structure
  //         this.dataSource.data = response.csvPath.map((item: any) => {
  //           // Determine `crationtype` based on resourceType
  //           let crationtype = '';
  //           if (resourceType === 'improvementProject') {
  //             crationtype = 'manage-learn/create-project/';
  //           } else if (resourceType === 'survey') {
  //             crationtype = 'manage-learn/take-survey/';
  //           } else if (
  //             resourceType === 'observation without rubrics') {
  //             crationtype = 'manage-learn/create-observation/';
  //           } else if (resourceType === 'observation with rubrics'){
  //             crationtype = 'manage-learn/create-observation/';
  //           }
  //           // Construct deeplink
  //           const deeplink = `${baseurl}${crationtype}${item.Link || ''}`;
  //           // Return the row object
  //           return {
  //             Program: item.PROGRAM_NAME,
  //             SolutionName: item.SOLUTION_NAME,
  //             startDate: item.START_DATE,
  //             endDate: item.END_DATE,
  //             orgId: item.ORGID,
  //             tenantId: item.TENANTID,
  //             deeplink: deeplink
  //           };
  //         });
  
  //         console.log(this.dataSource.data, 'Processed table data');
  //       } else {
  //         this.toastr.error('Failed to load solutions');
  //       }
  //     },
  //     (error: any) => {
  //       console.error('Error fetching solutions:', error);
  //       this.toastr.error('An error occurred while fetching solutions');
  //     }
  //   );
  // }
  loadSolutions(): void {
    const resourceType = this.getResourceType(this.fileName);
    const extension = this.getExtension(this.fileName);

    const orgId = this.selectedOrg ?? '';
    const tenantId = this.selectedTenant ?? '';

    this.templateService
      .getSurveySolutions(resourceType, extension, orgId, tenantId)
      .subscribe(
        (response: any) => {
          if (response.status === 200 && response.code === 'Success') {
            const baseurl = this.templateService.getBaseURL();

            this.dataSource.data = response.csvPath.map((item: any) => {
              let crationtype = '';

              if (resourceType === 'improvementProject') {
                crationtype = 'manage-learn/create-project/';
              } else if (resourceType === 'survey') {
                crationtype = 'manage-learn/take-survey/';
              } else {
                crationtype = 'manage-learn/create-observation/';
              }

              return {
                Program: item.PROGRAM_NAME,
                SolutionName: item.SOLUTION_NAME,
                startDate: item.START_DATE,
                endDate: item.END_DATE,
                orgId: item.ORGID,
                tenantId: item.TENANTID,
                deeplink: `${baseurl}${crationtype}${item.Link || ''}`
              };
            });
          } else {
            this.toastr.error('Failed to load solutions');
          }
        },
        () => this.toastr.error('An error occurred while fetching solutions')
      );
  }

  // Copy Deeplink Method
  copyLink(deeplink: string): void {
    if (!deeplink) {
      this.toastr.error('Deeplink is missing');
      return;
    }
    console.log('Deeplink to copy:', deeplink); // Debugging the deeplink
    navigator.clipboard.writeText(deeplink).then(
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
