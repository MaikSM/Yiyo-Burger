import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ChatComponent } from '../../pages/chat/chat.component';
import {
  PrivateLayoutHeaderComponent,
  PrivateLayoutContentComponent,
  PrivateLayoutFooterComponent,
} from '@private/_layout/components';
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'private-layout',
  imports: [
    ChatComponent,
    PrivateLayoutHeaderComponent,
    PrivateLayoutContentComponent,
    PrivateLayoutFooterComponent,
  ],
  templateUrl: './private-layout.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivateLayoutComponent {
  showChatModal = signal(false);

  openChat() {
    this.showChatModal.set(true);
  }

  closeChat() {
    this.showChatModal.set(false);
  }
}
export default PrivateLayoutComponent;
