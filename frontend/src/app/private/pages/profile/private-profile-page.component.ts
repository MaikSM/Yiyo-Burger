import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@auth/services/auth.service';
import { toast } from 'ngx-sonner';
import { iUser } from '@auth/interfaces';

// Custom validator to check if passwords match
export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (
    password &&
    confirmPassword &&
    password.value &&
    confirmPassword.value &&
    password.value !== confirmPassword.value
  ) {
    return { passwordMismatch: true };
  }
  return null;
};

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'private-profile-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './private-profile-page.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivateProfilePageComponent implements OnInit {
  private _authService: AuthService = inject(AuthService);
  private _cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private _router = inject(Router);
  private _formBuilder = inject(FormBuilder);

  currentUser = computed(() => this._authService.user());

  hasError = signal<boolean>(false);
  isPosting = signal<boolean>(false);
  photoPreview = signal<string | null>(null);
  selectedFile = signal<File | null>(null);
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);
  showCurrentPassword = signal<boolean>(false);

  profileForm: FormGroup = this._formBuilder.group(
    {
      name: [
        '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(50)],
      ],
      surname: [
        '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(50)],
      ],
      email: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
        ],
      ],
      currentPassword: [''],
      password: ['', [Validators.minLength(8)]],
      confirmPassword: [''],
    },
    { validators: passwordMatchValidator }
  );

  ngOnInit(): void {
    // 1. Cargamos datos desde el usuario existente en authService
    const existingUser = this._authService.user();
    if (existingUser) {
      this.profileForm.patchValue({
        name: existingUser.name || '',
        surname: existingUser.surname || '',
        email: existingUser.email || '',
      });
      if (existingUser.photo) {
        this.photoPreview.set(existingUser.photo);
      }
    }

    // 2. Consultar el estado más reciente sin bloquear la creación de vista
    this._authService.checkAuthStatus().subscribe({
      next: () => {
        const user = this._authService.user();
        if (user) {
          this.profileForm.patchValue({
            name: user.name || '',
            surname: user.surname || '',
            email: user.email || '',
          });
          if (user.photo) {
            this.photoPreview.set(user.photo);
          }
        }
      },
      error: (err) => console.error('Error al cargar usuario:', err),
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  toggleCurrentPasswordVisibility(): void {
    this.showCurrentPassword.update((v) => !v);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Error', {
          duration: 3000,
          description: 'Por favor selecciona un archivo de imagen válido',
        });
        return;
      }

      // Validate file size (max 10MB before compression)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Error', {
          duration: 3000,
          description: 'La imagen no debe superar los 10MB',
        });
        return;
      }

      // Compress and resize image
      this.compressImage(file);
    }
  }

  private compressImage(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for compression
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Calculate new dimensions (max 800x800)
        const maxSize = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to base64 with compression (0.7 quality)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);

        // Check final size (should be under ~500KB after compression)
        const sizeInBytes = compressedDataUrl.length * (3 / 4);
        if (sizeInBytes > 500 * 1024) {
          // Further compress if still too large
          const furtherCompressed = canvas.toDataURL('image/jpeg', 0.5);
          this.photoPreview.set(furtherCompressed);
        } else {
          this.photoPreview.set(compressedDataUrl);
        }

        this.selectedFile.set(file);
        toast.success('Imagen cargada', {
          duration: 2000,
          description: 'La imagen se ha optimizado correctamente',
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  removePhoto(): void {
    this.photoPreview.set(null);
    this.selectedFile.set(null);
  }

  getInitials(): string {
    const user = this.currentUser();
    if (!user) return '?';
    const firstName = user.name?.charAt(0) || '';
    const lastName = user.surname?.charAt(0) || '';
    return (firstName + lastName).toUpperCase() || '?';
  }

  passwordsMatch(): boolean {
    const password = this.profileForm.get('password')?.value;
    const confirmPassword = this.profileForm.get('confirmPassword')?.value;
    return !password || password === confirmPassword;
  }

  onSubmit(): void {
    // Check password match manually for better UX
    if (!this.passwordsMatch()) {
      toast.error('Error', {
        duration: 3000,
        description: 'Las contraseñas no coinciden',
      });
      return;
    }

    if (this.profileForm.invalid) {
      toast.error('Error', {
        duration: 3000,
        description: 'Por favor completa todos los campos requeridos correctamente',
      });
      return;
    }

    const data: iUser = {
      name: this.profileForm.controls['name'].value,
      surname: this.profileForm.controls['surname'].value,
      email: this.profileForm.controls['email'].value,
      role_id: this.currentUser()?.role_id,
      created_at: this.currentUser()?.created_at,
    };

    // Only include password if it was changed
    const password = this.profileForm.controls['password'].value;
    const currentPassword = this.profileForm.controls['currentPassword'].value;
    
    if (password && password.length >= 8) {
      // Require current password to change password
      if (!currentPassword) {
        toast.error('Error', {
          duration: 3000,
          description: 'Ingresa tu contraseña actual para cambiar la contraseña',
        });
        this.isPosting.set(false);
        return;
      }
      (data as any).currentPassword = currentPassword;
      data.password = password;
    }

    // Include photo if changed
    if (this.photoPreview()) {
      console.log('📤 Enviando foto al servidor:', this.photoPreview()?.substring(0, 50) + '...');
      data.photo = this.photoPreview()!;
    }

    this.isPosting.set(true);

    this._authService.updateProfile(data).subscribe({
      next: (isAuthenticated) => {
        if (isAuthenticated) {
          toast.success('¡Perfil Actualizado!', {
            duration: 3000,
            description: 'Tus datos se han guardado correctamente',
          });
          this._router.navigateByUrl('/');
        } else {
          toast.error('Error', {
            duration: 3000,
            description: 'No se pudo actualizar el perfil',
          });
        }
        this.isPosting.set(false);
      },
      error: (error) => {
        console.error(error);
        toast.error('Error', {
          duration: 3000,
          description: 'Ocurrió un error al actualizar el perfil',
        });
        this.isPosting.set(false);
      },
    });
  }
}

export default PrivateProfilePageComponent;
