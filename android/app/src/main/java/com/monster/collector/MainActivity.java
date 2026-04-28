package com.monster.collector;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.content.SharedPreferences;
import com.getcapacitor.BridgeActivity;
import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;
import android.util.Log;

public class MainActivity extends BridgeActivity {
    private InstallReferrerClient referrerClient;
    private static final String TAG = "MonsterReferrer";
    private static final String PREFS_NAME = "monster_referrer_prefs";
    private static final String KEY_REFERRER = "install_referrer";
    private static final String KEY_DELIVERED = "referrer_delivered";

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
                            Log.d(TAG, "Získaný referrer: " + referrerUrl);
                            
                            if (referrerUrl != null && !referrerUrl.isEmpty()) {
                                // Uložíme do SharedPreferences pro případ, že bridge ještě není ready
                                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                                prefs.edit()
                                    .putString(KEY_REFERRER, referrerUrl)
                                    .putBoolean(KEY_DELIVERED, false)
                                    .apply();
                                
                                // Zkusíme odeslat ihned + s opakovanými pokusy
                                deliverReferrerToJS(referrerUrl, 0);
                            }
                            referrerClient.endConnection();
                        } catch (Exception e) {
                            Log.e(TAG, "Chyba při čtení referreru", e);
                        }
                        break;
                    case InstallReferrerClient.InstallReferrerResponse.FEATURE_NOT_SUPPORTED:
                        Log.w(TAG, "Install Referrer není podporován na tomto zařízení");
                        break;
                    case InstallReferrerClient.InstallReferrerResponse.SERVICE_UNAVAILABLE:
                        Log.w(TAG, "Služba Google Play není dostupná");
                        break;
                }
            }

            @Override
            public void onInstallReferrerServiceDisconnected() {
                // Pokus o znovupřipojení v reálné aplikaci není nutný, zkusí se to příště
            }
        });

        // Při každém spuštění zkontrolovat, jestli nemáme nedoručený referrer
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            String savedReferrer = prefs.getString(KEY_REFERRER, null);
            boolean delivered = prefs.getBoolean(KEY_DELIVERED, true);
            
            if (savedReferrer != null && !delivered) {
                Log.d(TAG, "Opakované doručení uloženého referreru: " + savedReferrer);
                deliverReferrerToJS(savedReferrer, 0);
            }
        }, 3000); // Počkáme 3s, aby se bridge stihl načíst
    }

    /**
     * Odešle referrer kód do JavaScriptu přes Capacitor bridge.
     * Opakuje pokus až 5x s rostoucím zpožděním pokud bridge není ready.
     */
    private void deliverReferrerToJS(String referrerUrl, int attempt) {
        if (attempt >= 5) {
            Log.w(TAG, "Bridge stále není ready po 5 pokusech. Referrer zůstane uložen v SharedPreferences.");
            return;
        }

        // Zpoždění: 0ms, 1s, 2s, 4s, 8s
        long delay = attempt == 0 ? 0 : (long) (1000 * Math.pow(2, attempt - 1));

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            try {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    String jsPayload = "{ \"referrer\": \"" + referrerUrl.replace("\"", "\\\"") + "\" }";
                    getBridge().triggerWindowJSEvent("onInstallReferrer", jsPayload);
                    Log.d(TAG, "Referrer úspěšně doručen do JS (pokus " + (attempt + 1) + ")");
                    
                    // Označit jako doručený
                    SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
                    prefs.edit().putBoolean(KEY_DELIVERED, true).apply();
                } else {
                    Log.d(TAG, "Bridge není ready, zkouším znovu (pokus " + (attempt + 1) + ")");
                    deliverReferrerToJS(referrerUrl, attempt + 1);
                }
            } catch (Exception e) {
                Log.e(TAG, "Chyba při odesílání referreru, zkouším znovu", e);
                deliverReferrerToJS(referrerUrl, attempt + 1);
            }
        }, delay);
    }
}
