import { Component, HostListener, OnInit } from '@angular/core';
import { TemplateService } from '../../shared/services/template.service';
import { Router } from '@angular/router';
import { AuthenticationService } from '../../shared/services/authentication.service';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';


@Component({
  selector: 'app-template-selection',
  templateUrl: './template-selection.component.html',
  styleUrls: ['./template-selection.component.scss'],
})
export class TemplateSelectionComponent implements OnInit {
  selectFile: any;
  selectedFile: any;
  fileInput: any;
  fileName = '';
  loader: boolean = false;
  userSelectedFile: any;
  userUploadedFileType: any;
  templateLinks: any;
  public downloadTemplates: any = [];
  uploadTemplates: any = [];
  isUserLogin: boolean = false;
  public sortableElement: string = 'Uploads';
  solutiondetails: any = "";
  downloadbleUrl: any = "";
  // customAuth: any = window["env" as any]["customAuth" as any];
  customAuth: any = environment.customAuth;

  constructor(
    private templateService: TemplateService,
    private router: Router,
    private authService: AuthenticationService,
    private toaster: ToastrService
  ) {}

  @HostListener('window:popstate', ['$event'])
  onPopState(event: any) {
    window.location.hash = 'dontgoback';
    this.router.routeReuseStrategy.shouldReuseRoute = function () {
      return false;
    };
    this.router.navigate(['/template/template-selection']);
  }

  ngOnInit(): void {
    history.pushState(null, '', window.location.href);
    this.templateService.selectTemplates().subscribe(
      (resp: any) => {
        this.templateLinks = resp.result.templateLinks;
        resp.result.templateLinks.forEach((data: any) => {
          let templateName: any = data.templateName.split(/(?=[A-Z])/).join(' ');
          let template: any = { name: templateName, templateLink: data.templateLink };
          this.uploadTemplates.push(templateName);
          this.downloadTemplates.push(template);
        });
      },
      (error: any) => {}
    );
    this.isUserLogin = this.authService.isUserLoggedIn();
  }
  
  onCickSelectedSurveyTemplate(selectedTemplate: any) {
    this.selectFile = selectedTemplate;
  }

  onCickSelectedSolutionTemplate(selectedTemplate: any) {
    this.selectedFile = selectedTemplate;
  }

  setSortableElement($event: string) {
    this.sortableElement = $event;
  }

  templateDownload() {
    if (this.selectFile) {
      const url = this.selectFile.templateLink;
      let capturedId = url.match(/\/d\/(.+)\//);
      window.open(`https://docs.google.com/spreadsheets/d/${capturedId[1]}/export?format=xlsx`);
      this.toaster.success('Downloaded successfully');
      this.selectFile = "";
    } else {
      alert("Please select a file to download");
    }
  }

  validateTemplate() {
    this.loader = true;
    if (this.userSelectedFile) {
      this.templateService.uploadTemplates(this.userSelectedFile).subscribe((event: any) => {
        this.templateService.validateTemplates(event.result.templatePath, this.userUploadedFileType, this.templateLinks).subscribe(
          (data) => {
            this.templateService.userSelectedFile = event.result.templatePath;
            this.loader = false;
            this.templateService.templateError = data.result;
            this.router.navigate(['/template/validation-result']);
          },
          (error: any) => {
            this.loader = false;
            this.toaster.error('Error validating template'); // Display error message to user
          }
        );
      });
    } else {
      console.error('No file found');
      this.loader = false;
      this.toaster.error('No file found ', "Please select a file");
      this.router.navigate(['/template/template-selection']);
    }
  }

  validateAndCreateSurvey() {
    this.loader = true;
    if (this.userSelectedFile) {
      this.templateService.uploadTemplates(this.userSelectedFile).subscribe(
        (event: any) => {
          this.templateService.validateTemplates(event.result.templatePath, this.userUploadedFileType, this.templateLinks).subscribe(
            (data) => {
              this.templateService.userSelectedFile = event.result.templatePath;
              this.loader = false;
              if (data.result.advancedErrors.data.length == 0 && data.result.basicErrors.data.length == 0) {
                this.templateService.surveyCreation(this.templateService.userSelectedFile).subscribe(
                  (surveyEvent: any) => {
                    this.solutiondetails = surveyEvent.result[0];
                    this.router.navigate(['/template/template-success', this.solutiondetails.solutionId], {
                      queryParams: {
                        downloadbleUrl: this.solutiondetails.downloadbleUrl
                      }
                    }); // Navigate to success page
                  },
                  (surveyError: any) => {
                    console.error('Error creating survey:', surveyError);
                    this.validateTemplate();
                  }
                );
              } else {
                this.templateService.templateError = data.result;
                this.router.navigate(['/template/validation-result']); // Navigate to validation result page
              }
            },
            (validationError: any) => {
              this.loader = false;
              console.error('Error validating template:', validationError);
              this.toaster.error('Error validating template'); // Display error message to user
            }
          );
        },
        (uploadError: any) => {
          this.loader = false;
          console.error('Error uploading file:', uploadError);
          this.toaster.error('Error uploading file'); // Display error message to user
        }
      );
    } else {
      console.error('No file found');
      this.loader = false;
      this.toaster.error('No file found ', "Please select a file");
      this.router.navigate(['/template/template-selection']);
    }
  }

  fileUpload(fileInput: HTMLInputElement, userUploadedFile: any) {
    this.fileName = '';
    fileInput.click();
    this.userUploadedFileType = userUploadedFile;
  }

  onChange(event: any) {
    this.templateService.templateFile = event.target;
    this.userSelectedFile = event.target.files[0];
  }

  getFileDetails(event: any) {
    this.fileName = event.target.files[0].name;
  }

  handleSurveySolutions(action: 'download' | 'view', file: any) {
    if (file && file.name) {
      this.loader = true;
      let observable$: Observable<any>;
  
      // Determine which service method to call based on the action
      if (action === 'download') {
        observable$ = this.templateService.getSurveySolutions(file.name, 'downloadSolutions');
      } else {
        observable$ = this.templateService.getSurveySolutions(file.name, 'getSolutions');
      }
  
      observable$.subscribe(
        (response: any) => {
          if (action === 'download') {
            if (response.csvFilePath) {
              const csvPath = response.csvFilePath;
              const link = document.createElement('a');
              link.href = csvPath;
              link.download = `${file.name}_solutions.csv`;
              link.click();
              this.toaster.success('Downloaded successfully');
              this.selectedFile = "";
            } else {
              console.error('Invalid response or missing csvFilePath. Full response:', response);
            }
          } else {
            if (response) {
              this.router.navigate(['/template/template-solution-list']).catch(err => {
                console.error('Navigation error:', err);
              });
            } else {
              console.error('Invalid response or missing csvFilePath. Full response:', response);
            }
          }
          this.loader = false;
        },
        (error: any) => {
          console.error(`Error ${action === 'download' ? 'fetching' : 'viewing'} survey solutions:`, error);
          this.loader = false;
        }
      );
    } else {
      alert(`Please select a file to ${action}`);
    }
  }
  
}