package com.vwelfare.app;

import android.os.Bundle;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // PHI protection: block screenshots/screen recording and hide the app's
        // content in the recent-apps switcher. This is a deliberate default for a
        // healthcare app; remove FLAG_SECURE if users must be able to screenshot.
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );
    }
}
