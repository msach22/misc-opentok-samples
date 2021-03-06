package com.tokbox.android.clicktocall.ui;

import android.app.Activity;
import android.support.v4.app.Fragment;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.support.annotation.Nullable;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.RelativeLayout;

import com.tokbox.android.clicktocall.CallActivity;
import com.tokbox.android.clicktocall.R;

public class PreviewControlFragment extends Fragment {

    private static final String LOGTAG = PreviewControlFragment.class.getSimpleName();

    private CallActivity mActivity;

    private RelativeLayout mContainer;
    View rootView;

    private ImageButton mAudioBtn;
    private ImageButton mVideoBtn;
    private ImageButton mCallBtn;

    private PreviewControlCallbacks mControlCallbacks = previewCallbacks;

    public interface PreviewControlCallbacks {

        public void onDisableLocalAudio(boolean audio);

        public void onDisableLocalVideo(boolean video);

        public void onCall();

    }

    private static PreviewControlCallbacks previewCallbacks = new PreviewControlCallbacks() {
        @Override
        public void onDisableLocalAudio(boolean audio) { }

        @Override
        public void onDisableLocalVideo(boolean video) { }

        @Override
        public void onCall() { }
    };

    private View.OnClickListener mBtnClickListener = new View.OnClickListener() {
        public void onClick(View v) {
            switch (v.getId()) {
                case R.id.localAudio:
                    updateLocalAudio();
                    break;

                case R.id.localVideo:
                    updateLocalVideo();
                    break;

                case R.id.call:
                    updateCall();
                    break;
            }
        }
    };

    @Override
    public void onAttach(Context context) {
        Log.i(LOGTAG, "OnAttach PreviewControlFragment");

        super.onAttach(context);

        this.mActivity = (CallActivity) context;
        this.mControlCallbacks = (PreviewControlCallbacks) context;
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onAttach(Activity activity) {
        super.onAttach(activity);

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {

            this.mActivity = (CallActivity) activity;
            this.mControlCallbacks = (PreviewControlCallbacks) activity;
        }
    }

    @Override
    public void onDetach() {
        Log.i(LOGTAG, "onDetach PreviewControlFragment");

        super.onDetach();

        mControlCallbacks = previewCallbacks;
    }

    @Nullable
    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        Log.i(LOGTAG, "OnCreate PreviewControlFragment");

        rootView = inflater.inflate(R.layout.preview_actionbar_fragment, container, false);

        mContainer = (RelativeLayout) this.mActivity.findViewById(R.id.actionbar_preview_fragment_container);
        mAudioBtn = (ImageButton) rootView.findViewById(R.id.localAudio);
        mVideoBtn = (ImageButton) rootView.findViewById(R.id.localVideo);
        mCallBtn = (ImageButton) rootView.findViewById(R.id.call);


        init();

        mCallBtn.setOnClickListener(mBtnClickListener);

        if ( mActivity.getComm() != null && mActivity.getComm().isStarted() ){
            setEnabled(true);
            updateMediaControls();
        }

        return rootView;

    }

    private void init() {

        mAudioBtn.setImageResource(R.drawable.mic_icon);

        mVideoBtn.setImageResource(R.drawable.video_icon);

        mCallBtn.setImageResource(R.drawable.start_call);

        mCallBtn.setBackgroundResource(R.drawable.initiate_call_button);
    }

    public void updateLocalAudio() {
        if ( mActivity.getComm() != null ) {
            if (!mActivity.getComm().getLocalAudio()) {
                mControlCallbacks.onDisableLocalAudio(true);
                mAudioBtn.setImageResource(R.drawable.mic_icon);
            } else {
                mControlCallbacks.onDisableLocalAudio(false);
                mAudioBtn.setImageResource(R.drawable.muted_mic_icon);
            }
        }
    }

    public void updateLocalVideo() {
        if ( mActivity.getComm() != null ){
            if (!mActivity.getComm().getLocalVideo()) {
                mControlCallbacks.onDisableLocalVideo(true);
                mVideoBtn.setImageResource(R.drawable.video_icon);
            } else {
                mControlCallbacks.onDisableLocalVideo(false);
                mVideoBtn.setImageResource(R.drawable.no_video_icon);
            }
        }
    }

    public void updateCall() {
        mControlCallbacks.onCall();
    }

    private void updateCallControls(boolean callStarted){
        mCallBtn.setImageResource(callStarted
                ? R.drawable.hang_up
                : R.drawable.start_call);

        mCallBtn.setBackgroundResource(callStarted
                ? R.drawable.end_call_button
                : R.drawable.initiate_call_button);
    }

    public void updateMediaControls(){
        mAudioBtn.setImageResource(mActivity.getComm().getLocalAudio()
                ? R.drawable.mic_icon
                : R.drawable.muted_mic_icon);

        mVideoBtn.setImageResource(mActivity.getComm().getLocalVideo()
                ? R.drawable.video_icon
                : R.drawable.no_video_icon);
    }

    public void setEnabled(boolean enabled) {
        if (mVideoBtn != null && mAudioBtn != null) {
            if (enabled) {
                mAudioBtn.setOnClickListener(mBtnClickListener);
                mVideoBtn.setOnClickListener(mBtnClickListener);
                updateCallControls(true);
            } else {
                mAudioBtn.setOnClickListener(null);
                mVideoBtn.setOnClickListener(null);
                mAudioBtn.setImageResource(R.drawable.mic_icon);
                mVideoBtn.setImageResource(R.drawable.video_icon);
            }
        }
    }

    public void restartFragment(boolean restart){
        if ( restart ) {
            setEnabled(false);
            mCallBtn.setBackgroundResource(R.drawable.initiate_call_button);
            mCallBtn.setImageResource(R.drawable.start_call);
        }
    }

}
