package com.tokbox.android.clicktocall;

import android.app.Application;

import com.instabug.library.IBGColorTheme;
import com.instabug.library.IBGInvocationEvent;
import com.instabug.library.Instabug;
import com.tokbox.android.clicktocall.config.OpenTokConfig;

import java.util.Locale;


public class ClickToCallApplication extends Application {

    @Override
    public void onCreate() {
        super.onCreate();

        //Init Instabug report
        new Instabug.Builder(this, OpenTokConfig.INSTABUG_API_KEY)
                .setDebugEnabled(true)
                .setEmailFieldRequired(true)
                .setColorTheme(IBGColorTheme.IBGColorThemeDark)
                .setShouldShowIntroDialog(false)
                .setInvocationEvent(IBGInvocationEvent.IBGInvocationEventShake)
                .setLocale(Locale.US)
                .build();
    }


}
