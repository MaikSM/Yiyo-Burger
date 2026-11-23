package com.restausync.app;

import android.os.Bundle;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Si el PC de caja cambió de IP o se desconectó mientras la tablet cargaba la URL remota,
        // volver automáticamente a la pantalla de conexión local para reconectar o buscar la nueva IP.
        if (this.bridge != null) {
            this.bridge.setWebViewClient(new BridgeWebViewClient(this.bridge) {
                @Override
                public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                    if (request != null && request.isForMainFrame()) {
                        String url = request.getUrl() != null ? request.getUrl().toString() : "";
                        if (!url.startsWith("http://localhost")) {
                            view.loadUrl("http://localhost/?cambiar=1");
                            return;
                        }
                    }
                    super.onReceivedError(view, request, error);
                }
            });
        }
    }
}
