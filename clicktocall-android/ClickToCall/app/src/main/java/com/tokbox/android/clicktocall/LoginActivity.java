package com.tokbox.android.clicktocall;

import android.Manifest;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.Camera;
import android.hardware.camera2.CameraCharacteristics;
import android.os.Build;
import android.os.Bundle;
import android.support.v4.content.ContextCompat;
import android.support.v7.app.AlertDialog;
import android.support.v7.app.AppCompatActivity;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import com.crashlytics.android.Crashlytics;
import com.tokbox.android.clicktocall.config.OpenTokConfig;
import com.tokbox.android.clicktocall.utils.Controller;
import com.tokbox.android.logging.OTKAnalytics;
import com.tokbox.android.logging.OTKAnalyticsData;

import java.security.Permission;
import java.util.UUID;

import io.fabric.sdk.android.Fabric;


public class LoginActivity extends AppCompatActivity implements Controller.ControllerListener {

    private final String LOGTAG = LoginActivity.class.getSimpleName();

    private final String[] permissions = {Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA};
    private final int permsRequestCode = 200;

    private Controller mController;
    private ProgressBar mProgressBar;
    private EditText mWidgetIdEditText;
    private Button mConnectBtn;

    private String mWidgetId = null;

    private OTKAnalyticsData mAnalyticsData;
    private OTKAnalytics mAnalytics;

    private boolean mVideoEnabled = false;
    private int mCameraByDefault; //0

    private boolean mAudioPermission = false;
    private boolean mVideoPermission = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        Log.i(LOGTAG, "onCreate");
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        super.onCreate(savedInstanceState);

        Fabric fabric = new Fabric.Builder(this)
                .kits(new Crashlytics())
                .debuggable(true)
                .build();
        Fabric.with(fabric);

        //Init the analytics logging for internal use
        String source = this.getPackageName();

        SharedPreferences prefs = this.getSharedPreferences("opentok", Context.MODE_PRIVATE);
        String guidVSol = prefs.getString("guidVSol", null);
        if (null == guidVSol) {
            guidVSol = UUID.randomUUID().toString();
            prefs.edit().putString("guidVSol", guidVSol).commit();
        }

