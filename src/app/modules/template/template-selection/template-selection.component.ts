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

interface Tenant {
  id: string;
  name: string;
}

interface Org {
  id: string;
  name: string;
}

interface TenantOrgContextResponse {
  result: {
    userRole: 'tenant_admin' | 'org_admin';
    tenants: Array<Tenant | string>;
    orgs: Array<Org | string>;
    selectedTenantId: string;
    selectedOrgId?: string;
  };
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
  userRole: 'tenant_admin' | 'org_admin' = 'tenant_admin';
  selectedTenant: string = '';
  selectedOrg: string = '';

  tenants: Tenant[] = [];
  orgs: Org[] = [];

  /** To track original/default org from API so we know when it changes */
  private initialSelectedOrg: string = '';

  constructor(
    private templateService: TemplateService,
    private router: Router,
    private authService: AuthenticationService,
    private toaster: ToastrService
  ) {}

  ngOnInit(): void {
    this.isUserLogin = this.authService.isUserLoggedIn();
    this.loadTemplates();

    // Load tenant/org context from backend using the token
    this.loadTenantOrgContext();
  }

  /** -------------------------------
   * Template Service Logic
   * ------------------------------- */
  loadTemplates() {
    this.templateService.selectTemplates().subscribe(
      (resp: any) => {
        const links = resp?.result?.templateLinks ?? [];
        this.templateLinks = links;
        links.forEach((data: any) => {
          const templateName = (data.templateName || '').replace(/([A-Z])/g, ' $1').trim();
          this.uploadTemplates.push(templateName);
          this.downloadTemplates.push({ name: templateName, templateLink: data.templateLink });
        });
      },
      (error) => console.error('Error loading templates:', error)
    );
  }

  /** -------------------------------
   * Load Tenant & Org Context
   * ------------------------------- */

  getUserToken(): string {
    return localStorage.getItem('accToken') || '';
  }

  loadTenantOrgContext() {
    const USER_TOKEN = this.getUserToken();

    if (!USER_TOKEN) {
      this.toaster.error('User token missing. Please login again.');
        return;
      }
      
    this.templateService.getTenantOrgContextWithToken(USER_TOKEN).subscribe(
      (resp: TenantOrgContextResponse) => {
        const data = resp?.result;
        if (!data) {
          this.toaster.error('Invalid tenant/org response');
          return;
        }

        this.userRole = data.userRole ?? 'tenant_admin';

        // Normalize tenants
        this.tenants = (data.tenants || []).map((t) =>
          typeof t === 'string'
            ? { id: t, name: t }
            : {
                id: (t as any).id?.toString() ?? (t as any).code ?? (t as any).id,
                name: (t as any).name ?? (t as any).label ?? (t as any).code ?? '',
              }
        );

        // Normalize orgs
        this.orgs = (data.orgs || []).map((o) =>
          typeof o === 'string'
            ? { id: o, name: o }
            : {
                id: (o as any).id?.toString() ?? (o as any).code ?? (o as any).id,
                name: (o as any).name ?? (o as any).label ?? (o as any).code ?? '',
              }
        );

        // Defaults from API
        this.selectedTenant = data.selectedTenantId ?? (this.tenants[0]?.id ?? '');
        this.selectedOrg = data.selectedOrgId ?? (this.orgs[0]?.id ?? '');

        // Store the original org to compare later for enabling/disabling Save button
        this.initialSelectedOrg = this.selectedOrg;

        console.log('Tenant/Org Context:', {
          userRole: this.userRole,
          tenants: this.tenants,
          orgs: this.orgs,
          selectedTenant: this.selectedTenant,
          selectedOrg: this.selectedOrg,
        });
      },
      (error) => {
        console.error('Error loading tenant/org context:', error);
        this.toaster.error('Unable to load tenant & organization details');
      }
    );
  }

  onClickSelectedSurveyTemplate(template: Template) {
    this.selectFile = template;
  }

  onClickSelectedSolutionTemplate(template: Template) {
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
    // No need to do anything else; isSaveDisabled getter will react automatically
  }

  /** Computed flag for Save button disable state */
  get isSaveDisabled(): boolean {
    // org_admin: Save should always be disabled
    if (this.userRole === 'org_admin') {
      return true;
    }

    // For tenant_admin:
    // - If only one org -> nothing to change -> disabled
    if (this.orgs.length <= 1) {
      return true;
    }

    // - Enable only when current selectedOrg differs from default org from API
    return this.selectedOrg === this.initialSelectedOrg;
  }

  onSaveTenantOrgSelection() {
    // org_admin should not save anything (also protected by isSaveDisabled)
    if (this.userRole === 'org_admin') {
      this.toaster.warning('You are not allowed to change tenant or organization');
      return;
    }

    if (this.userRole === 'tenant_admin' && !this.selectedOrg) {
      this.toaster.warning('Please select an organization');
      return;
    }

    this.toaster.success('Org selection saved successfully!');
    console.log('Org saved:', {
      tenant: this.selectedTenant,
      org: this.selectedOrg,
      role: this.userRole,
    });

    // After saving, treat the current org as the new "default"
    this.initialSelectedOrg = this.selectedOrg;
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
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const id = match?.[1];
    if (id) {
      window.open(`https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`);
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
    if (fileInput) {
      fileInput.click();
    } else {
      this.toaster.error('File input not available');
    }
  }

  getFileDetails(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0] ?? null;
    if (file) {
      this.userSelectedFile = file;
      this.templateService.templateFile = file;
      this.fileName = file.name;
    } else {
      this.userSelectedFile = null;
      this.fileName = '';
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
        this.toaster.error('Error uploading file1');
      }
    );
  }

  validateAndCreateSurvey() {
    if (!this.userSelectedFile) {
      this.toaster.error('No file selected');
      return;
    }
    if (!this.selectedTenant) {
      this.toaster.error('Tenant is not selected');
      return;
    }
    if (!this.selectedOrg) {
      this.toaster.error('Organization is not selected');
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
                this.templateService.surveyCreation(uploadResp.result.templatePath, this.selectedTenant, this.selectedOrg).subscribe(
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
        this.toaster.error('Error uploading file2');
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
