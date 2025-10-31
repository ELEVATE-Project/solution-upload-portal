import { Component, OnInit } from '@angular/core';
import { TemplateService } from '../../shared/services/template.service';
import { Router } from '@angular/router';
import { AuthenticationService } from '../../shared/services/authentication.service';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

interface Template {
  name: string;
  templateLink?: string;
}

@Component({
  selector: 'app-template-selection',
  templateUrl: './template-selection.component.html',
  styleUrls: ['./template-selection.component.scss'],
})
export class TemplateSelectionComponent implements OnInit {
  selectFile: Template | null = null;
  selectedFile: Template | null = null;
  fileName = '';
  loader = false;
  loadingMessage = '';
  userSelectedFile: File | null = null;
  userUploadedFileType: string = '';
  templateLinks: any;
  downloadTemplates: Template[] = [];
  uploadTemplates: string[] = [];
  isUserLogin = false;
  customAuth: boolean = environment.customAuth;

  /** Tenant & Org Selection */
  userRole: 'super_admin' | 'tenant_admin' | 'org_admin' = 'super_admin';
  selectedTenant: string = '';
  selectedOrg: string = '';

  tenants = [
    { id: 'tenant1', name: 'Tenant 1' },
    { id: 'tenant2', name: 'Tenant 2' },
    { id: 'tenant3', name: 'Tenant 3' },
  ];

  orgs = [
    { id: 'org1', name: 'Org 1' },
    { id: 'org2', name: 'Org 2' },
    { id: 'org3', name: 'Org 3' },
  ];

  constructor(
    private templateService: TemplateService,
    private router: Router,
    private authService: AuthenticationService,
    private toaster: ToastrService
  ) {}

  ngOnInit(): void {
    this.isUserLogin = this.authService.isUserLoggedIn();
    this.loadTemplates();

    /** Hardcode roles for testing */
    this.userRole = 'super_admin';
  }

  /** -------------------------------
   * Template Service Logic
   * ------------------------------- */
  loadTemplates() {
    this.templateService.selectTemplates().subscribe(
      (resp: any) => {
        this.templateLinks = resp.result.templateLinks;
        resp.result.templateLinks.forEach((data: any) => {
          const templateName = data.templateName.replace(/([A-Z])/g, ' $1').trim();
          this.uploadTemplates.push(templateName);
          this.downloadTemplates.push({ name: templateName, templateLink: data.templateLink });
        });
      },
      (error) => console.error('Error loading templates:', error)
    );
  }

  onCickSelectedSurveyTemplate(template: Template) {
    this.selectFile = template;
  }
  
  onCickSelectedSolutionTemplate(template: Template) {
    this.selectedFile = template;
  }

  /** -------------------------------
   * Tenant & Org Logic
   * ------------------------------- */
  onTenantChange(selectedTenantId: string) {
    this.selectedTenant = selectedTenantId;
  }

  onOrgChange(selectedOrgId: string) {
    this.selectedOrg = selectedOrgId;
  }

  onSaveTenantOrgSelection() {
    if (this.userRole === 'super_admin' && !this.selectedTenant) {
      this.toaster.warning('Please select a tenant');
      return;
    }

    if ((this.userRole === 'super_admin' || this.userRole === 'tenant_admin') && !this.selectedOrg) {
      this.toaster.warning('Please select an organization');
      return;
    }

    this.toaster.success('Tenant & Org selection saved successfully!');
    console.log('Tenant & Org saved:', { tenant: this.selectedTenant, org: this.selectedOrg, role: this.userRole });
  }

  /** -------------------------------
   * Template Download Logic
   * ------------------------------- */
  templateDownload() {
    if (!this.selectFile?.templateLink) {
      this.toaster.warning('Please select a template to download');
      return;
    }
    const url = this.selectFile.templateLink;
    const capturedId = url.match(/\/d\/(.+)\//);
    if (capturedId && capturedId[1]) {
      window.open(`https://docs.google.com/spreadsheets/d/${capturedId[1]}/export?format=xlsx`);
      this.toaster.success('Downloaded successfully');
    } else {
      this.toaster.error('Invalid template link');
    }
  }

  /** -------------------------------
   * File Upload Logic
   * ------------------------------- */
  fileUpload(fileInput: HTMLInputElement, userUploadedFileType: string) {
    this.userUploadedFileType = userUploadedFileType;
    fileInput.click();
  }

  getFileDetails(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.userSelectedFile = file;
      this.fileName = file.name;
    }
  }

