package com.monster.collector;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;
import android.util.Log;

public class MainActivity extends BridgeActivity {
    private InstallReferrerClient referrerClient;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Inicializace Install Referreru
        referrerClient = InstallReferrerClient.newBuilder(this).build();
        referrerClient.startConnection(new InstallReferrerStateListener() {
            @Override
            public void onInstallReferrerSetupFinished(int responseCode) {
                switch (responseCode) {
                    case InstallReferrerClient.InstallReferrerResponse.OK:
                        try {
                            ReferrerDetails response = referrerClient.getInstallReferrer();
                            String referrerUrl = response.getInstallReferrer();
                            Log.d("Referrer", "Získaný referrer: " + referrerUrl);
                            
                            // Pošleme to do JavaScriptu, jakmile bude most připraven
                            if (referrerUrl != null && !referrerUrl.isEmpty()) {
                                getBridge().triggerWindowJSEvent("onInstallReferrer", "{ \"referrer\": \"" + referrerUrl + "\" }");
                            }
                            referrerClient.endConnection();
                        } catch (Exception e) {
                            Log.e("Referrer", "Chyba při čtení referreru", e);
                        }
                        break;
                    case InstallReferrerClient.InstallReferrerResponse.FEATURE_NOT_SUPPORTED:
                        Log.w("Referrer", "Install Referrer není podporován na tomto zařízení");
                        break;
                    case InstallReferrerClient.InstallReferrerResponse.SERVICE_UNAVAILABLE:
                        Log.w("Referrer", "Služba Google Play není dostupná");
                        break;
                }
            }

            @Override
            public void onInstallReferrerServiceDisconnected() {
                // Pokus o znovupřipojení v reálné aplikaci není nutný, zkusí se to příště
            }
        });
    }
}
