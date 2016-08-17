package com.tokbox.android.clicktocall;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.Toast;

import com.tokbox.android.clicktocall.config.OpenTokConfig;
import com.tokbox.android.clicktocall.utils.Controller;
import com.tokbox.android.logging.OTKAnalytics;
import com.tokbox.android.logging.OTKAnalyticsData;

import java.util.UUID;

/**
 * Created by mserrano on 17/08/16.
 */
public class LoginActivity extends AppCompatActivity implements Controller.ControllerListener {

    private final String LOGTAG = LoginActivity.class.getSimpleName();

    private final String[] permissions = {Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA};
    private final int permsRequestCode = 200;

    private Controller mController;
    private View mProgressView;
    private EditText mWidgetIdEditText;
    private Button mConnectBtn;

    private String mWidgetId = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        Log.i(LOGTAG, "onCreate");
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        super.onCreate(savedInstanceState);

        restoreWidgetData();
        if ( mWidgetId != null && !mWidgetId.isEmpty() ) {
            //NO first time
            enterCall();
        }
        else {
            setContentView(R.layout.activity_login);
            mConnectBtn = (Button) findViewById(R.id.button_connect);
            mWidgetIdEditText = (EditText) findViewById(R.id.input_clicktocall_id);
            mProgressView = (ProgressBar) findViewById(R.id.login_progress);

            mWidgetIdEditText.addTextChangedListener(new TextWatcher() {
                @Override
                public void beforeTextChanged(CharSequence s, int start, int count, int after) {

                }

                @Override
                public void onTextChanged(CharSequence s, int start, int before, int count) {
                    if(s.toString() != null && s.length()>0 ){
                        mConnectBtn.setBackground(getResources().getDrawable(R.drawable.button_default));
                    }
                    else {
                        mConnectBtn.setBackground(getResources().getDrawable(R.drawable.button_disabled));
                    }
                }

                @Override
                public void afterTextChanged(Editable s) {

                }
            });

            //request Marshmallow camera permission
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                requestPermissions(permissions, permsRequestCode);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int permsRequestCode, String[] permissions,
                                           int[] grantResults) {
        switch (permsRequestCode) {

            case 200:
                boolean video = grantResults[0] == PackageManager.PERMISSION_GRANTED;
                boolean audio = grantResults[1] == PackageManager.PERMISSION_GRANTED;
                break;
        }
    }

    public void connect(View v) {
        Log.i(LOGTAG, "join room button clicked.");

        mWidgetId = mWidgetIdEditText.getText().toString();

        if ( mWidgetId != null && !mWidgetId.isEmpty()) {

            //check id
            mController = new Controller(this, this);
            mController.checkWidgetId(mWidgetId);
            showSpinning(true);

        }
        else {
            Log.i(LOGTAG, "Widget Id cannot be null or empty");
        }
    }

    private void saveWidgetData() {
        SharedPreferences settings = getApplicationContext()
                .getSharedPreferences(OpenTokConfig.LAST_WIDGET_DATA, 0);
        SharedPreferences.Editor editor = settings.edit();
        editor.putString("widgetId", mWidgetId);

        editor.apply();
    }

    private void restoreWidgetData() {
        SharedPreferences settings = getApplicationContext()
                .getSharedPreferences(OpenTokConfig.LAST_WIDGET_DATA, 0);
        mWidgetId = settings.getString("widgetId", "");
    }

    private void enterCall(){
        Intent enterCallIntent = new Intent(this, CallActivity.class);
        enterCallIntent.putExtra(OpenTokConfig.ARG_WIDGET_ID, mWidgetId);

        startActivity(enterCallIntent);
    }
    @Override
    public void onWidgetIdChecked(Boolean valid) {
        Log.i(LOGTAG, "onWidgetIdChecked is valid"+valid);
        showSpinning(false);

        if (valid){
            saveWidgetData();
            enterCall();
        }
        else {
            Toast.makeText(getApplicationContext(),
                    "The ClickToCall ID is not valid", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    public void onWidgetIdCredentials(String sessionId, String token, String apiKey) {

    }

    private void showSpinning(boolean show){
        if ( show ) {
            mConnectBtn.setVisibility(View.GONE);
            mWidgetIdEditText.setVisibility(View.GONE);
            mProgressView.setVisibility(View.VISIBLE);
        }
        else {
            mConnectBtn.setVisibility(View.VISIBLE);
            mWidgetIdEditText.setVisibility(View.VISIBLE);
            mProgressView.setVisibility(View.GONE);

        }
    }
}