  validateTemplate() {
    if (!this.userSelectedFile) {
      this.toaster.error('No file selected');
      return;
    }
    this.loader = true;
    this.templateService.uploadTemplates(this.userSelectedFile).subscribe(
      (uploadResp: any) => {
        this.templateService
          .validateTemplates(uploadResp.result.templatePath, this.userUploadedFileType, this.templateLinks)
          .subscribe(
            (validationResp: any) => {
              this.loader = false;
              this.templateService.templateError = validationResp.result;
              this.templateService.userSelectedFile = uploadResp.result.templatePath;
              this.router.navigate(['/template/validation-result']);
            },
            () => {
              this.loader = false;
              this.toaster.error('Error validating template');
            }
          );
      },
      () => {
        this.loader = false;
        this.toaster.error('Error uploading file');
      }
    );
  }

  validateAndCreateSurvey() {
    if (!this.userSelectedFile) {
      this.toaster.error('No file selected');
      return;
    }
    this.loader = true;
    this.loadingMessage = 'Solution creation in progress. Please wait...';

    this.templateService.uploadTemplates(this.userSelectedFile).subscribe(
      (uploadResp: any) => {
        this.templateService
          .validateTemplates(uploadResp.result.templatePath, this.userUploadedFileType, this.templateLinks)
          .subscribe(
            (validationResp: any) => {
              const errors = validationResp.result;
              if (errors.basicErrors?.data.length === 0 && errors.advancedErrors?.data.length === 0) {
                this.templateService.surveyCreation(uploadResp.result.templatePath).subscribe(
                  (surveyResp: any) => {
                    const solutionDict = surveyResp.result.solutionId.solutionDict;
                    const programName = surveyResp.result.solutionId.programName;
                    if (solutionDict) {
                      this.loader = false;
                      this.router.navigate(['/template/template-success'], {
                        queryParams: { solution: JSON.stringify(solutionDict), program: programName },
                      });
                    } else {
                      this.loader = false;
                      this.toaster.error('Solution creation failed');
                    }
                  },
                  () => {
                    this.loader = false;
                    this.toaster.error('Error creating solution');
                  }
                );
              } else {
                this.loader = false;
                this.templateService.templateError = errors;
                this.router.navigate(['/template/validation-result']);
              }
            },
            () => {
              this.loader = false;
              this.toaster.error('Error validating template');
            }
          );
      },
      () => {
        this.loader = false;
        this.toaster.error('Error uploading file');
      }
    );
  }

  /** -------------------------------
   * Handle Survey Solutions
   * ------------------------------- */
  handleSurveySolutions(action: 'download' | 'view', file: Template | null) {
    if (!file) {
      this.toaster.warning(`Please select a file to ${action}`);
      return;
    }

    this.loader = true;
    let type = 'defaultType';
    const name = file.name.trim();

    switch (name) {
      case 'projects Template':
        type = 'improvementProject';
        break;
      case 'survey Template':
        type = 'survey';
        break;
      case 'observation Template':
        type = 'observation without rubrics';
        break;
      case 'observation With Rubrics Template':
        type = 'observation with rubrics';
        break;
    }

    const obs$: Observable<any> =
      action === 'download'
        ? this.templateService.getSurveySolutions(type, 'downloadSolutions')
        : this.templateService.getSurveySolutions(type, 'getSolutions');

    obs$.subscribe(
      (resp: any) => {
        if (action === 'download' && resp.csvFilePath) {
          const link = document.createElement('a');
          link.href = resp.csvFilePath;
          link.download = `${file.name}_solutions.csv`;
          link.click();
          this.toaster.success('Downloaded successfully');
        } else if (action === 'view') {
          this.router.navigate(['/template/template-solution-list'], { queryParams: { fileName: type } });
        }
        this.loader = false;
      },
      () => {
        this.loader = false;
        this.toaster.error(`Error ${action === 'download' ? 'downloading' : 'viewing'} survey solutions`);
      }
    );
  }

  /** -------------------------------
   * Logout
   * ------------------------------- */
  onLogout() {
    this.authService.logoutAccount();
    this.router.navigate(['/auth/login']);
  }
}
