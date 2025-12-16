import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Capacitor } from '@capacitor/core';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'front-camera-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-screen-sm mx-auto p-4 space-y-4">
      <h1 class="text-xl sm:text-2xl font-semibold text-gray-100">📷 Cámara</h1>

      <div class="flex gap-2">
        <button
          class="px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
          (click)="takePhoto()"
          [disabled]="isTakingPhoto()"
        >
          {{ isTakingPhoto() ? 'Abriendo cámara…' : 'Abrir Cámara' }}
        </button>
      </div>

      <div class="mt-4" *ngIf="photoUrl() as url">
        <img
          [src]="url"
          alt="Foto capturada"
          class="w-full max-h-96 object-contain rounded-lg border border-gray-600"
        />
        <p class="text-gray-300 text-sm mt-2">Vista previa de la foto</p>
      </div>

      <p class="text-gray-400 text-sm">
        En web, se mostrará el selector de archivos como fallback si la cámara no está disponible.
      </p>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrontCameraPageComponent {
  isTakingPhoto = signal(false);
  photoUrl = signal<string | null>(null);

  private async ensurePermissions(): Promise<void> {
    try {
      const { Camera } = await import('@capacitor/camera');
      const perms = await Camera.checkPermissions();
      const camGranted = perms.camera === 'granted';
      const photosGranted = (perms as any).photos ? (perms as any).photos === 'granted' : true;

      if (!camGranted || !photosGranted) {
        await Camera.requestPermissions();
      }
    } catch {
      // Si falla el chequeo, se intentará solicitar permisos en la llamada de cámara
    }
  }

  async takePhoto(): Promise<void> {
    try {
      this.isTakingPhoto.set(true);
      await this.ensurePermissions();

      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

      const photo = await Camera.getPhoto({
        source: CameraSource.Camera,
        resultType: CameraResultType.Uri,
        quality: 80,
        saveToGallery: true,
        correctOrientation: true,
        allowEditing: false,
      });

      const url =
        photo.webPath ??
        (photo.path ? Capacitor.convertFileSrc(photo.path) : null);

      this.photoUrl.set(url ?? null);
      // eslint-disable-next-line no-console
      console.log('📷 Foto capturada:', {
        path: photo.path,
        webPath: photo.webPath,
        format: photo.format,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Error al abrir la cámara o tomar la foto:', error);
    } finally {
      this.isTakingPhoto.set(false);
    }
  }
}

export default FrontCameraPageComponent;