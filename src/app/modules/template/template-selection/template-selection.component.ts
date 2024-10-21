import { Component, HostListener, OnInit } from '@angular/core';
import { TemplateService } from '../../shared/services/template.service';
import { Router } from '@angular/router'; // Updated to use Router instead of ActivatedRoute for navigation
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
  loadingMessage: string = '';
  userSelectedFile: any;
  userUploadedFileType: any;
  templateLinks: any;
  public downloadTemplates: any = [];
  uploadTemplates: any = [];
  isUserLogin: boolean = false;
  public sortableElement: string = 'Uploads';
  solutiondetails: any = "";
  downloadbleUrl: any = "";
  customAuth: any = environment.customAuth;
  constructor(
    private templateService: TemplateService,
    private router: Router, // Corrected to use Router for navigation
    private authService: AuthenticationService,
    private toaster: ToastrService
  ) {}
  @HostListener('window:popstate', ['$event'])
  onPopState(event: any) {
    this.router.navigate(['/template/template-selection']); // Updated popstate logic
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
            this.router.navigate(['/template/validation-result']); // Navigate using Router
          },
          (error: any) => {
            this.loader = false;
            this.toaster.error('Error validating template');
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
    this.loadingMessage = 'Solution creation is in progress. Please wait...';
    
    if (this.userSelectedFile) {
        // Step 1: Upload the selected file
        this.templateService.uploadTemplates(this.userSelectedFile).subscribe(
            (event: any) => {
                // Step 2: Validate the uploaded template
                this.templateService.validateTemplates(event.result.templatePath, this.userUploadedFileType, this.templateLinks).subscribe(
                    (data) => {
                        this.templateService.userSelectedFile = event.result.templatePath;
                        
                        // Step 3: Check for errors
                        if (data.result.advancedErrors.data.length === 0 && data.result.basicErrors.data.length === 0) {
                            // Step 4: Proceed to survey creation
                            this.templateService.surveyCreation(this.templateService.userSelectedFile).subscribe(
                                (surveyEvent: any) => {
                                    const solutionId: any = surveyEvent.result.solutionId; // Get solutionId
                                    // console.log(solutionId, "line 113");

                                    // Step 5: Extract programName and solutionDict
                                    const programName: string = solutionId.programName; // Extract the programName directly
                                    // console.log(programName, "line 116");

                                    const solutionDict: any = solutionId.solutionDict; // Extract the solutionDict
                                    // console.log(solutionDict, "line 118");

                                    // Step 6: Check if solutionDict is valid and navigate
                                    if (solutionDict && typeof solutionDict === 'object') {
                                        // console.log(solutionDict, "113");
                                        this.loader = false;

                                        // Navigate with solutionDict and programName in queryParams
                                        this.router.navigate(['/template/template-success'], {
                                            queryParams: { 
                                                solution: JSON.stringify(solutionDict), // Pass only solutionDict
                                                program: programName // Include programName in the queryParams
                                            }
                                        });
                                    } else {
                                        this.loader = false;
                                        this.loadingMessage = 'Error: Solution creation failed. Please try again.';
                                        this.toaster.error('Solution creation failed.');
                                    }
                                },
                                (surveyError: any) => {
                                    // Handle survey creation error
                                    this.loader = false;
                                    this.loadingMessage = 'Error creating survey. Please try again.';
                                    this.toaster.error('Error creating survey');
                                }
                            );
                        } else {
                            // Step 7: Handle validation errors
                            this.templateService.templateError = data.result;
                            this.loader = false;
                            this.router.navigate(['/template/validation-result']);
                        }
                    },
                    (validationError: any) => {
                        // Handle validation error
                        this.loader = false;
                        this.toaster.error('Error validating template');
                    }
                );
            },
            (uploadError: any) => {
                // Handle upload error
                this.loader = false;
                this.toaster.error('Error uploading file');
            }
        );
    } else {
        // Handle case where no file is selected
        this.loader = false;
        this.toaster.error('No file found. Please select a file.');
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
    console.log('Action:', action, 'File:', file);
    console.log(file)
    if (file && file.name) {
      console.log(file.name,"line 199")
      this.loader = true;
      let observable$: Observable<any>;
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
              console.error('Invalid response or missing csvFilePath.');
            }
          } else {
            this.router.navigate([`/template/template-solution-list`], { queryParams: { fileName: file.name } })
              .catch(err => {
                console.error('Navigation error:', err);
              });
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
  onLogout() {
    this.authService.logoutAccount();
    this.router.navigate(['/auth/login']); // Navigate using Router
  }
}