package com.tokbox.android.clicktocall;

import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.hardware.Camera;
import android.hardware.camera2.CameraCharacteristics;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.support.v4.app.FragmentTransaction;
import android.support.v7.app.AppCompatActivity;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.RelativeLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.instabug.library.Instabug;
import com.tokbox.android.accpack.OneToOneCommunication;
import com.tokbox.android.clicktocall.config.OpenTokConfig;
import com.tokbox.android.clicktocall.ui.PreviewCameraFragment;
import com.tokbox.android.clicktocall.ui.PreviewControlFragment;
import com.tokbox.android.clicktocall.ui.RemoteControlFragment;
import com.tokbox.android.clicktocall.utils.Controller;
import com.tokbox.android.logging.OTKAnalytics;
import com.tokbox.android.logging.OTKAnalyticsData;

import java.util.UUID;

public class CallActivity extends AppCompatActivity implements Controller.ControllerListener, OneToOneCommunication.Listener, PreviewControlFragment.PreviewControlCallbacks, RemoteControlFragment.RemoteControlCallbacks, PreviewCameraFragment.PreviewCameraCallbacks {

    private final String LOGTAG = CallActivity.class.getSimpleName();

    private OneToOneCommunication mComm;

    private RelativeLayout mPreviewViewContainer;
    private RelativeLayout mRemoteViewContainer;
    private RelativeLayout mAudioOnlyView;
    private RelativeLayout mLocalAudioOnlyView;
    private RelativeLayout.LayoutParams layoutParamsPreview;
    private TextView mAlert;
    private ImageView mAudioOnlyImage;
    private ProgressBar mProgressBar;
    private Toast mCallInfoToast;
    private CountDownTimer mWaitingAgentTimer;
    private CountDownTimer mCallTimer;

    private PreviewControlFragment mPreviewFragment;
    private RemoteControlFragment mRemoteFragment;
    private PreviewCameraFragment mCameraFragment;
    private FragmentTransaction mFragmentTransaction;

    private OTKAnalyticsData mAnalyticsData;
    private OTKAnalytics mAnalytics;

    private Controller mController;
    private String mWidgetId;

    private MenuItem changeIdItem;

    private boolean mVideoEnabled = false;
    private boolean mCallStarted = false;

    private int mCameraByDefault;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        Log.i(LOGTAG, "onCreate");