        //init camera
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            mCameraByDefault = CameraCharacteristics.LENS_FACING_FRONT;
        }
        else {
            mCameraByDefault = Camera.CameraInfo.CAMERA_FACING_FRONT;
        }

        mAnalyticsData = new OTKAnalyticsData.Builder(OpenTokConfig.LOG_CLIENT_VERSION, source, OpenTokConfig.LOG_COMPONENTID, guidVSol).build();
        mAnalytics = new OTKAnalytics(mAnalyticsData);

        addLogEvent(OpenTokConfig.LOG_ACTION_INITIALIZE, OpenTokConfig.LOG_VARIATION_ATTEMPT);

        //check shared preferences
        if ( getIntent() == null || getIntent().getExtras() == null || !getIntent().getBooleanExtra(OpenTokConfig.ARG_SHOW_WIDGET_ID_TRUE, false)){
            restoreWidgetData();
        }

        if ( mWidgetId != null && !mWidgetId.isEmpty() ) {
            //Not first time --> call screen
            enterCall();
        }
        else {
            //first time --> login screen
            setContentView(R.layout.activity_login);
            mConnectBtn = (Button) findViewById(R.id.button_connect);
            mWidgetIdEditText = (EditText) findViewById(R.id.input_clicktocall_id);
            mProgressBar = (ProgressBar) findViewById(R.id.login_progress);

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

            if ( getIntent() != null && getIntent().getExtras() != null ){
                mWidgetIdEditText.setText(getIntent().getStringExtra(OpenTokConfig.ARG_WIDGET_ID));
                mWidgetIdEditText.setSelection(mWidgetIdEditText.getText().length());
            }


            //request Marshmallow camera permission
            if (ContextCompat.checkSelfPermission(this,permissions[1]) != PackageManager.PERMISSION_GRANTED || ContextCompat.checkSelfPermission(this,permissions[0]) != PackageManager.PERMISSION_GRANTED){
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    requestPermissions(permissions, permsRequestCode);
                }
            }
            else {
                mVideoPermission = true;
                mAudioPermission = true;
            }
        }

        addLogEvent(OpenTokConfig.LOG_ACTION_INITIALIZE, OpenTokConfig.LOG_VARIATION_SUCCESS);

    }

    @Override
    public void onRequestPermissionsResult(final int permsRequestCode, final String[] permissions,
                                           int[] grantResults) {
        switch (permsRequestCode) {

            case 200:
                mVideoPermission = grantResults[0] == PackageManager.PERMISSION_GRANTED;
                mAudioPermission = grantResults[1] == PackageManager.PERMISSION_GRANTED;


                if ( !mVideoPermission || !mAudioPermission ){
                    final AlertDialog.Builder builder = new AlertDialog.Builder(LoginActivity.this);
                    builder.setTitle(getResources().getString(R.string.permissions_denied_title));
                    builder.setMessage(getResources().getString(R.string.alert_permissions_denied));
                    builder.setPositiveButton("I'M SURE", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            dialog.dismiss();
                        }
                    });
                    builder.setNegativeButton("RE-TRY", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            dialog.dismiss();
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                requestPermissions(permissions, permsRequestCode);
                            }
                        }
                    });
                    builder.show();
                }

                break;
        }
    }

    public void connect(View v) {
        mWidgetId = mWidgetIdEditText.getText().toString();

        addLogEvent(OpenTokConfig.LOG_ACTION_CONNECT, OpenTokConfig.LOG_VARIATION_ATTEMPT);
        if ( Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && (!mVideoPermission || !mAudioPermission) ){
            getToast(R.layout.toast, getResources().getString(R.string.permissions_denied), Gravity.BOTTOM, Toast.LENGTH_LONG, 0, 140).show();
        }
        else {
            //Check ID
            if ( mWidgetId != null && !mWidgetId.isEmpty()) {
                mController = new Controller(this, this);
                mController.checkWidgetId(mWidgetId);
                showSpinning(true);
            }
            else {
                Log.i(LOGTAG, "Widget Id cannot be null or empty");
                addLogEvent(OpenTokConfig.LOG_ACTION_CONNECT, OpenTokConfig.LOG_VARIATION_ERROR);
            }
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
        enterCallIntent.putExtra(OpenTokConfig.ARG_VIDEO_ENABLED, mVideoEnabled);
        enterCallIntent.putExtra(OpenTokConfig.ARG_CAMERA_BY_DEFAULT, mCameraByDefault);
        startActivity(enterCallIntent);
    }

    private void showSpinning(boolean show){
        if ( show ) {
            mConnectBtn.setVisibility(View.GONE);
            mWidgetIdEditText.setVisibility(View.GONE);
            mProgressBar.setVisibility(View.VISIBLE);
        }
        else {
            mConnectBtn.setVisibility(View.VISIBLE);
            mWidgetIdEditText.setVisibility(View.VISIBLE);
            mProgressBar.setVisibility(View.GONE);

        }
    }

    private void addLogEvent(String action, String variation){
        if ( mAnalytics!= null ) {
            mAnalytics.logEvent(action, variation);
        }
    }

    private Toast getToast(int layout, String toastText, int gravity, int duration, int xOffset,
                           int yOffset) {
        LayoutInflater inflater = getLayoutInflater();
        View toastLayout =
                inflater.inflate(layout, (ViewGroup) findViewById(R.id.toast_layout_root));
        TextView text = (TextView) toastLayout.findViewById(R.id.toast_text);
        text.setText(toastText);

        Toast returnedValue = new Toast(getApplicationContext());
        if (gravity != 0) {
            returnedValue.setGravity(gravity, xOffset, yOffset);
        }
        returnedValue.setDuration(duration);
        returnedValue.setView(toastLayout);
        return returnedValue;
    }

    //Controller callbacks
    @Override
    public void onCheckedData(boolean valid, boolean videoEnabled, int cameraByDefault) {
        Log.i(LOGTAG, "onCheckedData: ID is "+valid);
        showSpinning(false);

        if ( valid ){
            addLogEvent(OpenTokConfig.LOG_ACTION_CONNECT, OpenTokConfig.LOG_VARIATION_SUCCESS);
            mVideoEnabled = videoEnabled;
            mCameraByDefault = cameraByDefault;
            saveWidgetData();
            enterCall();
        }
        else {
            addLogEvent(OpenTokConfig.LOG_ACTION_CONNECT, OpenTokConfig.LOG_VARIATION_ERROR);
            getToast(R.layout.toast, getResources().getString(R.string.alert_invalid_id), Gravity.BOTTOM, Toast.LENGTH_LONG, 0, 140).show();
        }
    }

    @Override
    public void onFetchedData(String sessionId, String token, String apiKey) {
        Log.i(LOGTAG, "onFetchedData");
    }

    @Override
    public void onControllerError(String error) {
        Log.i(LOGTAG, "onControllerError: " + error);

        showSpinning(false);
    }

}