        requestWindowFeature(Window.FEATURE_ACTION_BAR);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);

        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_call);

        //Init the analytics logging for internal use
        String source = this.getPackageName();

        SharedPreferences prefs = this.getSharedPreferences("opentok", Context.MODE_PRIVATE);
        String guidVSol = prefs.getString("guidVSol", null);
        if (null == guidVSol) {
            guidVSol = UUID.randomUUID().toString();
            prefs.edit().putString("guidVSol", guidVSol).commit();
        }

        mAnalyticsData = new OTKAnalyticsData.Builder(OpenTokConfig.LOG_CLIENT_VERSION, source, OpenTokConfig.LOG_COMPONENTID, guidVSol).build();
        mAnalytics = new OTKAnalytics(mAnalyticsData);

        addLogEvent(OpenTokConfig.LOG_ACTION_LOAD_CALL, OpenTokConfig.LOG_VARIATION_ATTEMPT);

        //init camera
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            mCameraByDefault = CameraCharacteristics.LENS_FACING_FRONT;
        }
        else {
            mCameraByDefault = Camera.CameraInfo.CAMERA_FACING_FRONT;
        }

        Uri url = getIntent().getData();
        if (url == null) {
            mWidgetId = getIntent().getStringExtra(OpenTokConfig.ARG_WIDGET_ID);
            mVideoEnabled = getIntent().getBooleanExtra(OpenTokConfig.ARG_VIDEO_ENABLED, false);
            mCameraByDefault = getIntent().getIntExtra(OpenTokConfig.ARG_CAMERA_BY_DEFAULT, 0);
        }

        mPreviewViewContainer = (RelativeLayout) findViewById(R.id.publisherview);
        mRemoteViewContainer = (RelativeLayout) findViewById(R.id.subscriberview);
        mAlert = (TextView) findViewById(R.id.quality_warning);
        mAudioOnlyView = (RelativeLayout) findViewById(R.id.audioOnlyView);
        mLocalAudioOnlyView = (RelativeLayout) findViewById(R.id.localAudioOnlyView);
        mProgressBar = (ProgressBar) findViewById(R.id.call_progress);

        //init controls fragments
        if (savedInstanceState == null) {
            mFragmentTransaction = getSupportFragmentManager().beginTransaction();
            initCameraFragment(); //to swap camera
            initPreviewFragment(); //to enable/disable local media
            initRemoteFragment(); //to enable/disable remote media
            mFragmentTransaction.commitAllowingStateLoss();
        }

        showCallInfo(getResources().getString(R.string.call_message), false);

        addLogEvent(OpenTokConfig.LOG_ACTION_LOAD_CALL, OpenTokConfig.LOG_VARIATION_SUCCESS);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        Log.i(LOGTAG, "onConfigurationChanged");
        super.onConfigurationChanged(newConfig);

        if (mCameraFragment != null) {
            getSupportFragmentManager().beginTransaction()
                    .remove(mCameraFragment).commit();
            initCameraFragment();
        }

        if (mPreviewFragment != null) {
            getSupportFragmentManager().beginTransaction()
                    .remove(mPreviewFragment).commit();
            initPreviewFragment();
        }

        if (mRemoteFragment != null) {
            getSupportFragmentManager().beginTransaction()
                    .remove(mRemoteFragment).commit();
            initRemoteFragment();
        }

        if (mComm != null) {
            mComm.reloadViews(); //reload the local preview and the remote views
            mPreviewFragment.setEnabled(true);
        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.settings_menu, menu);
        changeIdItem = menu.getItem(0);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        //Cancel the call alert
        restartCallAlert(false);

        // Handle item selection
        switch (item.getItemId()) {
            case R.id.change_id:
                changeId();
                return true;
            case R.id.send_feedback:
                sendFeedback();
                return true;
            default:
                return super.onOptionsItemSelected(item);
        }
    }

    @Override
    public void onOptionsMenuClosed(Menu menu) {
        //Restart the call alert
        restartCallAlert(true);
    }

    @Override
    public void onBackPressed() {
        //Cancel the call alert
        restartCallAlert(false);

        if (mComm != null && mComm.isStarted()) {
            onCall(); //end call
        }
        changeId();
    }

    @Override
    public void onPause() {
        super.onPause();

        if (mComm != null && mComm.isStarted()) {
            mComm.getSession().onPause();

            if (mComm.isRemote()) {
                mRemoteViewContainer.removeAllViews();
            }
        }

        restartCallAlert(false);
    }

    @Override
    public void onResume() {
        super.onResume();

        if (mComm != null && mComm.isStarted()) {
            mComm.getSession().onResume();

            mComm.reloadViews();
        }

        restartCallAlert(true);
    }

    public OneToOneCommunication getComm() {
        return mComm;
    }

    private void initPreviewFragment() {
        mPreviewFragment = new PreviewControlFragment();
        getSupportFragmentManager().beginTransaction()
                .add(R.id.actionbar_preview_fragment_container, mPreviewFragment).commit();
    }

    private void initRemoteFragment() {
        mRemoteFragment = new RemoteControlFragment();
        getSupportFragmentManager().beginTransaction()
                .add(R.id.actionbar_remote_fragment_container, mRemoteFragment).commit();
    }

    private void initCameraFragment() {
        mCameraFragment = new PreviewCameraFragment();
        getSupportFragmentManager().beginTransaction()
                .add(R.id.camera_preview_fragment_container, mCameraFragment).commit();
    }

    private void restartCallAlert(boolean restart) {
        if (restart) {
            if (mComm != null && !mComm.isStarted()) {
                showCallInfo(getResources().getString(R.string.call_message), false);
            } else {
                if (mComm != null && !mComm.isRemote()) {
                    showCallInfo(getResources().getString(R.string.waiting_for_agent_message), true);
                }
            }
        } else {
            if (mWaitingAgentTimer != null) {
                mWaitingAgentTimer.cancel();
            }
        }
    }

    private void showCallInfo(String message, boolean repeat) {
        mCallInfoToast = Toast.makeText(CallActivity.this, message,
                Toast.LENGTH_LONG);

        mCallInfoToast.show();

        if (repeat) {
            mWaitingAgentTimer = new CountDownTimer(60000, 15000) {
                @Override
                public void onTick(long millisUntilFinished) {
                    mCallInfoToast.show();
                }

                @Override
                public void onFinish() {
                    mCallInfoToast.cancel();
                }
            }.start();

        }
    }
    private void cleanInfo(){
        //clean info animation
        if ( mCallInfoToast != null ) {
            mCallInfoToast.cancel();
        }
        if ( mCallTimer != null ) {
            mCallTimer.cancel();
        }
        if ( mWaitingAgentTimer != null ){
            mWaitingAgentTimer.cancel();
        }
    }

    private void changeId() {
        addLogEvent(OpenTokConfig.LOG_ACTION_CHANGE_ID, OpenTokConfig.LOG_VARIATION_ATTEMPT);

        Intent enterLoginIntent = new Intent(this, LoginActivity.class);
        enterLoginIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        enterLoginIntent.putExtra(OpenTokConfig.ARG_WIDGET_ID, mWidgetId);
        enterLoginIntent.putExtra(OpenTokConfig.ARG_SHOW_WIDGET_ID_TRUE, true);

        startActivity(enterLoginIntent);

        addLogEvent(OpenTokConfig.LOG_ACTION_CHANGE_ID, OpenTokConfig.LOG_VARIATION_SUCCESS);

    }
    private void sendFeedback() {
        addLogEvent(OpenTokConfig.LOG_ACTION_HELP_FEEDBACK, OpenTokConfig.LOG_VARIATION_ATTEMPT);
        //clean show info
        restartCallAlert(false);
        Instabug.invoke();
        addLogEvent(OpenTokConfig.LOG_ACTION_HELP_FEEDBACK, OpenTokConfig.LOG_VARIATION_SUCCESS);
    }

    private void startCallTimer() {
        mCallTimer = new CountDownTimer(60000, 1000) {
            @Override
            public void onTick(long millisUntilFinished) {
            }

            @Override
            public void onFinish() {
                restartCallAlert(false);
                Toast infoToast = Toast.makeText(CallActivity.this, getResources().getString(R.string.agents_busy),
                        Toast.LENGTH_LONG);
                infoToast.show();
                onCall();
            }
        }.start();
    }

    private void addLogEvent(String action, String variation) {
        if (mAnalytics != null) {
            mAnalytics.logEvent(action, variation);
        }
    }

    //Local control callbacks
    @Override
    public void onDisableLocalAudio(boolean audio) {
        if (mComm != null) {
            mComm.enableLocalMedia(OneToOneCommunication.MediaType.AUDIO, audio);
        }
    }

    @Override
    public void onDisableLocalVideo(boolean video) {
        if (mComm != null) {
            if (video  && mComm.getCameraId() != mCameraByDefault )
            {
                mComm.swapCamera();
            }
            if (mComm.isRemote()) {
                if (!video) {
                    mAudioOnlyImage = new ImageView(this);
                    mAudioOnlyImage.setImageResource(R.drawable.avatar);
                    mAudioOnlyImage.setBackgroundResource(R.drawable.bckg_audio_only);
                    mPreviewViewContainer.addView(mAudioOnlyImage, layoutParamsPreview);
                } else {
                    mPreviewViewContainer.removeView(mAudioOnlyImage);
                    restartViews();
                }
            } else {
                if (!video) {
                    mLocalAudioOnlyView.setVisibility(View.VISIBLE);
                    mPreviewViewContainer.addView(mLocalAudioOnlyView);
                } else {
                    mLocalAudioOnlyView.setVisibility(View.GONE);
                    mPreviewViewContainer.removeView(mLocalAudioOnlyView);
                }
            }
            mComm.enableLocalMedia(OneToOneCommunication.MediaType.VIDEO, video);
        }
    }

    @Override
    public void onCall() {
        if (mComm != null && mComm.isStarted()) {
            addLogEvent(OpenTokConfig.LOG_ACTION_END_COMM, OpenTokConfig.LOG_VARIATION_ATTEMPT);
            mComm.end();
            cleanViewsAndControls();
            addLogEvent(OpenTokConfig.LOG_ACTION_END_COMM, OpenTokConfig.LOG_VARIATION_SUCCESS);
        } else {
            addLogEvent(OpenTokConfig.LOG_ACTION_START_COMM, OpenTokConfig.LOG_VARIATION_ATTEMPT);
            mCallInfoToast.cancel();
            mProgressBar.setVisibility(View.VISIBLE);
            //get credentials
            mController = new Controller(this, this);
            mController.getCredentials(mWidgetId);
        }
    }

    //Remote control callbacks
    @Override
    public void onDisableRemoteAudio(boolean audio) {
        if (mComm != null) {
            mComm.enableRemoteMedia(OneToOneCommunication.MediaType.AUDIO, audio);
        }
    }

    @Override
    public void onDisableRemoteVideo(boolean video) {
        if (mComm != null) {
            mComm.enableRemoteMedia(OneToOneCommunication.MediaType.VIDEO, video);
        }
    }

    public void showRemoteControlBar(View v) {
        if (mRemoteFragment != null && mComm != null && mComm.isRemote()) {
            mRemoteFragment.show();
        }
    }

    //Camera control callback
    @Override
    public void onCameraSwap() {
        if (mComm != null) {
            mComm.swapCamera();
        }
    }

    //cleans views and controls
    private void cleanViewsAndControls() {
        //enable changeID option
        changeIdItem.setEnabled(true);
        restartCallAlert(false);
        if (mCallTimer != null) {
            mCallTimer.cancel();
        }
        mPreviewFragment.restartFragment(true);
    }

    @Override
    public void onInitialized() {
        addLogEvent(OpenTokConfig.LOG_ACTION_START_COMM, OpenTokConfig.LOG_VARIATION_SUCCESS);
    }

    //OneToOneCommunication callbacks
    @Override
    public void onError(String error) {
        if (mComm != null) {
            mComm.end(); //end communication
        }

        new AlertDialog.Builder(this).
                setTitle(getResources().getString(R.string.alert_call_error)).
                setMessage(getResources().getString(R.string.alert_call_error_text)).
                setPositiveButton(getResources().getString(R.string.alert_button), null).
                setCancelable(false).create().show();

        cleanViewsAndControls(); //restart views
    }

    @Override
    public void onQualityWarning(boolean warning) {
        if (warning) { //quality warning
            mAlert.setBackgroundResource(R.color.quality_warning);
            mAlert.setTextColor(this.getResources().getColor(R.color.warning_text));
            mAlert.setTextColor(this.getResources().getColor(R.color.warning_text));
        } else { //quality alert
            mAlert.setBackgroundResource(R.color.quality_alert);
            mAlert.setTextColor(this.getResources().getColor(R.color.colorWhite));
        }
        mAlert.bringToFront();
        mAlert.setVisibility(View.VISIBLE);
        mAlert.postDelayed(new Runnable() {
            public void run() {
                mAlert.setVisibility(View.GONE);
            }
        }, 7000);
    }

    @Override
    public void onAudioOnly(boolean enabled) {
        if (enabled) {
            mAudioOnlyView.setVisibility(View.VISIBLE);
        } else {
            mAudioOnlyView.setVisibility(View.GONE);
        }
    }

    @Override
    public void onPreviewReady(View preview) {

        mPreviewViewContainer.removeAllViews();
        mProgressBar.setVisibility(View.GONE);

        if (preview != null) {
            layoutParamsPreview = new RelativeLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);

            if (mComm.isRemote()) {
                layoutParamsPreview.addRule(RelativeLayout.ALIGN_PARENT_BOTTOM,
                        RelativeLayout.TRUE);
                layoutParamsPreview.addRule(RelativeLayout.ALIGN_PARENT_RIGHT,
                        RelativeLayout.TRUE);
                layoutParamsPreview.width = (int) getResources().getDimension(R.dimen.preview_width);
                layoutParamsPreview.height = (int) getResources().getDimension(R.dimen.preview_height);
                layoutParamsPreview.rightMargin = (int) getResources().getDimension(R.dimen.preview_rightMargin);
                layoutParamsPreview.bottomMargin = (int) getResources().getDimension(R.dimen.preview_bottomMargin);
            }
            else{
                if ( !mCallStarted ) {
                    showCallInfo(getResources().getString(R.string.waiting_for_agent_message), true);
                }
            }
            mPreviewViewContainer.addView(preview, layoutParamsPreview);
            if (!mComm.getLocalVideo()) {
                onDisableLocalVideo(false);
            }
        }
        else {
           cleanInfo();
        }
    }

    @Override
    public void onRemoteViewReady(View remoteView) {
        //clean info animation
        cleanInfo();
        //update preview when a new participant joined to the communication
        if (mPreviewViewContainer.getChildCount() > 0) {
            onPreviewReady(mPreviewViewContainer.getChildAt(0)); //main preview view
        }
        if (!mComm.isRemote()) {
            //clear views
            onAudioOnly(false);
            mRemoteViewContainer.removeView(remoteView);
            mRemoteViewContainer.setClickable(false);
            mCallStarted = false;
        } else {

            //show remote view
            RelativeLayout.LayoutParams layoutParams = new RelativeLayout.LayoutParams(
                    this.getResources().getDisplayMetrics().widthPixels, this.getResources()
                    .getDisplayMetrics().heightPixels);
            mRemoteViewContainer.removeView(remoteView);
            mRemoteViewContainer.addView(remoteView, layoutParams);
            mRemoteViewContainer.setClickable(true);
            mCallStarted = true;
        }
    }

    private void restartViews(){
        if ( mRemoteViewContainer.getChildCount() > 0 ){
            //remove remote view
            View remoteView = mRemoteViewContainer.getChildAt(1);
            RelativeLayout.LayoutParams remoteParams = (RelativeLayout.LayoutParams) remoteView.getLayoutParams();
            mRemoteViewContainer.removeViewAt(1);

            //add remoteView again
            mRemoteViewContainer.addView(remoteView, remoteParams);
        }
    }

    //Controller callbacks
    @Override
    public void onCheckedData(boolean valid, boolean videoEnabled, int cameraByDefault) {
        Log.i(LOGTAG, "onCheckedData");
    }

    @Override
    public void onFetchedData(String sessionId, String token, String apiKey) {
        Log.i(LOGTAG, "onFetchedData. SessionId: " + sessionId + " .Token: " + token + " .ApiKey: " + apiKey);

        //update logging with credentials
        mAnalyticsData.setSessionId(sessionId);
        mAnalyticsData.setPartnerId(apiKey);

        //init 1to1 communication object
        mComm = new OneToOneCommunication(CallActivity.this, sessionId, token, apiKey);

        //set listener to receive the communication events, and add UI to these events
        mComm.setListener(this);

        //check video
        if (!this.mVideoEnabled) {
            mComm.enableLocalMedia(OneToOneCommunication.MediaType.VIDEO, false);
            mPreviewFragment.updateMediaControls();
        }

        //start call
        mComm.start();

        //disable changeID option
        changeIdItem.setEnabled(false);

        startCallTimer();

        if (mPreviewFragment != null) {
            mPreviewFragment.setEnabled(true);
        }
    }

    @Override
    public void onControllerError(String error) {
        Log.i(LOGTAG, "onControllerError: " + error);
        mProgressBar.setVisibility(View.GONE);
    }


    @Override
    public void onStart() {
        super.onStart();
    }

    @Override
    public void onStop() {
        super.onStop();
    }
}
